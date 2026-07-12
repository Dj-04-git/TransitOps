/* ============================================
   TransitOps — Maintenance page loader
   Fetches from /api/maintenance (log) and
   /api/fleet (vehicle list for the form select).
   No values are hardcoded — everything renders
   from the API response.

   ADJUST TO MATCH YOUR API if your endpoint
   paths or field names differ:
     - VEHICLE_LIST_URL
     - SERVICE_LOG_URL
     - field names inside vehicleOptionHTML()
       and serviceLogRowHTML()
   ============================================ */

const VEHICLE_LIST_URL = '/api/fleet?status=Available';
const SERVICE_LOG_URL = '/api/maintenance';

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadVehicles();
  loadServiceLog();

  document.getElementById('maintenanceForm')
    .addEventListener('submit', handleCreateRecord);

  // default the date field to today, without hardcoding a value in HTML
  const dateInput = document.getElementById('serviceDate');
  dateInput.value = new Date().toISOString().slice(0, 10);
});

/* ---------- Helpers ---------- */

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success === false) {
    throw new Error((json && json.message) || `Request failed: ${res.status}`);
  }
  return json;
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/* ---------- Session / connection status (same as dashboard) ---------- */

function loadSession() {
  const nameEl = document.getElementById('userName');
  const statusEl = document.getElementById('connectionStatus');

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

/* ---------- Vehicle select (for logging a new record) ---------- */

async function loadVehicles() {
  const select = document.getElementById('vehicleSelect');

  try {
    const json = await fetchJSON(VEHICLE_LIST_URL);

    // adjust to match your API: expects { success, data: { vehicles: [...] } }
    const vehicles = (json.data && json.data.vehicles) || [];

    if (vehicles.length === 0) {
      select.innerHTML = '<option value="">No available vehicles</option>';
      return;
    }

    select.innerHTML = vehicles.map(vehicleOptionHTML).join('');
  } catch (err) {
    console.error('Failed to load vehicles:', err);
    select.innerHTML = '<option value="">Couldn\'t load vehicles</option>';
  }
}

function vehicleOptionHTML(vehicle) {
  const id = vehicle.id || vehicle._id;
  const label = vehicle.registrationNumber || vehicle.name || id;
  return `<option value="${escapeHTML(id)}">${escapeHTML(label)}</option>`;
}

/* ---------- Service log table ---------- */

async function loadServiceLog() {
  const tbody = document.getElementById('serviceLogBody');

  try {
    const json = await fetchJSON(SERVICE_LOG_URL);

    // adjust to match your API: expects { success, data: { records: [...] } }
    const records = (json.data && json.data.records) || [];

    if (records.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="5">No service records yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(serviceLogRowHTML).join('');

    tbody.querySelectorAll('[data-close-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleCloseRecord(btn.dataset.closeId, btn));
    });
  } catch (err) {
    console.error('Failed to load service log:', err);
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="5">Couldn't load the service log.</td></tr>`;
  }
}

function serviceLogRowHTML(record) {
  const id = record.id || record._id;
  const vehicleLabel = (record.vehicle && (record.vehicle.registrationNumber || record.vehicle.name))
    || record.vehicleName || '—';
  const status = record.status || 'Open';
  const statusClass = String(status).toLowerCase().replace(/\s+/g, '-');
  const isOpen = statusClass === 'open' || statusClass === 'in-shop';

  return `
    <tr>
      <td>${escapeHTML(vehicleLabel)}</td>
      <td>${escapeHTML(record.serviceType)}</td>
      <td>${formatCurrency(record.cost)}</td>
      <td><span class="trip-status ${statusClass}">${escapeHTML(status)}</span></td>
      <td>
        ${isOpen
          ? `<button class="btn-close-record" data-close-id="${escapeHTML(id)}">Close</button>`
          : ''}
      </td>
    </tr>
  `;
}

/* ---------- Create a service record ---------- */

async function handleCreateRecord(e) {
  e.preventDefault();

  const errorBox = document.getElementById('formError');
  const saveBtn = document.getElementById('saveBtn');
  errorBox.hidden = true;

  const payload = {
    vehicle: document.getElementById('vehicleSelect').value,
    serviceType: document.getElementById('serviceType').value.trim(),
    cost: Number(document.getElementById('serviceCost').value),
    date: document.getElementById('serviceDate').value,
    status: document.getElementById('serviceStatus').value,
  };

  if (!payload.vehicle) {
    errorBox.textContent = 'Select a vehicle before saving.';
    errorBox.hidden = false;
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    await fetchJSON(SERVICE_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    document.getElementById('maintenanceForm').reset();
    document.getElementById('serviceDate').value = new Date().toISOString().slice(0, 10);

    await Promise.all([loadServiceLog(), loadVehicles()]);
  } catch (err) {
    console.error('Failed to create service record:', err);
    errorBox.textContent = err.message || 'Could not save this record.';
    errorBox.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

/* ---------- Close a service record ---------- */

async function handleCloseRecord(id, btn) {
  btn.disabled = true;
  btn.textContent = '…';

  try {
    await fetchJSON(`${SERVICE_LOG_URL}/${id}/close`, { method: 'PATCH' });
    await Promise.all([loadServiceLog(), loadVehicles()]);
  } catch (err) {
    console.error('Failed to close service record:', err);
    btn.disabled = false;
    btn.textContent = 'Close';
  }
}
