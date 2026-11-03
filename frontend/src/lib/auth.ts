export const AUTH_SESSION_KEY = 'lumensoft-session';
export const AUTH_ADMIN_SESSION_KEY = 'lumensoft-admin-session';
export const AUTH_SALES_SESSION_KEY = 'lumensoft-sales-session';
export const AUTH_FLAG_KEY = 'lumensoft-auth';
export const SETTINGS_KEY = 'lumensoft-settings';

export type AppRole = 'admin' | 'salesperson';

export type AuthSession = {
  token: string;
  role: AppRole;
  email: string;
  displayName: string;
  salespersonId?: number | null;
};

export type SessionRoleScope = AppRole;

export const DEFAULT_PATHS: Record<AppRole, string> = {
  admin: '/admin/dashboard',
  salesperson: '/sales/pos',
};

export const ROLE_MENUS = {
  admin: [
    { to: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: 'products', label: 'Products', icon: 'boxes' },
    { to: 'salespersons', label: 'Salespersons', icon: 'users' },
    { to: 'pos', label: 'Point of Sale', icon: 'cart' },
    { to: 'sales-records', label: 'Sales Records', icon: 'receipt' },
    { to: 'settings', label: 'Settings', icon: 'settings' },
  ],
  salesperson: [
    { to: 'pos', label: 'Point of Sale', icon: 'cart' },
    { to: 'settings', label: 'Settings', icon: 'settings' },
  ],
};

export const DEFAULT_SETTINGS = {
  companyName: 'Lumensoft POS',
  currency: 'PKR',
  taxRate: 0,
  notificationsEnabled: true,
  showRecentSalesChart: true,
  printEnabled: true,
  discountEnabled: true,
  discountMode: 'percentage',
  darkMode: false,
};

const readJson = (key: string, fallback: unknown) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const SESSION_KEYS: Record<SessionRoleScope, string> = {
  admin: AUTH_ADMIN_SESSION_KEY,
  salesperson: AUTH_SALES_SESSION_KEY,
};

export const getRoleFromPath = (pathName: string): AppRole | null => {
  if (pathName.startsWith('/admin')) {
    return 'admin';
  }

  if (pathName.startsWith('/sales')) {
    return 'salesperson';
  }

  return null;
};

const isValidSession = (value: unknown): value is AuthSession => {
  const candidate = value as AuthSession | null;
  return Boolean(candidate?.token && candidate?.role && candidate?.email);
};

const resolveScopeFromRuntime = (): SessionRoleScope | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return getRoleFromPath(window.location.pathname);
};

export const getStoredSettings = () => ({ ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) });

export const getStoredSession = (scope?: SessionRoleScope) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const resolvedScope = scope ?? resolveScopeFromRuntime();
  if (resolvedScope) {
    const scopedSession = readJson(SESSION_KEYS[resolvedScope], null);
    if (isValidSession(scopedSession) && scopedSession.role === resolvedScope) {
      return scopedSession;
    }
    return null;
  }

  const legacySession = readJson(AUTH_SESSION_KEY, null);
  if (isValidSession(legacySession)) {
    return legacySession;
  }

  return null;
};

export const getAnyStoredSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const adminSession = getStoredSession('admin');
  if (adminSession) {
    return adminSession;
  }

  const salesSession = getStoredSession('salesperson');
  if (salesSession) {
    return salesSession;
  }

  return getStoredSession();
};

export const saveSession = (session: AuthSession, scope?: SessionRoleScope) => {
  if (typeof window === 'undefined') {
    return;
  }

  const resolvedScope = scope ?? session.role;
  window.localStorage.setItem(SESSION_KEYS[resolvedScope], JSON.stringify(session));
  window.localStorage.removeItem(AUTH_SESSION_KEY);
};

export const clearSession = (scope?: SessionRoleScope) => {
  if (typeof window === 'undefined') {
    return;
  }

  const resolvedScope = scope ?? resolveScopeFromRuntime();
  if (resolvedScope) {
    window.localStorage.removeItem(SESSION_KEYS[resolvedScope]);
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
};

export const getDefaultPathForRole = (role: AppRole) => DEFAULT_PATHS[role] || '/login';

export const getRoleMenu = (role: AppRole) => ROLE_MENUS[role] || ROLE_MENUS.salesperson;
