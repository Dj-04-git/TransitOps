/* ============================================
   TransitOps — Settings
   - Account & Security wired to the real API
     (PUT /api/auth/me, protected by JWT).
   - Preferences + Notifications persisted in
     localStorage (transitops_settings).
   - Role & Permissions rendered from the
     signed-in user's role (RBAC, PDF §3.1).
   Depends on /js/auth-guard.js (TransitOpsAuth).
   ============================================ */

const SETTINGS_KEY = 'transitops_settings';

const DEFAULT_SETTINGS = {
  darkMode: false,
  compactTables: false,
  landing: '/dashboard',
  notifLicense: true,
  notifMaintenance: true,
  notifWeekly: false,
};

/* Per-role capability copy (from PDF §2 Target Users + §3 features). */
const ROLE_PERMISSIONS = {
  fleet_manager: [
    'Manage the vehicle registry (add, edit, retire vehicles)',
    'Oversee maintenance logs and vehicle lifecycle',
    'View fleet utilization and operational efficiency',
    'Access full dashboard KPIs and analytics',
  ],
  driver: [
    'Create trips and assign available vehicles & drivers',
    'Monitor active deliveries in real time',
    'Complete or cancel trips (auto status transitions)',
    'View trip-related dashboard KPIs',
  ],
  safety_officer: [
    'Track driver compliance and license validity',
    'Monitor driver safety scores',
    'Flag expired licenses and suspended drivers',
    'Receive license-expiry reminders',
  ],
  financial_analyst: [
    'Review operational expenses and fuel consumption',
    'Analyze maintenance costs and vehicle ROI',
    'Export financial reports as CSV',
    'View profitability and cost-breakdown analytics',
  ],
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let settings = loadSettings();

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}

/* ---------- Section nav (smooth active state) ---------- */
function initSectionNav() {
  const links = document.querySelectorAll('.settings-nav-item');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/* ---------- Preferences + Notifications ---------- */
function bindToggle(id, key, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = !!settings[key];
  el.addEventListener('change', () => {
    settings[key] = el.checked;
    saveSettings(settings);
    if (onChange) onChange(el.checked);
    showToast('Preference saved');
  });
}

function initPreferences() {
  bindToggle('prefDarkMode', 'darkMode', (on) => {
    window.TransitOpsAuth.setTheme(on ? 'dark' : 'light');
  });
  bindToggle('prefCompact', 'compactTables', (on) => {
    document.body.classList.toggle('compact-tables', on);
  });
  bindToggle('notifLicense', 'notifLicense');
  bindToggle('notifMaintenance', 'notifMaintenance');
  bindToggle('notifWeekly', 'notifWeekly');

  const landing = document.getElementById('prefLanding');
  if (landing) {
    landing.value = settings.landing;
    landing.addEventListener('change', () => {
      settings.landing = landing.value;
      saveSettings(settings);
      showToast('Default landing page updated');
    });
  }

  // Reflect current theme in case it was set on another page.
  const darkEl = document.getElementById('prefDarkMode');
  if (darkEl) darkEl.checked = window.TransitOpsAuth.getTheme() === 'dark';
}

/* ---------- Role & Permissions ---------- */
function initPermissions() {
  const list = document.getElementById('permList');
  if (!list) return;
  const perms = ROLE_PERMISSIONS[window.TransitOpsAuth.role] || ['No permissions on file for this role.'];
  list.innerHTML = perms
    .map((p) => `<li><i class="fa-solid fa-circle-check"></i> ${p}</li>`)
    .join('');
}

/* ---------- Account & Security (real API) ---------- */
function initAccountForm() {
  const form = document.getElementById('accountForm');
  const emailInput = document.getElementById('accEmail');
  const msg = document.getElementById('accountMsg');
  if (!form) return;

  emailInput.value = window.TransitOpsAuth.email || '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'form-msg';

    const email = emailInput.value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword && newPassword.length < 6) {
      return setMsg(msg, 'Password must be at least 6 characters.', 'error');
    }
    if (newPassword && newPassword !== confirmPassword) {
      return setMsg(msg, 'Passwords do not match.', 'error');
    }

    const payload = {};
    if (email && email !== window.TransitOpsAuth.email) payload.email = email;
    if (newPassword) payload.newPassword = newPassword;

    if (Object.keys(payload).length === 0) {
      return setMsg(msg, 'Nothing to update.', 'error');
    }

    const btn = document.getElementById('saveAccountBtn');
    btn.disabled = true;

    try {
      const res = await window.TransitOpsAuth.authFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      // Keep local session in sync with the new email.
      if (data.user) {
        const stored = JSON.parse(localStorage.getItem('transitops_user') || '{}');
        stored.email = data.user.email;
        localStorage.setItem('transitops_user', JSON.stringify(stored));
        document.querySelectorAll('[data-user-email]').forEach((el) => (el.textContent = data.user.email));
      }

      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
      setMsg(msg, 'Account updated successfully.', 'success');
      showToast('Account updated');
    } catch (err) {
      setMsg(msg, err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function setMsg(el, text, type) {
  el.textContent = text;
  el.className = 'form-msg ' + type;
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initSectionNav();
  initPreferences();
  initPermissions();
  initAccountForm();

  if (settings.compactTables) document.body.classList.add('compact-tables');
});
