(() => {
  const STORAGE_KEY = 'stockpilot_accounts';
  const SESSION_KEY = 'stockpilot_session';

  const getAccounts = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveAccounts = (accounts) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  };

  const saveSession = (session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const getSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };

  const getDashboardPathForRole = (role) => {
    return role === 'admin' ? './admin-dashboard.html' : './client-dashboard.html';
  };

  const ensureSeedAccount = () => {
    const accounts = getAccounts();
    let changed = false;

    if (!accounts['client@stockpilot.com']) {
      accounts['client@stockpilot.com'] = {
        fullName: 'Client Test',
        password: 'client1234',
        role: 'client',
      };
      changed = true;
    }

    if (!accounts['admin@stockpilot.com']) {
      accounts['admin@stockpilot.com'] = {
        fullName: 'Admin Test',
        password: 'admin1234',
        role: 'admin',
      };
      changed = true;
    }

    if (accounts['demo@stockpilot.com'] && !accounts['demo@stockpilot.com'].role) {
      accounts['demo@stockpilot.com'].role = 'client';
      changed = true;
    }

    if (changed) {
      saveAccounts(accounts);
    }
  };

  const setMessage = (el, text, type) => {
    if (!el) {
      return;
    }
    el.textContent = text;
    el.classList.remove('error', 'success');
    if (type) {
      el.classList.add(type);
    }
  };

  const handleLogin = () => {
    const form = document.getElementById('loginForm');
    if (!form) {
      return;
    }

    const message = document.getElementById('formMessage');
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      const emailInput = form.querySelector('input[name="email"]');
      if (emailInput) {
        emailInput.value = emailParam;
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const password = String(formData.get('password') || '');
      const accounts = getAccounts();

      if (!accounts[email] || accounts[email].password !== password) {
        setMessage(message, 'Identifiants invalides.', 'error');
        return;
      }

      const account = accounts[email];
      const role = account.role || 'client';
      saveSession({
        email,
        fullName: account.fullName || 'Utilisateur',
        role,
      });

      setMessage(message, 'Connexion reussie. Redirection...', 'success');
      setTimeout(() => {
        window.location.href = getDashboardPathForRole(role);
      }, 900);
    });
  };

  const handleCreateAccount = () => {
    const form = document.getElementById('createAccountForm');
    if (!form) {
      return;
    }

    const message = document.getElementById('formMessage');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const fullName = String(formData.get('fullName') || '').trim();
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const password = String(formData.get('password') || '');
      const confirmPassword = String(formData.get('confirmPassword') || '');

      if (password.length < 6) {
        setMessage(message, 'Le mot de passe doit contenir au moins 6 caracteres.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        setMessage(message, 'Les mots de passe ne correspondent pas.', 'error');
        return;
      }

      const accounts = getAccounts();
      if (accounts[email]) {
        setMessage(message, 'Cet email existe deja.', 'error');
        return;
      }

      accounts[email] = { fullName, password, role: 'client' };
      saveAccounts(accounts);
      setMessage(message, 'Compte cree avec succes. Redirection...', 'success');
      setTimeout(() => {
        window.location.href = `./login.html?email=${encodeURIComponent(email)}`;
      }, 900);
    });
  };

  const handleForgotPassword = () => {
    const form = document.getElementById('forgotPasswordForm');
    if (!form) {
      return;
    }

    const message = document.getElementById('formMessage');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const newPassword = String(formData.get('newPassword') || '');
      const confirmNewPassword = String(formData.get('confirmNewPassword') || '');

      if (newPassword.length < 6) {
        setMessage(message, 'Le mot de passe doit contenir au moins 6 caracteres.', 'error');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setMessage(message, 'Les mots de passe ne correspondent pas.', 'error');
        return;
      }

      const accounts = getAccounts();
      if (!accounts[email]) {
        setMessage(message, 'Aucun compte trouve avec cet email.', 'error');
        return;
      }

      accounts[email].password = newPassword;
      saveAccounts(accounts);
      setMessage(message, 'Mot de passe mis a jour. Redirection...', 'success');
      setTimeout(() => {
        window.location.href = `./login.html?email=${encodeURIComponent(email)}`;
      }, 900);
    });
  };

  const handleDashboard = () => {
    const expectedRole = document.body.dataset.dashboard;
    if (!expectedRole) {
      return;
    }

    const session = getSession();
    if (!session) {
      window.location.href = './login.html';
      return;
    }

    if (session.role !== expectedRole) {
      window.location.href = getDashboardPathForRole(session.role);
      return;
    }

    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    const roleEl = document.getElementById('userRole');

    if (nameEl) {
      nameEl.textContent = session.fullName;
    }
    if (emailEl) {
      emailEl.textContent = session.email;
    }
    if (roleEl) {
      roleEl.textContent = session.role;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearSession();
        window.location.href = './login.html';
      });
    }
  };

  ensureSeedAccount();
  handleLogin();
  handleCreateAccount();
  handleForgotPassword();
  handleDashboard();
})();
