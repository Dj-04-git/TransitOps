/* ============================================
   TransitOps — Fleet (Vehicle Registry) loader
   Fetches from /api/vehicles. No values are
   hardcoded here — everything renders from the
   API response.

   NOTE: until vehicleController.js actually
   queries the DB (it currently returns
   { success: true, message: "Not implemented yet" }
   with no `data` field), the table below will
   correctly fall back to its empty state. Once the
   controller returns real fields, update the
   KEY NAMES marked "adjust to match your API" —
   nothing else needs to change.
   ============================================ */

let allVehicles = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadVehicles();

  document.getElementById('filterVehicleType').addEventListener('change', renderFilteredVehicles);
  document.getElementById('filterStatus').addEventListener('change', renderFilteredVehicles);
  document.getElementById('regSearch').addEventListener('input', renderFilteredVehicles);

  document.getElementById('addVehicleBtn').addEventListener('click', () => openVehicleModal());
  document.getElementById('closeVehicleModal').addEventListener('click', closeVehicleModal);
  document.getElementById('cancelVehicleModal').addEventListener('click', closeVehicleModal);
  document.getElementById('vehicleModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'vehicleModalOverlay') closeVehicleModal();
  });
  document.getElementById('vehicleForm').addEventListener('submit', handleVehicleFormSubmit);
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

/* ---------- Vehicle registry ---------- */

async function loadVehicles() {
  const tbody = document.getElementById('vehiclesBody');

  try {
    const json = await fetchJSON('/api/vehicles');

    // adjust to match your API: expects { success, data: { vehicles: [...] } }
    const vehicles = (json && json.data && json.data.vehicles) || [];

    allVehicles = vehicles;
    renderFilteredVehicles();
  } catch (err) {
    console.error('Failed to load vehicles:', err);
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">Couldn't load vehicles right now.</td></tr>`;
  }
}

function renderFilteredVehicles() {
  const tbody = document.getElementById('vehiclesBody');
  const type = document.getElementById('filterVehicleType').value;
  const status = document.getElementById('filterStatus').value;
  const regQuery = document.getElementById('regSearch').value.trim().toLowerCase();

  const filtered = allVehicles.filter((v) => {
    const matchesType = type === 'all' || v.type === type;
    const matchesStatus = status === 'all' || v.status === status;
    const matchesReg = !regQuery || String(v.regNo || '').toLowerCase().includes(regQuery);
    return matchesType && matchesStatus && matchesReg;
  });

  if (!allVehicles.length) {
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">No vehicles registered yet. Click "Add Vehicle" to get started.</td></tr>`;
    return;
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">No vehicles match your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(vehicleRowHTML).join('');

  tbody.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => openVehicleModal(btn.dataset.editId));
  });
  tbody.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteVehicle(btn.dataset.deleteId));
  });
}

function vehicleRowHTML(v) {
  const statusClass = String(v.status || '').toLowerCase().replace(/\s+/g, '-');

  return `
    <tr>
      <td>${escapeHTML(v.regNo)}</td>
      <td>${escapeHTML(v.nameModel)}</td>
      <td>${escapeHTML(v.type)}</td>
      <td>${escapeHTML(v.capacity)}</td>
      <td>${v.odometer != null ? escapeHTML(Number(v.odometer).toLocaleString()) : '—'}</td>
      <td>${v.acqCost != null ? escapeHTML(Number(v.acqCost).toLocaleString()) : '—'}</td>
      <td><span class="vehicle-status ${statusClass}">${escapeHTML(v.status)}</span></td>
      <td>
        <div class="row-actions">
          <button title="Edit" data-edit-id="${escapeHTML(v.id)}"><i class="fa-solid fa-pen"></i></button>
          <button title="Delete" class="delete-btn" data-delete-id="${escapeHTML(v.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/* ---------- Add / Edit modal ---------- */

function openVehicleModal(vehicleId) {
  const overlay = document.getElementById('vehicleModalOverlay');
  const form = document.getElementById('vehicleForm');
  const title = document.getElementById('vehicleModalTitle');
  const error = document.getElementById('vehicleFormError');

  form.reset();
  error.textContent = '';

  if (vehicleId) {
    const vehicle = allVehicles.find((v) => String(v.id) === String(vehicleId));
    title.textContent = 'Edit Vehicle';
    if (vehicle) {
      document.getElementById('vehicleId').value = vehicle.id;
      document.getElementById('regNo').value = vehicle.regNo || '';
      document.getElementById('nameModel').value = vehicle.nameModel || '';
      document.getElementById('vehicleType').value = vehicle.type || 'Van';
      document.getElementById('capacity').value = vehicle.capacity || '';
      document.getElementById('odometer').value = vehicle.odometer ?? '';
      document.getElementById('acqCost').value = vehicle.acqCost ?? '';
      document.getElementById('vehicleStatus').value = vehicle.status || 'Available';
    }
  } else {
    title.textContent = 'Add Vehicle';
    document.getElementById('vehicleId').value = '';
  }

  overlay.classList.add('open');
}

function closeVehicleModal() {
  document.getElementById('vehicleModalOverlay').classList.remove('open');
}

async function handleVehicleFormSubmit(e) {
  e.preventDefault();

  const error = document.getElementById('vehicleFormError');
  const saveBtn = document.getElementById('saveVehicleBtn');
  const vehicleId = document.getElementById('vehicleId').value;

  const payload = {
    regNo: document.getElementById('regNo').value.trim(),
    nameModel: document.getElementById('nameModel').value.trim(),
    type: document.getElementById('vehicleType').value,
    capacity: document.getElementById('capacity').value.trim(),
    odometer: Number(document.getElementById('odometer').value) || 0,
    acqCost: Number(document.getElementById('acqCost').value) || 0,
    status: document.getElementById('vehicleStatus').value,
  };

  error.textContent = '';
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (vehicleId) {
      await fetchJSON(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetchJSON('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    closeVehicleModal();
    loadVehicles();
  } catch (err) {
    console.error('Failed to save vehicle:', err);
    error.textContent = err.message || 'Could not save vehicle. Please try again.';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Vehicle';
  }
}

async function handleDeleteVehicle(vehicleId) {
  const vehicle = allVehicles.find((v) => String(v.id) === String(vehicleId));
  const label = vehicle ? vehicle.regNo : 'this vehicle';

  if (!confirm(`Remove ${label} from the registry?`)) return;

  try {
    await fetchJSON(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
    loadVehicles();
  } catch (err) {
    console.error('Failed to delete vehicle:', err);
    alert(err.message || 'Could not delete vehicle. Please try again.');
  }
}
