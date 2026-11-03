import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { getDefaultPathForRole, getStoredSession, saveSession } from '../lib/auth.ts';
import { login } from '../services/api.js';
import './login.css';

// Role definitions: one place that controls labels, placeholders and the login route.
const ROLES = {
  salesperson: {
    tab: 'Sales staff',
    heading: 'Salesperson Login',
    roleHint: 'Use salesperson credentials for this portal.',
    idLabel: 'Employee ID',
    idPlaceholder: 'Enter Employee ID',
    idMode: 'text',
    path: '/sales/login',
    can: ['Ring up sales and checkout', 'Hold and resume bills', 'View own daily sales'],
  },
  admin: {
    tab: 'Admin',
    heading: 'Admin Login',
    roleHint: 'Use admin credentials for this portal.',
    idLabel: 'Email or username',
    idPlaceholder: 'name@example.com',
    idMode: 'email',
    path: '/admin/login',
    can: ['Manage products and stock', 'Create salesperson accounts', 'View reports and all stores'],
  },
};

const STORE_KEY = 'lumensoft_last_store_id';

function readLastStore() {
  try {
    return window.localStorage.getItem(STORE_KEY) || '';
  } catch {
    return '';
  }
}

function writeLastStore(value) {
  try {
    window.localStorage.setItem(STORE_KEY, value);
  } catch {
    /* storage can be blocked; ignore */
  }
}

function PosIllustration() {
  return (
    <svg className="auth-illustration" viewBox="0 0 360 260" role="img" aria-label="Point of sale terminal with a printed receipt">
      <rect x="20" y="214" width="320" height="10" rx="5" fill="rgba(255,255,255,.14)" />
      {/* receipt */}
      <g transform="translate(236 40) rotate(6)">
        <path d="M0 0h86v140l-7-5-7 5-7-5-8 5-7-5-7 5-7-5-7 5-7-5-7 5-7-5z" fill="#fff" />
        <rect x="10" y="14" width="44" height="5" rx="2.5" fill="#12263a" />
        <rect x="10" y="30" width="66" height="3" rx="1.5" fill="#c3ccd5" />
        <rect x="10" y="40" width="58" height="3" rx="1.5" fill="#c3ccd5" />
        <rect x="10" y="50" width="62" height="3" rx="1.5" fill="#c3ccd5" />
        <rect x="10" y="60" width="50" height="3" rx="1.5" fill="#c3ccd5" />
        <rect x="10" y="80" width="30" height="5" rx="2.5" fill="#12263a" />
        <rect x="48" y="80" width="28" height="5" rx="2.5" fill="#f59e0b" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <rect key={i} x={10 + i * 5.2} y="104" width={i % 3 === 0 ? 3 : 1.6} height="18" fill="#12263a" />
        ))}
      </g>
      {/* terminal */}
      <rect x="40" y="52" width="190" height="130" rx="14" fill="#fff" />
      <rect x="54" y="66" width="162" height="62" rx="8" fill="#12263a" />
      <rect x="66" y="78" width="60" height="6" rx="3" fill="#5eead4" />
      <rect x="66" y="92" width="100" height="4" rx="2" fill="rgba(255,255,255,.4)" />
      <rect x="66" y="102" width="84" height="4" rx="2" fill="rgba(255,255,255,.4)" />
      <text x="204" y="118" textAnchor="end" fontSize="18" fontWeight="700" fill="#f59e0b">4,250</text>
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={54 + c * 42} y={138 + r * 14} width="36" height="9" rx="3" fill={r === 2 && c === 3 ? '#0f766e' : '#e3e8ed'} />
        ))
      )}
      <rect x="110" y="182" width="50" height="22" fill="#e3e8ed" />
      <rect x="84" y="202" width="102" height="12" rx="6" fill="#fff" />
    </svg>
  );
}

