/* ============================================
   TransitOps — Trip Dispatcher
   Fetches available vehicles/drivers for the
   create-trip form, and trips for the live board.
   No values are hardcoded — everything renders
   from the API responses.

   NOTE: until vehicleController.js, driverController.js,
   and tripController.js actually query the DB (they
   currently return { success: true, message: "Not
   implemented yet" } with no `data` field), the
   selects/board below correctly fall back to their
   empty states. Once the controllers return real
   fields, update the KEY NAMES marked "adjust to
   match your API" — nothing else needs to change.
   ============================================ */

let availableVehicles = [];
let allTrips = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadAvailableVehicles();
  loadAvailableDrivers();
  loadTrips();
  setLifecycleStep('Draft');

  document.getElementById('tripVehicle').addEventListener('change', updateCapacityCheck);
  document.getElementById('cargoWeight').addEventListener('input', updateCapacityCheck);
  document.getElementById('createTripForm').addEventListener('submit', handleCreateAndDispatch);
  document.getElementById('cancelTripFormBtn').addEventListener('click', resetTripForm);
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

// Pulls the first number out of strings like "500 kg" or "5 Ton" (tons converted to kg).
function parseCapacityKg(capacity) {
  if (capacity == null) return null;
  const str = String(capacity).toLowerCase();
  const match = str.match(/[\d.]+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  if (Number.isNaN(num)) return null;
  return str.includes('ton') ? num * 1000 : num;
}

/* ---------- Session / connection status (shared pattern) ---------- */

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

/* ---------- Lifecycle stepper ---------- */

const LIFECYCLE_ORDER = ['Draft', 'Dispatched', 'Completed'];

function setLifecycleStep(status) {
  const steps = document.querySelectorAll('#lifecycleStepper .lifecycle-step');
  const isCancelled = status === 'Cancelled';
  const currentIndex = LIFECYCLE_ORDER.indexOf(status);

  steps.forEach((step) => {
    const stepName = step.dataset.step;
    step.classList.remove('done', 'current', 'cancelled');

    if (stepName === 'Cancelled') {
      if (isCancelled) step.classList.add('cancelled');
      return;
    }

    const stepIndex = LIFECYCLE_ORDER.indexOf(stepName);
    if (isCancelled) return;
    if (stepIndex < currentIndex) step.classList.add('done');
    else if (stepIndex === currentIndex) step.classList.add('current');
  });
}

/* ---------- Available vehicles / drivers (for the create-trip selects) ---------- */

async function loadAvailableVehicles() {
  const select = document.getElementById('tripVehicle');

  try {
    const json = await fetchJSON('/api/vehicles');

    // adjust to match your API: expects { success, data: { vehicles: [...] } }
    const vehicles = ((json && json.data && json.data.vehicles) || [])
      .filter((v) => v.status === 'Available');

    availableVehicles = vehicles;

    if (!vehicles.length) {
      select.innerHTML = '<option value="">No available vehicles</option>';
      return;
    }

    select.innerHTML = vehicles.map((v) => `
      <option value="${escapeHTML(v.id)}" data-capacity="${parseCapacityKg(v.capacity) ?? ''}">
        ${escapeHTML(v.regNo)} — ${escapeHTML(v.capacity)} capacity
      </option>
    `).join('');
  } catch (err) {
    console.error('Failed to load available vehicles:', err);
    select.innerHTML = '<option value="">Couldn\u2019t load vehicles</option>';
  }
}

async function loadAvailableDrivers() {
  const select = document.getElementById('tripDriver');

  try {
    const json = await fetchJSON('/api/drivers');

    // adjust to match your API: expects { success, data: { drivers: [...] } }
    const drivers = ((json && json.data && json.data.drivers) || [])
      .filter((d) => d.status === 'Available');

    if (!drivers.length) {
      select.innerHTML = '<option value="">No available drivers</option>';
      return;
    }

    select.innerHTML = drivers.map((d) => `
      <option value="${escapeHTML(d.id)}">${escapeHTML(d.name)}</option>
    `).join('');
  } catch (err) {
    console.error('Failed to load available drivers:', err);
    select.innerHTML = '<option value="">Couldn\u2019t load drivers</option>';
  }
}

/* ---------- Capacity validation ---------- */

function updateCapacityCheck() {
  const box = document.getElementById('capacityBox');
  const details = document.getElementById('capacityDetails');
  const dispatchBtn = document.getElementById('dispatchTripBtn');

  const vehicleSelect = document.getElementById('tripVehicle');
  const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
  const capacity = selectedOption ? parseFloat(selectedOption.dataset.capacity) : NaN;
  const cargoWeight = parseFloat(document.getElementById('cargoWeight').value);

  if (!selectedOption || !selectedOption.value || Number.isNaN(capacity) || Number.isNaN(cargoWeight)) {
    box.hidden = true;
    box.className = 'capacity-box';
    dispatchBtn.disabled = true;
    dispatchBtn.textContent = 'Dispatch (disabled)';
    return;
  }

  box.hidden = false;

  if (cargoWeight > capacity) {
    const excess = cargoWeight - capacity;
    box.className = 'capacity-box blocked';
    details.innerHTML = `
      Vehicle Capacity: ${capacity} kg<br />
      Cargo Weight: ${cargoWeight} kg
      <div class="capacity-status-line"><i class="fa-solid fa-xmark"></i> Capacity exceeded by ${excess} kg — dispatch blocked</div>
    `;
    dispatchBtn.disabled = true;
    dispatchBtn.textContent = 'Dispatch (disabled)';
  } else {
    box.className = 'capacity-box ok';
    details.innerHTML = `
      Vehicle Capacity: ${capacity} kg<br />
      Cargo Weight: ${cargoWeight} kg
      <div class="capacity-status-line"><i class="fa-solid fa-check"></i> Within capacity — ready to dispatch</div>
    `;
    dispatchBtn.disabled = false;
    dispatchBtn.textContent = 'Dispatch';
  }
}

/* ---------- Create + dispatch trip ---------- */

async function handleCreateAndDispatch(e) {
  e.preventDefault();

  const error = document.getElementById('tripFormError');
  const dispatchBtn = document.getElementById('dispatchTripBtn');

  const payload = {
    source: document.getElementById('tripSource').value.trim(),
    destination: document.getElementById('tripDestination').value.trim(),
    vehicleId: document.getElementById('tripVehicle').value,
    driverId: document.getElementById('tripDriver').value,
    cargoWeight: Number(document.getElementById('cargoWeight').value) || 0,
    distance: Number(document.getElementById('tripDistance').value) || null,
  };

  error.textContent = '';
  dispatchBtn.disabled = true;
  dispatchBtn.textContent = 'Dispatching…';

  try {
    const created = await fetchJSON('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // adjust to match your API: expects { success, data: { trip: { id, ... } } }
    const tripId = created && created.data && created.data.trip && created.data.trip.id;

    if (tripId) {
      await fetchJSON(`/api/trips/${tripId}/dispatch`, { method: 'PATCH' });
    }

    setLifecycleStep('Dispatched');
    resetTripForm();
    loadTrips();
  } catch (err) {
    console.error('Failed to create/dispatch trip:', err);
    error.textContent = err.message || 'Could not dispatch trip. Please try again.';
    dispatchBtn.disabled = false;
    dispatchBtn.textContent = 'Dispatch';
  }
}

function resetTripForm() {
  document.getElementById('createTripForm').reset();
  document.getElementById('tripFormError').textContent = '';
  document.getElementById('capacityBox').hidden = true;
  document.getElementById('dispatchTripBtn').disabled = true;
  document.getElementById('dispatchTripBtn').textContent = 'Dispatch (disabled)';
  setLifecycleStep('Draft');
}

/* ---------- Live board ---------- */

async function loadTrips() {
  const board = document.getElementById('liveBoard');

  try {
    const json = await fetchJSON('/api/trips');

    // adjust to match your API: expects { success, data: { trips: [...] } }
    const trips = (json && json.data && json.data.trips) || [];

    allTrips = trips;

    if (!trips.length) {
      board.innerHTML = `<div class="status-empty">No trips yet. Create one on the left to get started.</div>`;
      return;
    }

    board.innerHTML = trips.map(tripCardHTML).join('');

    board.querySelectorAll('[data-dispatch-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleTripAction(btn.dataset.dispatchId, 'dispatch'));
    });
    board.querySelectorAll('[data-complete-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleTripAction(btn.dataset.completeId, 'complete'));
    });
    board.querySelectorAll('[data-cancel-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleTripAction(btn.dataset.cancelId, 'cancel'));
    });
  } catch (err) {
    console.error('Failed to load trips:', err);
    board.innerHTML = `<div class="status-empty">Couldn't load the live board right now.</div>`;
  }
}

