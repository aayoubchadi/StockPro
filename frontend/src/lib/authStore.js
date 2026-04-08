const STORAGE_KEY = 'stockpro_accounts';
const SESSION_KEY = 'stockpro_session';

export const getAccounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
};

export const saveAccounts = (accounts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

export const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getDashboardPathForRole = (role) => {
  return role === 'admin' ? '/admin-dashboard' : '/client-dashboard';
};

export const ensureSeedAccount = () => {
  const accounts = getAccounts();
  let changed = false;

  if (!accounts['client@stockpro.com']) {
    accounts['client@stockpro.com'] = {
      fullName: 'Client Test',
      password: 'client1234',
      role: 'client',
    };
    changed = true;
  }

  if (!accounts['admin@stockpro.com']) {
    accounts['admin@stockpro.com'] = {
      fullName: 'Admin Test',
      password: 'admin1234',
      role: 'admin',
    };
    changed = true;
  }

  if (accounts['demo@stockpro.com'] && !accounts['demo@stockpro.com'].role) {
    accounts['demo@stockpro.com'].role = 'client';
    changed = true;
  }

  if (changed) {
    saveAccounts(accounts);
  }
};
