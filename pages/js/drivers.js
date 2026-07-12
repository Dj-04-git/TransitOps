/* ============================================
   TransitOps — Drivers & Safety Profiles loader
  Fetches from /api/drivers. No values are
   hardcoded here — everything renders from the
   API response.

  NOTE: the API is expected to return the PostgreSQL
  `drivers` rows with fields matching the schema in
  `db.js`.
   ============================================ */

let allDrivers = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadDrivers();

  document.getElementById('driverSearch').addEventListener('input', renderFilteredDrivers);

  document.getElementById('addDriverBtn').addEventListener('click', () => openDriverModal());
  document.getElementById('closeDriverModal').addEventListener('click', closeDriverModal);
  document.getElementById('cancelDriverModal').addEventListener('click', closeDriverModal);
  document.getElementById('driverModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'driverModalOverlay') closeDriverModal();
  });
  document.getElementById('driverForm').addEventListener('submit', handleDriverFormSubmit);
});

/* ---------- Helpers ---------- */

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((body && body.message) || `Request failed: ${res.status}`);
  }
  return body;
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Expects "YYYY-MM" (from <input type="month">) or any Date-parsable string.
// Returns true if the expiry month has already passed.
function isExpired(expiry) {
  if (!expiry) return false;
  const parsed = new Date(expiry.length === 7 ? `${expiry}-01` : expiry);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  const endOfExpiryMonth = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
  return endOfExpiryMonth < now;
}

function formatExpiry(expiry) {
  if (!expiry) return '—';
  const parsed = new Date(expiry.length === 7 ? `${expiry}-01` : expiry);
  if (Number.isNaN(parsed.getTime())) return escapeHTML(expiry);
  return parsed.toLocaleDateString(undefined, { month: '2-digit', year: 'numeric' });
}

/* ---------- Session / connection status (shared pattern with dashboard.js) ---------- */

function loadSession() {
  const nameEl = document.getElementById('userName');
  const statusEl = document.getElementById('connectionStatus');

  // TODO: replace with your real "current user" source
  const storedUser = localStorage.getItem('userName');

  nameEl.textContent = storedUser || 'Guest';

  if (storedUser) {
    statusEl.className = 'status-pill online';
    statusEl.innerHTML = '<span class="status-dot"></span> Connected';
  } else {
    statusEl.className = 'status-pill offline';
    statusEl.innerHTML = '<span class="status-dot"></span> Disconnected';
  }
}

/* ---------- Driver registry ---------- */

async function loadDrivers() {
  const tbody = document.getElementById('driversBody');

  try {
    const token = localStorage.getItem('transitops_token');
    const json = await fetchJSON('/api/drivers', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    const drivers = (json && json.data && json.data.drivers) || [];

    allDrivers = drivers;
    renderFilteredDrivers();
  } catch (err) {
    console.error('Failed to load drivers:', err);
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">Couldn't load drivers right now.</td></tr>`;
  }
}

function renderFilteredDrivers() {
  const tbody = document.getElementById('driversBody');
  const query = document.getElementById('driverSearch').value.trim().toLowerCase();

  const filtered = allDrivers.filter((d) => {
    if (!query) return true;
    return String(d.name || '').toLowerCase().includes(query)
      || String(d.license_number || '').toLowerCase().includes(query);
  });

  if (!allDrivers.length) {
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">No drivers added yet. Click "Add Driver" to get started.</td></tr>`;
    return;
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">No drivers match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(driverRowHTML).join('');

  tbody.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => openDriverModal(btn.dataset.editId));
  });
  tbody.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteDriver(btn.dataset.deleteId));
  });
}