function tripCardHTML(trip) {
  const statusClass = String(trip.status || '').toLowerCase();
  const assignment = trip.vehicleLabel
    ? `${escapeHTML(trip.vehicleLabel)}${trip.driverName ? ' / ' + escapeHTML(trip.driverName) : ''}`
    : 'Unassigned';

  let actions = '';
  if (trip.status === 'Draft') {
    actions = `
      <button data-dispatch-id="${escapeHTML(trip.id)}">Dispatch</button>
      <button class="cancel-action" data-cancel-id="${escapeHTML(trip.id)}">Cancel</button>
    `;
  } else if (trip.status === 'Dispatched') {
    actions = `
      <button data-complete-id="${escapeHTML(trip.id)}">Complete</button>
      <button class="cancel-action" data-cancel-id="${escapeHTML(trip.id)}">Cancel</button>
    `;
  }

  return `
    <div class="trip-card">
      <div class="trip-card-main">
        <div class="trip-card-id">${escapeHTML(trip.id)}</div>
        <div class="trip-card-route">${escapeHTML(trip.source)} → ${escapeHTML(trip.destination)}</div>
        ${actions ? `<div class="trip-card-actions">${actions}</div>` : ''}
      </div>
      <div class="trip-card-side">
        <div class="trip-card-assign">${assignment}</div>
        <span class="trip-status-pill ${statusClass}">${escapeHTML(trip.status)}</span>
        <div class="trip-card-note">${escapeHTML(trip.note || trip.eta || '')}</div>
      </div>
    </div>
  `;
}

async function handleTripAction(tripId, action) {
  try {
    await fetchJSON(`/api/trips/${tripId}/${action}`, { method: 'PATCH' });
    loadTrips();
  } catch (err) {
    console.error(`Failed to ${action} trip:`, err);
    alert(err.message || `Could not ${action} the trip. Please try again.`);
  }
}
