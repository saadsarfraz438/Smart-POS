import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getDefaultPathForRole, getStoredSession, saveSession } from '../lib/auth.ts';
import { login, requestPasswordReset, confirmPasswordReset } from '../services/api.js';
import {
  cleanDigits, cleanText, clearFailures, getLock, registerFailure, useTheme, validPin, MAX_ATTEMPTS,
} from '../lib/voltaUtils.js';
import './login.css';

// FR-1.1: four roles, default = Cashier/Salesperson. `pin` = numeric PIN mode + numpad (FR-1.2 / 1.3).
const ROLES = {
  owner: { tab: 'Store Owner', pin: false },
  salesperson: { tab: 'Cashier/Salesperson', pin: true },
  inventory: { tab: 'Inventory Staff', pin: true },
  admin: { tab: 'Admin', pin: false },
};
const KEYS = ['1', '2', '3', '⌫', '4', '5', '6', '0', '7', '8', '9', 'C'];
const env = import.meta.env || {};
const TERMINAL_ID = env.VITE_TERMINAL_ID || 'T-01';
const BRANCH = env.VITE_BRANCH_NAME || 'Main Branch';

const errorToast = (title) =>
  Swal.fire({ toast: true, position: 'top-end', icon: 'error', title, showConfirmButton: false,
    timer: 4000, background: '#b91c1c', color: '#fff', iconColor: '#fff' });

const Eye = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

