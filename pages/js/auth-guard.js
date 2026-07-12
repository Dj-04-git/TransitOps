/* ============================================
   TransitOps — Client-side auth + RBAC guard
   Shared by protected pages (dashboard, analytics,
   settings, …). Enforces that only authenticated
   users reach the app (PDF §3.1) and adapts the UI
   to the signed-in user's role.

   Usage: include BEFORE the page's own script.
     <script src="/js/auth-guard.js"></script>

   Role gating in markup:
     <div data-roles="fleet_manager,financial_analyst">…</div>  (show only to those roles)
     <div data-roles-hide="driver">…</div>                       (hide from those roles)
   ============================================ */

(function () {
  const ROLE_LABELS = {
    fleet_manager: 'Fleet Manager',
    driver: 'Driver',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  };

  function readUser() {
    try {
      const raw = localStorage.getItem('transitops_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  const user = readUser();
  const token = localStorage.getItem('transitops_token');

  // Apply saved theme as early as possible to avoid a flash of light mode.
  const savedTheme = localStorage.getItem('transitops_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Enforce authentication (RBAC): no session → bounce to login.
  if (!user) {
    window.location.replace('/login?next=' + encodeURIComponent(location.pathname));
    return;
  }

  const email = user.email || 'Unknown';
  const username =
    typeof email === 'string' && email.includes('@') ? email.split('@')[0] : String(email);
  const role = String(user.role || '').toLowerCase();
  const roleLabel = ROLE_LABELS[role] || role || 'Unknown';

  function logout() {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    window.location.href = '/login';
  }

  function applyRoleGating(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-roles]').forEach((el) => {
      const allowed = el.getAttribute('data-roles').split(',').map((s) => s.trim());
      el.hidden = !allowed.includes(role);
    });
    scope.querySelectorAll('[data-roles-hide]').forEach((el) => {
      const blocked = el.getAttribute('data-roles-hide').split(',').map((s) => s.trim());
      if (blocked.includes(role)) el.hidden = true;
    });
  }

  function setTheme(theme) {
    const value = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem('transitops_theme', value);
    return value;
  }

  function paintChrome() {
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = username;

    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
      statusEl.className = 'status-pill online';
      statusEl.innerHTML = '<span class="status-dot"></span> ' + roleLabel;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    document.querySelectorAll('[data-user-name]').forEach((el) => (el.textContent = username));
    document.querySelectorAll('[data-user-email]').forEach((el) => (el.textContent = email));
    document.querySelectorAll('[data-user-role]').forEach((el) => (el.textContent = roleLabel));
    document.querySelectorAll('[data-user-initials]').forEach((el) => {
      el.textContent = username.slice(0, 2).toUpperCase();
    });
  }

  // Public API for page scripts.
  window.TransitOpsAuth = {
    user,
    token,
    email,
    username,
    role,
    roleLabel,
    ROLE_LABELS,
    logout,
    setTheme,
    getTheme: () => localStorage.getItem('transitops_theme') || 'light',
    applyRoleGating,
    // Authenticated fetch helper — attaches the Bearer token.
    authFetch: (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(options.headers || {}),
        },
      }),
  };

  document.addEventListener('DOMContentLoaded', () => {
    paintChrome();
    applyRoleGating(document);
  });
})();