export default function LoginPage({ portalRole = null }) {
  const session = getStoredSession(portalRole || undefined);
  const navigate = useNavigate();
  const [tab, setTab] = useState(portalRole === 'admin' ? 'admin' : 'salesperson');
  const [storeId, setStoreId] = useState(readLastStore);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeRole = portalRole || tab;
  const cfg = ROLES[activeRole];
  const heading = portalRole ? cfg.heading : 'Login';
  const roleHint = portalRole ? cfg.roleHint : 'Choose your role, then sign in.';

  useEffect(() => {
    if (session?.token && session.role) {
      navigate(getDefaultPathForRole(session.role), { replace: true });
    }
  }, [navigate, session]);

  const switchTab = (role) => {
    setError('');
    setIdentifier('');
    setPassword('');
    if (portalRole) {
      // Dedicated portal links keep their own URL.
      navigate(ROLES[role].path);
      return;
    }
    setTab(role);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      const message = `Enter your ${cfg.idLabel.toLowerCase()} and password.`;
      setError(message);
      return;
    }

    setLoading(true);
    try {
      // `email` stays the primary key so the existing API keeps working.
      // storeId / employeeId are extra fields the backend can use or ignore.
      const payload = { email: trimmedId, password };
      if (storeId.trim()) payload.storeId = storeId.trim();
      if (activeRole === 'salesperson') payload.employeeId = trimmedId;

      const response = await login(payload);
      const user = response.data?.user;
      if (!response.data?.token || !user?.role) {
        throw new Error('Login failed.');
      }

      if (activeRole && user.role !== activeRole) {
        const requiredRoleName = activeRole === 'admin' ? 'admin' : 'salesperson';
        const message = `This tab accepts ${requiredRoleName} credentials only.`;
        setError(message);
        Swal.fire('Wrong portal', message, 'warning');
        return;
      }

      if (storeId.trim()) writeLastStore(storeId.trim());

      // Saved per role, so an admin and a salesperson can stay signed in
      // side by side in the same browser.
      saveSession(
        {
          token: response.data.token,
          role: user.role,
          email: user.email,
          displayName: user.displayName || user.email,
          salespersonId: user.salespersonId ?? null,
        },
        user.role
      );
      navigate(getDefaultPathForRole(user.role), { replace: true });
    } catch (loginError) {
      const message = loginError?.response?.data?.message || 'Invalid email or password.';
      setError(message);
      Swal.fire('Login failed', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-vh-100">
      <aside className="auth-side">
        <div className="auth-brand">Lumensoft POS</div>
        <PosIllustration />
        <h2 className="auth-side-title">Fast checkout. Clear control.</h2>
        <div className="auth-roles">
          {Object.entries(ROLES).map(([key, role]) => (
            <div key={key} className={`auth-role-card ${activeRole === key ? 'is-active' : ''}`}>
              <h3>{role.tab}</h3>
              <ul>
                {role.can.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">Lumensoft POS</div>

          <div className="auth-tabs" role="tablist" aria-label="Sign in as">
            {Object.entries(ROLES).map(([key, role]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeRole === key}
                className={`auth-tab ${activeRole === key ? 'is-active' : ''}`}
                onClick={() => switchTab(key)}
              >
                {role.tab}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <h1 className="auth-heading">{heading}</h1>
            <p className="text-muted mb-0">{roleHint}</p>
          </div>

          <form onSubmit={handleLogin} noValidate>
            <FormField label="Store / Branch ID">
              <input
                className="form-control"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="e.g. LHR-01"
                autoComplete="organization"
              />
            </FormField>

            <FormField label={cfg.idLabel} className="mt-3">
              <input
                className="form-control"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                inputMode={activeRole === 'salesperson' ? 'numeric' : 'email'}
                placeholder={cfg.idPlaceholder}
              />
            </FormField>

            <FormField label="Password" className="mt-3">
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </FormField>

            {error ? <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">{error}</div> : null}

            <div className="small text-muted my-3 text-center">
              Passwords for salespersons are managed by the admin panel.
            </div>

            <button className="btn btn-primary w-100 auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : `Sign in as ${cfg.tab.toLowerCase()}`}
            </button>

            <div className="small text-center mt-3">
              <Link to="/admin/login">Admin login</Link>
              {' | '}
              <Link to="/sales/login">Salesperson login</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
