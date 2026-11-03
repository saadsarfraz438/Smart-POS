import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
// @ts-expect-error CSS import is resolved by the bundler.
import 'bootstrap/dist/css/bootstrap.min.css';
// @ts-expect-error CSS import is resolved by the bundler.
import 'bootstrap-icons/font/bootstrap-icons.css';
// @ts-expect-error CSS import is resolved by the bundler.
import './App.css';
import MainLayout from './layouts/MainLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import SalespersonsPage from './pages/SalespersonsPage.jsx';
import PosPage from './pages/PosPage.jsx';
import SalesRecordsPage from './pages/SalesRecordsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { getAnyStoredSession, getDefaultPathForRole, getStoredSession } from './lib/auth.ts';

function ProtectedRoute({ children, role, loginPath }: { children: ReactNode; role: 'admin' | 'salesperson'; loginPath: string }) {
  const session = getStoredSession(role);

  if (!session?.token || !session.role) {
    return <Navigate to={loginPath} replace />;
  }

  return children;
}

function HomeRedirect() {
  const session = getAnyStoredSession();
  return <Navigate to={session?.token && session.role ? getDefaultPathForRole(session.role) : '/admin/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<LoginPage portalRole="admin" />} />
        <Route path="/sales/login" element={<LoginPage portalRole="salesperson" />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/admin" element={<ProtectedRoute role="admin" loginPath="/admin/login"><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="salespersons" element={<SalespersonsPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="sales-records" element={<SalesRecordsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/sales" element={<ProtectedRoute role="salesperson" loginPath="/sales/login"><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="pos" replace />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
