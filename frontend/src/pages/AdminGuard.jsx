import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import FormField from './FormField.jsx';
import { getDefaultPathForRole, getStoredSession, saveSession } from '../lib/auth.ts';
import { login } from '../services/api.js';
import '../pages/login.css';

/**
 * Wrap admin routes with this guard.
 * If there is no admin session (even when a salesperson is signed in),
 * it blocks the page and asks for admin credentials in an overlay.
 * The salesperson session is never touched.
 *
 *   <Route path="/admin/*" element={<AdminGuard><AdminLayout /></AdminGuard>} />
 */
export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getStoredSession('admin'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session?.token && session.role === 'admin') {
    return children;
  }

  const handleUnlock = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login({ email: email.trim(), password });
      const user = response.data?.user;
      if (!response.data?.token || user?.role !== 'admin') {
        setError('Admin credentials are required for this page.');
        return;
      }
      const next = {
        token: response.data.token,
        role: 'admin',
        email: user.email,
        displayName: user.displayName || user.email,
        salespersonId: null,
      };
      saveSession(next, 'admin');
      setSession(next);
    } catch (err) {
      const message = err?.response?.data?.message || 'Invalid email or password.';
      setError(message);
      Swal.fire('Access denied', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const sales = getStoredSession('salesperson');
    navigate(sales?.role ? getDefaultPathForRole(sales.role) : '/sales/login', { replace: true });
  };

  return (
    <div className="guard-backdrop" role="dialog" aria-modal="true" aria-labelledby="guard-title">
      <form className="guard-card" onSubmit={handleUnlock}>
        <h2 id="guard-title" className="h5 mb-1">Admin access required</h2>
        <p className="text-muted small mb-3">
          This panel is for administrators. Enter admin credentials to continue.
        </p>
        <FormField label="Admin email">
          <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="name@example.com" autoFocus />
        </FormField>
        <FormField label="Password" className="mt-3">
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter admin password" />
        </FormField>
        {error ? <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">{error}</div> : null}
        <div className="d-flex gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary w-50" onClick={handleCancel}>Go back</button>
          <button type="submit" className="btn btn-primary w-50" disabled={loading}>
            {loading ? 'Checking…' : 'Unlock admin'}
          </button>
        </div>
      </form>
    </div>
  );
}
