import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLoginForm from '../../components/auth/AdminLoginForm';
import CashierLoginForm from '../../components/auth/CashierLoginForm';
import RoleSelector from '../../components/auth/RoleSelector';
import TenantInput from '../../components/auth/TenantInput';
import Modal from '../../components/common/Modal';
import StatusFooter from '../../components/common/StatusFooter';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { RoleTab } from '../../types/auth.types';
import { TERMINAL_ID } from '../../utils/constants';

const FIELDS: Record<Exclude<RoleTab, 'cashier'>, { id: string; secret: string }> = {
  admin: { id: 'Email or username', secret: 'Password' },
  inventory: { id: 'Employee ID or username', secret: 'Password' },
  online: { id: 'Channel username', secret: 'Password or API key' },
};

export default function LoginPage() {
  const { online, latency } = useNetworkStatus();
  const a = useAuth(online);
  const [tab, setTab] = useState<RoleTab>('cashier'); // FR-2.1: Cashier is the default
  const tenantRef = useRef<HTMLInputElement>(null);
  const locked = a.lockLeft > 0;
  const mm = `${Math.floor(a.lockLeft / 60)}:${String(a.lockLeft % 60).padStart(2, '0')}`;

  return (
    <div className="grid min-h-screen bg-page text-ink lg:grid-cols-2">
      {/* Left artwork: put your image at public/assets/images/volta-side.jpg */}
      <aside aria-hidden="true" className="hidden bg-[#06143a] bg-cover bg-center lg:block"
        style={{ backgroundImage: "url('/src/assets/images/volta-side.jpg')" }} />

      <main className="relative flex items-center justify-center px-5 py-8 pt-20 lg:pt-8">
        <ThemeToggle />
        <div className="w-full max-w-[520px] rounded-[22px] border border-line bg-card p-6 shadow-2xl sm:p-8">
          <div className="mb-4 text-2xl font-extrabold lg:hidden">Volta <span className="block text-sm font-medium text-mute">Powering everyday sales</span></div>

          <header className="mb-5">
            <h1 className="text-3xl font-extrabold">Welcome back!</h1>
            <p className="mt-1 text-mute">Sign in to start your shift.</p>
          </header>

          {a.banner && <div role="alert" className="mb-4 rounded-[10px] border border-amber-500 bg-amber-100 px-4 py-2.5 font-semibold text-amber-900">{a.banner}</div>}

          <TenantInput ref={tenantRef} value={a.tenantCode} onChange={a.setTenantCode} onBlur={() => void a.resolveTenant()}
            status={a.tenantStatus} error={a.tenantError} tenantName={a.tenant?.tenantName} />

          <div className="mt-2"><RoleSelector value={tab} onChange={setTab} /></div>

          {tab === 'cashier'
            ? <CashierLoginForm key="cashier" cashiers={a.cashiers} loading={a.loading} locked={locked}
                onSubmit={(u, p) => a.submit('cashier', u, p)} />
            : <AdminLoginForm key={tab} idLabel={FIELDS[tab].id} secretLabel={FIELDS[tab].secret}
                otpRequired={tab === 'admin' && a.otpRequired} loading={a.loading} locked={locked}
                onSubmit={(u, s, otp) => a.submit(tab, u, s, otp)} />}

          {locked && <div role="alert" className="mt-3 rounded-[10px] border border-err px-4 py-2.5 font-semibold text-err">Too many failed attempts. Try again in {mm}.</div>}
          {a.error && !locked && <div role="alert" className="mt-3 rounded-[10px] border border-err px-4 py-2.5 font-semibold text-err">{a.error}</div>}

          <div className="mt-2"><Link className="v-link" to="/contact">Contact us</Link></div>

          <StatusFooter online={online} latency={latency} branch={a.tenant?.branchName} />
        </div>
      </main>

      {a.lockedBy && (
        <Modal title="Terminal in use" onClose={a.closeLocked}>
          Terminal {TERMINAL_ID} is actively in use by user “{a.lockedBy}”. Ask a manager to sign in as Admin and override the lock.
        </Modal>
      )}
    </div>
  );
}
