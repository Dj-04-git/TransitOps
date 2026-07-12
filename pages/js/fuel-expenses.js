/* ============================================
   TransitOps — Fuel & Expenses page loader
   Fetches from /api/fuel, /api/expenses,
   /api/maintenance (for the cost total), and
   /api/vehicles + /api/trips (for the form selects).
   No values are hardcoded — everything renders
   from the API response.

   ADJUST TO MATCH YOUR API if your endpoint
   paths or field names differ — see the URL
   constants below and the *RowHTML() functions.
   ============================================ */

const VEHICLE_LIST_URL = '/api/vehicles';
const TRIP_LIST_URL = '/api/trips';
const FUEL_URL = '/api/fuel';
const EXPENSE_URL = '/api/expenses';
const MAINTENANCE_URL = '/api/maintenance';

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadVehicleSelect();
  loadTripSelect();
  loadFuelLog();
  loadExpenses();

  document.getElementById('fuelForm').addEventListener('submit', handleCreateFuel);
  document.getElementById('expenseForm').addEventListener('submit', handleCreateExpense);

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('fuelDate').value = today;
  document.getElementById('expenseDate').value = today;
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

// Accepts whichever shape the API actually returns:
// an array, { data: [...] }, { data: { <key>: [...] } }, or { <key>: [...] }
function extractList(json, key) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (json.data && Array.isArray(json.data[key])) return json.data[key];
  if (Array.isArray(json[key])) return json[key];
  return [];
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHTML(value);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function sumBy(list, getValue) {
  return (list || []).reduce((total, item) => total + (Number(getValue(item)) || 0), 0);
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

/* ---------- Selects for both forms ---------- */

async function loadVehicleSelect() {
  const fuelSelect = document.getElementById('fuelVehicleSelect');
  const expenseSelect = document.getElementById('expenseVehicleSelect');

  try {
    const json = await fetchJSON(VEHICLE_LIST_URL);
    const vehicles = extractList(json, 'vehicles');

    const html = vehicles.length
      ? vehicles.map(vehicleOptionHTML).join('')
      : '<option value="">No vehicles found</option>';

    fuelSelect.innerHTML = html;
    expenseSelect.innerHTML = html;
  } catch (err) {
    console.error('Failed to load vehicles:', err);
    fuelSelect.innerHTML = '<option value="">Couldn\'t load vehicles</option>';
    expenseSelect.innerHTML = '<option value="">Couldn\'t load vehicles</option>';
  }
}

function vehicleOptionHTML(vehicle) {
  const id = vehicle.id || vehicle._id;
  const label = vehicle.registrationNumber || vehicle.name || id;
  return `<option value="${escapeHTML(id)}">${escapeHTML(label)}</option>`;
}

async function loadTripSelect() {
  const select = document.getElementById('expenseTripSelect');

  try {
    const json = await fetchJSON(TRIP_LIST_URL);
    const trips = extractList(json, 'trips');

    select.innerHTML = trips.length
      ? trips.map(tripOptionHTML).join('')
      : '<option value="">No trips found</option>';
  } catch (err) {
    console.error('Failed to load trips:', err);
    select.innerHTML = '<option value="">Couldn\'t load trips</option>';
  }
}

function tripOptionHTML(trip) {
  const id = trip.id || trip._id;
  const label = trip.reference || trip.code
    || `${trip.source || '—'} → ${trip.destination || '—'}`;
  return `<option value="${escapeHTML(id)}">${escapeHTML(label)}</option>`;
}

/* ---------- Fuel log ---------- */

let fuelRecordsCache = [];

async function loadFuelLog() {
  const tbody = document.getElementById('fuelLogBody');

  try {
    const json = await fetchJSON(FUEL_URL);
    fuelRecordsCache = extractList(json, 'records');

    tbody.innerHTML = fuelRecordsCache.length
      ? fuelRecordsCache.map(fuelRowHTML).join('')
      : `<tr class="table-empty-row"><td colspan="4">No fuel entries yet.</td></tr>`;

    refreshTotalCost();
  } catch (err) {
    console.error('Failed to load fuel log:', err);
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">Couldn't load the fuel log.</td></tr>`;
  }
}

function fuelRowHTML(record) {
  const vehicleLabel = (record.vehicle && (record.vehicle.registrationNumber || record.vehicle.name))
    || record.vehicleName || '—';

  return `
    <tr>
      <td>${escapeHTML(vehicleLabel)}</td>
      <td>${formatDate(record.date)}</td>
      <td>${escapeHTML(record.quantity)} L</td>
      <td>${formatCurrency(record.cost)}</td>
    </tr>
  `;
}

async function handleCreateFuel(e) {
  e.preventDefault();

  const errorBox = document.getElementById('fuelFormError');
  const saveBtn = document.getElementById('fuelSaveBtn');
  errorBox.hidden = true;

  const payload = {
    vehicle: document.getElementById('fuelVehicleSelect').value,
    quantity: Number(document.getElementById('fuelQuantity').value),
    cost: Number(document.getElementById('fuelCost').value),
    date: document.getElementById('fuelDate').value,
  };

  if (!payload.vehicle) {
    errorBox.textContent = 'Select a vehicle before saving.';
    errorBox.hidden = false;
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    await fetchJSON(FUEL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    document.getElementById('fuelForm').reset();
    document.getElementById('fuelDate').value = new Date().toISOString().slice(0, 10);

    await loadFuelLog();
  } catch (err) {
    console.error('Failed to create fuel entry:', err);
    errorBox.textContent = err.message || 'Could not save this entry.';
    errorBox.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

/* ---------- Other expenses ---------- */

async function loadExpenses() {
  const tbody = document.getElementById('expenseLogBody');

  try {
    const json = await fetchJSON(EXPENSE_URL);
    const expenses = extractList(json, 'expenses');

    tbody.innerHTML = expenses.length
      ? expenses.map(expenseRowHTML).join('')
      : `<tr class="table-empty-row"><td colspan="6">No expenses logged yet.</td></tr>`;
  } catch (err) {
    console.error('Failed to load expenses:', err);
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="6">Couldn't load expenses.</td></tr>`;
  }
}

function expenseRowHTML(expense) {
  const tripLabel = (expense.trip && (expense.trip.reference || expense.trip.code))
    || expense.tripLabel || '—';
  const vehicleLabel = (expense.vehicle && (expense.vehicle.registrationNumber || expense.vehicle.name))
    || expense.vehicleName || '—';
  const total = Number(expense.toll || 0) + Number(expense.misc || 0);
  const status = expense.status || 'Pending';
  const statusClass = String(status).toLowerCase().replace(/\s+/g, '-');

  return `
    <tr>
      <td>${escapeHTML(tripLabel)}</td>
      <td>${escapeHTML(vehicleLabel)}</td>
      <td>${formatCurrency(expense.toll)}</td>
      <td>${formatCurrency(expense.misc)}</td>
      <td>${formatCurrency(total)}</td>
      <td><span class="trip-status ${statusClass}">${escapeHTML(status)}</span></td>
    </tr>
  `;
}

async function handleCreateExpense(e) {
  e.preventDefault();

  const errorBox = document.getElementById('expenseFormError');
  const saveBtn = document.getElementById('expenseSaveBtn');
  errorBox.hidden = true;

  const payload = {
    trip: document.getElementById('expenseTripSelect').value,
    vehicle: document.getElementById('expenseVehicleSelect').value,
    toll: Number(document.getElementById('expenseToll').value) || 0,
    misc: Number(document.getElementById('expenseMisc').value) || 0,
    date: document.getElementById('expenseDate').value,
  };

  if (!payload.trip || !payload.vehicle) {
    errorBox.textContent = 'Select a trip and a vehicle before saving.';
    errorBox.hidden = false;
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    await fetchJSON(EXPENSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = new Date().toISOString().slice(0, 10);

    await Promise.all([loadExpenses(), refreshTotalCost()]);
  } catch (err) {
    console.error('Failed to create expense:', err);
    errorBox.textContent = err.message || 'Could not save this expense.';
    errorBox.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

/* ---------- Total operational cost (Fuel + Maintenance) ---------- */

async function refreshTotalCost() {
  const el = document.getElementById('totalOperationalCost');

  try {
    const maintJson = await fetchJSON(MAINTENANCE_URL);
    const maintRecords = extractList(maintJson, 'records');

    const fuelTotal = sumBy(fuelRecordsCache, (r) => r.cost);
    const maintTotal = sumBy(maintRecords, (r) => r.cost);

    el.textContent = formatCurrency(fuelTotal + maintTotal);
  } catch (err) {
    console.error('Failed to compute total operational cost:', err);
    el.textContent = '—';
  }
}