export default function LoginPage({ portalRole = 'salesperson' }) {
  const navigate = useNavigate();
  const session = getStoredSession();
  const [theme, toggleTheme] = useTheme();
  const [role, setRole] = useState(portalRole);
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [show, setShow] = useState(false);
  const [active, setActive] = useState('id'); // which field the numpad types into
  const [loading, setLoading] = useState(false);
  const [lockLeft, setLockLeft] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const cfg = ROLES[role];

  useEffect(() => {
    if (session?.token && session.role) navigate(getDefaultPathForRole(session.role), { replace: true });
  }, [navigate, session]);

  // Lockout countdown
  useEffect(() => {
    const tick = () => setLockLeft(Math.max(0, Math.ceil((getLock().until - Date.now()) / 1000)));
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  // FR-5.1: connection status
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const switchRole = (key) => {
    setRole(key); setIdentifier(''); setSecret(''); setShow(false); setActive('id');
  };

  const onId = (v) => setIdentifier(cfg.pin ? cleanDigits(v, 12) : cleanText(v, 100));
  const onSecret = (v) => setSecret(cfg.pin ? cleanDigits(v, 6) : cleanText(v, 128));

  // FR-2.3: numpad appends to the focused field; ⌫ deletes last, C clears
  const press = (k) => {
    const set = active === 'id' ? setIdentifier : setSecret;
    const max = active === 'id' ? 12 : 6;
    set((v) => (k === 'C' ? '' : k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, max)));
  };

  const doLogin = async (badge) => {
    if (loading) return;
    if (getLock().until > Date.now()) return;

    let payload;
    if (badge) {
      payload = { badge: cleanText(badge, 64), role }; // FR-3.1
    } else {
      const id = identifier.trim();
      if (!id || !secret || (cfg.pin && !validPin(secret))) {
        errorToast(cfg.pin ? 'Enter your ID and a 4–6 digit PIN.' : 'Enter your username and password.');
        return;
      }
      // `email` + `password` stay the primary keys so the existing API keeps working.
      payload = { email: id, password: secret, role };
      if (cfg.pin) payload.employeeId = id;
    }

    setLoading(true);
    try {
      const res = await login(payload);
      const user = res.data?.user;
      if (!res.data?.token || !user?.role || user.role !== role) throw new Error('invalid');
      clearFailures();
      saveSession(
        { token: res.data.token, role: user.role, email: user.email,
          displayName: user.displayName || user.email, salespersonId: user.salespersonId ?? null },
        user.role
      );
      // FR-5.2: cashier -> register, admin/owner -> dashboard, inventory -> stock
      navigate(getDefaultPathForRole(user.role), { replace: true });
    } catch {
      // FR-5.3: never reveal which part was wrong
      const s = registerFailure();
      setSecret('');
      setLockLeft(Math.max(0, Math.ceil((s.until - Date.now()) / 1000)));
      errorToast(s.left > 0 ? `Invalid Credentials. Attempts remaining: ${s.left}` : 'Too many attempts. Locked for 5 minutes.');
    } finally {
      setLoading(false);
    }
  };

  // FR-3.2: barcode scanners type very fast and end with Enter -> auto submit
  const submitRef = useRef(doLogin);
  submitRef.current = doLogin;
  useEffect(() => {
    let buf = '';
    let last = 0;
    const onKey = (e) => {
      const now = performance.now();
      if (now - last > 50) buf = '';
      last = now;
      if (e.key === 'Enter') {
        if (buf.length >= 6) { e.preventDefault(); submitRef.current(buf); }
        buf = '';
      } else if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // FR-4: recovery
  const forgot = async () => {
    if (cfg.pin) {
      Swal.fire({ icon: 'info', title: 'Forgot PIN?', text: 'Please contact your Store Admin or Owner to reset your terminal PIN.' });
      return;
    }
    const { value: email } = await Swal.fire({ title: 'Reset password', input: 'email', inputLabel: 'Registered email',
      showCancelButton: true, confirmButtonText: 'Send OTP' });
    if (!email) return;
    try { await requestPasswordReset(email); } catch { /* same reply either way: no account enumeration */ }
    const { value: v } = await Swal.fire({
      title: 'Enter OTP', text: 'If the email is registered, a 6-digit code was sent.',
      html: '<input id="otp" class="swal2-input" inputmode="numeric" maxlength="6" placeholder="6-digit OTP">' +
            '<input id="np" type="password" class="swal2-input" placeholder="New password (min 10 characters)">',
      showCancelButton: true, confirmButtonText: 'Reset password',
      preConfirm: () => {
        const otp = document.getElementById('otp').value.trim();
        const np = document.getElementById('np').value;
        if (!/^\d{6}$/.test(otp) || np.length < 10) { Swal.showValidationMessage('Enter the 6-digit OTP and a password of 10+ characters.'); return false; }
        return { otp, np };
      },
    });
    if (!v) return;
    try {
      await confirmPasswordReset({ email, otp: v.otp, password: v.np });
      Swal.fire('Password updated', 'You can now sign in.', 'success');
    } catch {
      Swal.fire('Reset failed', 'The OTP is invalid or expired.', 'error');
    }
  };

  const locked = lockLeft > 0;
  const mm = `${Math.floor(lockLeft / 60)}:${String(lockLeft % 60).padStart(2, '0')}`;

  return (
    <div className="v-shell" data-theme={theme}>
      <aside className="v-side" aria-hidden="true" />

      <main className="v-main">
        <button type="button" className="v-theme" onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>

        <div className="v-card">
          <div className="v-mobile-brand">Volta <span>Powering everyday sales</span></div>
          <header className="v-head">
            <div>
              <h1>Welcome back!</h1>
              <p>Please log in to your shift.</p>
            </div>
            <div className="v-status" role="status">
              <span className={`v-dot ${online ? 'on' : 'off'}`} />{online ? 'Online' : 'Offline'}
            </div>
          </header>

          <div className="v-tabs" role="tablist" aria-label="Sign in as">
            {Object.entries(ROLES).map(([key, r]) => (
              <button key={key} type="button" role="tab" aria-selected={role === key}
                className={`v-tab ${role === key ? 'is-active' : ''}`} onClick={() => switchRole(key)}>
                {r.tab}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); doLogin(); }} noValidate autoComplete="off">
            <label className="v-label" htmlFor="v-id">{cfg.pin ? 'Employee ID' : 'Email / Username'}</label>
            <input id="v-id" className="v-input" value={identifier} onChange={(e) => onId(e.target.value)}
              onFocus={() => setActive('id')} autoComplete="username" maxLength={100}
              inputMode={cfg.pin ? 'none' : 'email'} placeholder={cfg.pin ? 'Enter Employee ID' : 'name@example.com'} />

            <label className="v-label" htmlFor="v-secret">{cfg.pin ? 'PIN (4–6 digits)' : 'Password'}</label>
            <div className="v-pw">
              <input id="v-secret" className="v-input" type={show ? 'text' : 'password'} value={secret}
                onChange={(e) => onSecret(e.target.value)} onFocus={() => setActive('secret')}
                autoComplete="current-password" maxLength={128} inputMode={cfg.pin ? 'none' : 'text'}
                placeholder={cfg.pin ? 'Enter PIN' : 'Enter your password'} />
              <button type="button" className="v-eye" onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}><Eye off={!show} /></button>
            </div>

            {cfg.pin && (
              <div className="v-pad" role="group" aria-label="Onscreen numpad">
                {KEYS.map((k) => (
                  <button key={k} type="button" className="v-key" onClick={() => press(k)}
                    aria-label={k === '⌫' ? 'Backspace' : k === 'C' ? 'Clear' : k}>{k}</button>
                ))}
              </div>
            )}

            {locked && <div className="v-alert" role="alert">Too many failed attempts. Try again in {mm}.</div>}

            <div className="v-row">
              <button type="button" className="v-link" onClick={forgot}>{cfg.pin ? 'Forgot PIN?' : 'Forgot Password?'}</button>
              <Link className="v-link" to="/contact">Contact us</Link>
            </div>

            <button className="v-submit" type="submit" disabled={loading || locked}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <footer className="v-foot">
            <span>Terminal {TERMINAL_ID}</span><span>{BRANCH}</span>
            <span>{online ? 'Online' : 'Offline'}</span><span>Secure connection</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
