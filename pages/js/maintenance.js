const VEHICLE_LIST_URL = '/api/vehicles/available';
const SERVICE_LOG_URL = '/api/maintenance';

let maintenanceRecords = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadAvailableVehicles();
  loadServiceLog();

  document.getElementById('createMaintenanceBtn').addEventListener('click', openMaintenanceModal);
  document.getElementById('closeMaintenanceModal').addEventListener('click', closeMaintenanceModal);
  document.getElementById('cancelMaintenanceModal').addEventListener('click', closeMaintenanceModal);
  document.getElementById('maintenanceModalOverlay').addEventListener('click', (event) => {
    if (event.target.id === 'maintenanceModalOverlay') closeMaintenanceModal();
  });

  document.getElementById('maintenanceForm').addEventListener('submit', handleCreateRecord);
  document.getElementById('maintenanceSearch').addEventListener('input', renderServiceLog);
  document.getElementById('serviceDate').value = new Date().toISOString().slice(0, 10);
});

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success === false) {
    throw new Error((json && (json.message || json.error)) || `Request failed: ${res.status}`);
  }
  return json;
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatStatusLabel(status) {
  return String(status ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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

function openMaintenanceModal() {
  document.getElementById('maintenanceModalOverlay').classList.add('open');
}

function closeMaintenanceModal() {
  document.getElementById('maintenanceModalOverlay').classList.remove('open');
}

async function loadAvailableVehicles() {
  const select = document.getElementById('vehicleSelect');

  try {
    const json = await fetchJSON(VEHICLE_LIST_URL);
    const vehicles = json?.data?.vehicles || json.vehicles || [];

    if (!vehicles.length) {
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
  const label = vehicle.registration_number || vehicle.registrationNumber || vehicle.name || id;
  return `<option value="${escapeHTML(id)}">${escapeHTML(label)}</option>`;
}

async function loadServiceLog() {
  try {
    const json = await fetchJSON(SERVICE_LOG_URL);
    maintenanceRecords = json?.data?.records || json.maintenanceLogs || [];
    renderServiceLog();
  } catch (err) {
    console.error('Failed to load service log:', err);
    maintenanceRecords = [];
    renderServiceLog();
  }
}

function renderServiceLog() {
  const tbody = document.getElementById('serviceLogBody');
  const chip = document.getElementById('maintenanceCountChip');
  const query = document.getElementById('maintenanceSearch').value.trim().toLowerCase();

  const records = maintenanceRecords.filter((record) => {
    if (!query) return true;
    return [record.id, record.vehicleName, record.service_type, record.status]
      .some((value) => String(value ?? '').toLowerCase().includes(query));
  });

  chip.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;

  if (!records.length) {
    tbody.innerHTML = '<tr class="table-empty-row"><td colspan="5">No service records yet.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(serviceLogRowHTML).join('');

  tbody.querySelectorAll('[data-close-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleCloseRecord(btn.dataset.closeId, btn));
  });
}

function serviceLogRowHTML(record) {
  const id = record.id || record._id;
  const vehicleLabel = (record.vehicle && (record.vehicle.registration_number || record.vehicle.registrationNumber || record.vehicle.name))
    || record.vehicleName || '—';
  const status = record.status || 'active';
  const statusClass = String(status).toLowerCase().replace(/\s+/g, '-');
  const isOpen = statusClass === 'active' || statusClass === 'open';

  return `
    <tr>
      <td>${escapeHTML(vehicleLabel)}</td>
      <td>${escapeHTML(record.service_type || record.serviceType)}</td>
      <td>${formatCurrency(record.cost)}</td>
      <td><span class="trip-status ${statusClass}">${escapeHTML(formatStatusLabel(status))}</span></td>
      <td>${isOpen ? `<button class="btn-close-record" data-close-id="${escapeHTML(id)}">Close</button>` : ''}</td>
    </tr>
  `;
}

async function handleCreateRecord(e) {
  e.preventDefault();

  const errorBox = document.getElementById('formError');
  const saveBtn = document.getElementById('saveBtn');
  errorBox.hidden = true;

  const payload = {
    vehicle_id: document.getElementById('vehicleSelect').value,
    service_type: document.getElementById('serviceType').value.trim(),
    cost: Number(document.getElementById('serviceCost').value),
    started_at: document.getElementById('serviceDate').value,
    status: document.getElementById('serviceStatus').value,
  };

  if (!payload.vehicle_id) {
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
    closeMaintenanceModal();

    await Promise.all([loadServiceLog(), loadAvailableVehicles()]);
  } catch (err) {
    console.error('Failed to create service record:', err);
    errorBox.textContent = err.message || 'Could not save this record.';
    errorBox.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function handleCloseRecord(id, btn) {
  btn.disabled = true;
  btn.textContent = '…';

  try {
    await fetchJSON(`${SERVICE_LOG_URL}/${id}/close`, { method: 'PATCH' });
    await Promise.all([loadServiceLog(), loadAvailableVehicles()]);
  } catch (err) {
    console.error('Failed to close service record:', err);
    btn.disabled = false;
    btn.textContent = 'Close';
  }
}