function driverRowHTML(d) {
  const safetyValue = Number(d.safety_score ?? 0);
  const completionValue = Number(d.trip_completion_percentage ?? 0);
  const statusValue = String(d.status || '').toLowerCase();
  const statusClass = statusValue.replace(/[\s_]+/g, '-');
  const statusLabel = {
    available: 'Available',
    on_trip: 'On Trip',
    off_duty: 'Off Duty',
    suspended: 'Suspended'
  }[statusValue] || statusValue;
  const expired = isExpired(d.license_expiry_date);

  return `
    <tr>
      <td>${escapeHTML(d.name)}</td>
      <td>${escapeHTML(d.license_number)}</td>
      <td>${escapeHTML(d.license_category)}</td>
      <td class="expiry-cell ${expired ? 'expired' : ''}">
        ${formatExpiry(d.license_expiry_date)}${expired ? '<span class="expiry-tag">EXPIRED</span>' : ''}
      </td>
      <td>${escapeHTML(d.contact_number)}</td>
      <td>${Number.isFinite(completionValue) ? `${completionValue}%` : '—'}</td>
      <td><span class="driver-status available">${Number.isFinite(safetyValue) ? `${safetyValue}%` : '—'}</span></td>
      <td><span class="driver-status ${statusClass}">${escapeHTML(statusLabel)}</span></td>
      <td>
        <div class="row-actions">
          <button title="Edit" data-edit-id="${escapeHTML(d.id)}"><i class="fa-solid fa-pen"></i></button>
          <button title="Delete" class="delete-btn" data-delete-id="${escapeHTML(d.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/* ---------- Add / Edit modal ---------- */
function openDriverModal(driverId) {
  const overlay = document.getElementById('driverModalOverlay');
  const form = document.getElementById('driverForm');
  const title = document.getElementById('driverModalTitle');
  const error = document.getElementById('driverFormError');

  form.reset();
  error.textContent = '';

  if (driverId) {
    const driver = allDrivers.find((d) => String(d.id) === String(driverId));
    title.textContent = 'Edit Driver';
    if (driver) {
      document.getElementById('driverId').value = driver.id;
      document.getElementById('driverName').value = driver.name || '';
      document.getElementById('licenseNo').value = driver.license_number || '';
      document.getElementById('licenseCategory').value = driver.license_category || 'LMV';
      document.getElementById('licenseExpiry').value = driver.license_expiry_date || '';
      document.getElementById('contact').value = driver.contact_number || '';
      document.getElementById('tripCompletion').value = driver.trip_completion_percentage ?? 0;
      document.getElementById('safetyScore').value = driver.safety_score ?? 0;
      document.getElementById('driverStatus').value = String(driver.status || 'available');
    }
  } else {
    title.textContent = 'Add Driver';
    document.getElementById('driverId').value = '';
  }

  overlay.classList.add('open');
}

function closeDriverModal() {
  document.getElementById('driverModalOverlay').classList.remove('open');
}

async function handleDriverFormSubmit(e) {
  e.preventDefault();

  const error = document.getElementById('driverFormError');
  const saveBtn = document.getElementById('saveDriverBtn');
  const driverId = document.getElementById('driverId').value;

  const payload = {
    name: document.getElementById('driverName').value.trim(),
    licenseNumber: document.getElementById('licenseNo').value.trim(),
    licenseNo: document.getElementById('licenseNo').value.trim(),
    licenseCategory: document.getElementById('licenseCategory').value,
    licenseExpiry: document.getElementById('licenseExpiry').value,
    contact: document.getElementById('contact').value.trim(),
    contactNumber: document.getElementById('contact').value.trim(),
    safetyScore: Number(document.getElementById('safetyScore').value),
    safety: Number(document.getElementById('safetyScore').value),
    tripCompletionPercentage: Number(document.getElementById('tripCompletion').value),
    tripCompletion: Number(document.getElementById('tripCompletion').value),
    status: document.getElementById('driverStatus').value,
  };

  error.textContent = '';
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (driverId) {
      await fetchJSON(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetchJSON('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    closeDriverModal();
    loadDrivers();
  } catch (err) {
    console.error('Failed to save driver:', err);
    error.textContent = err.message || 'Could not save driver. Please try again.';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Driver';
  }
}

async function handleDeleteDriver(driverId) {
  const driver = allDrivers.find((d) => String(d.id) === String(driverId));
  const label = driver ? driver.name : 'this driver';

  if (!confirm(`Remove ${label} from the registry?`)) return;

  try {
    await fetchJSON(`/api/drivers/${driverId}`, { method: 'DELETE' });
    loadDrivers();
  } catch (err) {
    console.error('Failed to delete driver:', err);
    alert(err.message || 'Could not delete driver. Please try again.');
  }
}
