let availableVehicles = [];
let allTrips = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSession();
  loadAvailableVehicles();
  loadAvailableDrivers();
  loadTrips();
  setLifecycleStep('Draft');

  document.getElementById('createTripBtn').addEventListener('click', openTripModal);
  document.getElementById('closeTripModal').addEventListener('click', closeTripModal);
  document.getElementById('cancelTripFormBtn').addEventListener('click', closeTripModal);
  document.getElementById('tripModalOverlay').addEventListener('click', (event) => {
    if (event.target.id === 'tripModalOverlay') closeTripModal();
  });

  document.getElementById('tripVehicle').addEventListener('change', updateCapacityCheck);
  document.getElementById('cargoWeight').addEventListener('input', updateCapacityCheck);
  document.getElementById('createTripForm').addEventListener('submit', handleCreateTrip);
  document.getElementById('tripSearch').addEventListener('input', renderTrips);
});

/* ---------- Helpers ---------- */

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((body && (body.message || body.error)) || `Request failed: ${res.status}`);
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
    const json = await fetchJSON('/api/vehicles/available');
    const vehicles = (json?.data?.vehicles || json.vehicles || []).filter((vehicle) => String(vehicle.status).toLowerCase() === 'available');

    availableVehicles = vehicles;

    if (!vehicles.length) {
      select.innerHTML = '<option value="">No available vehicles</option>';
      return;
    }

    select.innerHTML = vehicles.map((v) => `
      <option value="${escapeHTML(v.id)}" data-capacity="${parseCapacityKg(v.load_capacity || v.capacity) ?? ''}">
        ${escapeHTML(v.registration_number || v.regNo)} — ${escapeHTML(v.load_capacity || v.capacity)} capacity
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
    const json = await fetchJSON('/api/drivers/available');
    const drivers = json?.data?.drivers || json.drivers || [];

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

function openTripModal() {
  document.getElementById('tripModalOverlay').classList.add('open');
}

function closeTripModal() {
  document.getElementById('tripModalOverlay').classList.remove('open');
}

async function handleCreateTrip(e) {
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
  dispatchBtn.textContent = 'Creating…';

  try {
    await fetchJSON('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    closeTripModal();
    resetTripForm();
    await Promise.all([loadAvailableVehicles(), loadAvailableDrivers()]);
    await loadTrips();
  } catch (err) {
    console.error('Failed to create trip:', err);
    error.textContent = err.message || 'Could not create trip. Please try again.';
    dispatchBtn.disabled = false;
    dispatchBtn.textContent = 'Create Trip';
  }
}

function resetTripForm() {
  document.getElementById('createTripForm').reset();
  document.getElementById('tripFormError').textContent = '';
  document.getElementById('capacityBox').hidden = true;
  document.getElementById('dispatchTripBtn').disabled = true;
  document.getElementById('dispatchTripBtn').textContent = 'Create Trip';
  setLifecycleStep('Draft');
}

/* ---------- Live board ---------- */

async function loadTrips() {
  const board = document.getElementById('liveBoard');

  try {
    const json = await fetchJSON('/api/trips/all');
    const trips = json?.data?.trips || json.trips || [];

    allTrips = trips;
    renderTrips();
  } catch (err) {
    console.error('Failed to load trips:', err);
    board.innerHTML = `<div class="status-empty">Couldn't load the live board right now.</div>`;
  }
}

function renderTrips() {
  const board = document.getElementById('liveBoard');
  const chip = document.getElementById('tripCountChip');
  const query = document.getElementById('tripSearch').value.trim().toLowerCase();

  const trips = allTrips.filter((trip) => {
    if (!query) return true;
    return [trip.id, trip.source, trip.destination, trip.vehicle_label, trip.driver_name, trip.status]
      .some((value) => String(value ?? '').toLowerCase().includes(query));
  });

  chip.textContent = `${trips.length} trip${trips.length === 1 ? '' : 's'}`;

  if (!trips.length) {
    board.innerHTML = `<div class="status-empty">No trips yet. Use Create Trip to add the first one.</div>`;
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
}

function tripCardHTML(trip) {
  const status = String(trip.status || '').toLowerCase();
  const statusClass = status.replace(/\s+/g, '-');
  const assignment = trip.vehicle_label
    ? `${escapeHTML(trip.vehicle_label)}${trip.driver_name ? ' / ' + escapeHTML(trip.driver_name) : ''}`
    : 'Unassigned';

  let actions = '';
  if (status === 'draft') {
    actions = `
      <button data-dispatch-id="${escapeHTML(trip.id)}">Dispatch</button>
      <button class="cancel-action" data-cancel-id="${escapeHTML(trip.id)}">Cancel</button>
    `;
  } else if (status === 'dispatched') {
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
        <div class="trip-card-meta">${escapeHTML(trip.planned_distance_km ?? '—')} km · ${escapeHTML(trip.cargo_weight_kg ?? '—')} kg</div>
        ${actions ? `<div class="trip-card-actions">${actions}</div>` : ''}
      </div>
      <div class="trip-card-side">
        <div class="trip-card-assign">${assignment}</div>
        <span class="trip-status-pill ${statusClass}">${escapeHTML(formatStatusLabel(status))}</span>
        <div class="trip-card-note">${escapeHTML(trip.note || trip.eta || '')}</div>
      </div>
    </div>
  `;
}

function formatStatusLabel(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function handleTripAction(tripId, action) {
  try {
    await fetchJSON(`/api/trips/${tripId}/${action}`, { method: 'PATCH' });
    await Promise.all([loadAvailableVehicles(), loadAvailableDrivers()]);
    loadTrips();
  } catch (err) {
    console.error(`Failed to ${action} trip:`, err);
    alert(err.message || `Could not ${action} the trip. Please try again.`);
  }
}
