import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../app/hooks';
import { setSession } from '../app/rootReducer';
import { authApi } from '../services/api/authApi';
import { tenantApi } from '../services/api/tenantApi';
import { deviceFingerprint, offlineLogin, openVault, rememberCashier } from '../db/vaultService';
import { AuthError, type Cashier, type RoleTab } from '../types/auth.types';
import type { TenantContext } from '../types/tenant.types';
import { BRANCH_ID, ERR, LANDING, TERMINAL_ID } from '../utils/constants';
import { clearFailures, getLock, registerFailure, validTenantCode } from '../utils/validators';

const apiErr = (e: unknown) => e as { status?: number | string; data?: { code?: string; user?: string } };
const isNetwork = (e: unknown) => ['FETCH_ERROR', 'TIMEOUT_ERROR', 504].includes(apiErr(e).status as never);

const subdomain = () => {
  const p = location.hostname.split('.'); // FR-1.1: store.volta.pk
  return p.length >= 3 && p.slice(-2).join('.') === 'volta.pk' ? p[0] : '';
};

export function useAuth(online: boolean) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [tenantCode, setTenantCode] = useState(subdomain());
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [tenantStatus, setTenantStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [tenantError, setTenantError] = useState('');
  const [vaultCashiers, setVaultCashiers] = useState<Cashier[]>([]);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockLeft, setLockLeft] = useState(0);

  // lockout countdown
  useEffect(() => {
    const tick = () => setLockLeft(Math.max(0, Math.ceil((getLock().until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // offline cashier list + remembered store code come from the vault
  useEffect(() => {
    openVault().then((v) => {
      if (!v) return;
      setVaultCashiers(v.cashiers.map((c) => ({ id: c.username, username: c.username, displayName: c.displayName })));
      setTenantCode((cur) => cur || v.tenantCode);
    }).catch((e) => e instanceof AuthError && setError(e.message));
  }, []);

  useEffect(() => {
    if (!online) setBanner('Server unreachable. Switched to Local Offline Authentication Mode.'); // FR-5
    else setBanner('');
  }, [online]);

  /** FR-1.2: call on TenantCode blur */
  const resolveTenant = useCallback(async () => {
    const code = tenantCode.trim();
    setTenant(null);
    if (!validTenantCode(code)) { setTenantStatus('error'); setTenantError('Invalid Store ID/Domain.'); return; }
    if (!online) { setTenantStatus('idle'); setTenantError(''); return; }
    setTenantStatus('loading'); setTenantError('');
    try {
      const ctx = await dispatch(tenantApi.endpoints.tenantLookup.initiate({ TenantCode: code }, { track: false })).unwrap();
      setTenant(ctx); setTenantStatus('ok');
    } catch (e) {
      const c = apiErr(e).data?.code;
      setTenantStatus('error');
      setTenantError(c === ERR.TENANT_INACTIVE ? 'This store’s subscription is not active.'
        : isNetwork(e) ? 'Cannot reach the server. Check the connection.' : 'Invalid Store ID/Domain.');
    }
  }, [tenantCode, online, dispatch]);

  const finish = (token: string, role: keyof typeof LANDING, displayName: string, code: string, offline: boolean) => {
    clearFailures();
    dispatch(setSession({ accessToken: token, role, displayName, tenantCode: code, offline }));
    navigate(LANDING[role], { replace: true });
  };

  const signInOffline = async (username: string, secret: string) => {
    const r = await offlineLogin(username, secret);
    finish(r.token, 'cashier', r.displayName, r.tenantCode, true);
  };

  /** secret = PIN or password. Cleared by the caller right after this resolves (NFR-2.3). */
  const submit = async (tab: RoleTab, username: string, secret: string, otp?: string) => {
    if (loading || getLock().until > Date.now()) return;
    setError(''); setLoading(true);
    try {
      if (!online) {
        if (tab !== 'cashier') throw new AuthError('ERR_OFFLINE_ROLE', 'Only cashiers can sign in offline.'); // FR-3.2
        return await signInOffline(username, secret);
      }
      if (!tenant) { setTenantStatus('error'); setTenantError('Enter a valid Store ID first.'); return; }
      const res = await dispatch(authApi.endpoints.login.initiate({
        tenantToken: tenant.tenantContextToken,
        body: { tenantCode: tenantCode.trim(), username, pinOrPassword: secret, branchId: tenant.branchId || BRANCH_ID,
          terminalId: TERMINAL_ID, deviceFingerprint: await deviceFingerprint(), roleTab: tab, otp },
      }, { track: false })).unwrap();
      if (res.requiresOtp) { setOtpRequired(true); return; } // owner dual-factor
      if (tab === 'cashier') await rememberCashier(tenantCode.trim(), tenant.branchId, username, res.displayName, secret);
      setOtpRequired(false);
      finish(res.accessToken, res.role, res.displayName, tenantCode.trim(), false);
    } catch (e) {
      if (e instanceof AuthError && e.code !== 'ERR_BAD_CREDENTIALS') { setError(e.message); return; }
      const code = apiErr(e).data?.code;
      if (isNetwork(e) && tab === 'cashier') {
        setBanner('Server unreachable. Switched to Local Offline Authentication Mode.');
        try { return await signInOffline(username, secret); } catch (oe) { setError(oe instanceof AuthError && oe.code !== 'ERR_BAD_CREDENTIALS' ? oe.message : 'Invalid credentials.'); return; }
      }
      if (code === ERR.TERMINAL_LOCKED) { setLockedBy(apiErr(e).data?.user ?? 'another user'); return; }
      if (code === ERR.TENANT_NOT_FOUND || code === ERR.TENANT_INACTIVE) { setTenantStatus('error'); setTenantError('Invalid Store ID/Domain.'); return; }
      const s = registerFailure(); // never reveal which part was wrong
      setLockLeft(Math.max(0, Math.ceil((s.until - Date.now()) / 1000)));
      setError(s.left > 0 ? `Invalid credentials. Attempts remaining: ${s.left}` : 'Too many attempts. Locked for 5 minutes.');
    } finally { setLoading(false); }
  };

  return {
    tenantCode, setTenantCode, tenant, tenantStatus, tenantError, resolveTenant,
    cashiers: tenant?.cashiers ?? vaultCashiers, error, banner, loading, otpRequired,
    lockedBy, closeLocked: () => setLockedBy(null), lockLeft, submit,
  };
}
