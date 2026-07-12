/* ============================================
   TransitOps — Dashboard data loader
   Fetches from /api/dashboard/kpis, /reports,
   /analytics. No values are hardcoded here —
   everything renders from the API response.

   NOTE: until dashboardController.js actually
   queries the DB (it currently returns
   { success: true, message: "Not implemented yet" }
   with no `data` field), every section below will
   correctly fall back to its empty state. Once the
   controller returns real fields, update the
   KEY NAMES marked "adjust to match your API" —
   nothing else needs to change.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  loadKpis();
  loadReports();
  loadAnalytics();
  loadSession();
});

/* ---------- Helpers ---------- */

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------- Session / connection status ---------- */

function loadSession() {
  const nameEl = document.getElementById('userName');
  const statusEl = document.getElementById('connectionStatus');

  // TODO: replace with your real "current user" source
  // (e.g. decode JWT from localStorage, or an /api/auth/me call)
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

/* ---------- KPI stat cards ---------- */

// label/color are display-only; `key` must match whatever
// field name dashboardController.getKpis() eventually returns
const STAT_DEFS = [
  { key: 'activeVehicles', label: 'Active Vehicles', color: 'blue' },
  { key: 'availableVehicles', label: 'Available Vehicles', color: 'green' },
  { key: 'vehiclesInMaintenance', label: 'Vehicles in Maintenance', color: 'orange' },
  { key: 'activeTrips', label: 'Active Trips', color: 'blue' },
  { key: 'pendingTrips', label: 'Pending Trips', color: 'blue' },
  { key: 'driversOnDuty', label: 'Drivers on Duty', color: 'green' },
  { key: 'fleetUtilization', label: 'Fleet Utilization', color: 'green', suffix: '%' },
];

async function loadKpis() {
  const container = document.getElementById('statCards');

  try {
    const json = await fetchJSON('/api/dashboard/kpis');

    // adjust to match your API: expects { success, data: { ...STAT_DEFS keys } }
    const data = json && json.data;

    container.innerHTML = STAT_DEFS.map((def) => statCardHTML(def, data ? data[def.key] : null)).join('');
  } catch (err) {
    console.error('Failed to load KPIs:', err);
    container.innerHTML = `<div class="status-empty">Couldn't load fleet KPIs right now.</div>`;
  }
}

function statCardHTML(def, value) {
  const hasValue = value !== null && value !== undefined;
  const display = hasValue ? `${value}${def.suffix || ''}` : '—';

  return `
    <div class="stat-card stat-${def.color}">
      <div class="stat-value">${display}</div>
      <div class="stat-label">${escapeHTML(def.label)}</div>
    </div>
  `;
}

/* ---------- Recent trips table ---------- */

async function loadReports() {
  const tbody = document.getElementById('tripsBody');

  try {
    const json = await fetchJSON('/api/dashboard/reports');

    // adjust to match your API: expects { success, data: { trips: [...] } }
    const trips = json && json.data && json.data.trips;

    if (!trips || trips.length === 0) {
      tbody.innerHTML = `<tr class="table-empty-row"><td colspan="5">No trips to show yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = trips.map(tripRowHTML).join('');
  } catch (err) {
    console.error('Failed to load recent trips:', err);
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="5">Couldn't load recent trips.</td></tr>`;
  }
}

function tripRowHTML(trip) {
  const statusClass = String(trip.status || '').toLowerCase().replace(/\s+/g, '-');

  return `
    <tr>
      <td>${escapeHTML(trip.id)}</td>
      <td>${escapeHTML(trip.vehicle)}</td>
      <td>${escapeHTML(trip.driver)}</td>
      <td><span class="trip-status ${statusClass}">${escapeHTML(trip.status)}</span></td>
      <td>${escapeHTML(trip.eta)}</td>
    </tr>
  `;
}

/* ---------- Vehicle status breakdown ---------- */

async function loadAnalytics() {
  const container = document.getElementById('vehicleStatusBars');

  try {
    const json = await fetchJSON('/api/dashboard/analytics');

    // adjust to match your API: expects
    // { success, data: { vehicleStatus: [{ label, value, total, color }] } }
    const rows = json && json.data && json.data.vehicleStatus;

    if (!rows || rows.length === 0) {
      container.innerHTML = `<div class="status-empty">No fleet status data yet.</div>`;
      return;
    }

    container.innerHTML = rows.map(statusBarHTML).join('');
  } catch (err) {
    console.error('Failed to load vehicle status:', err);
    container.innerHTML = `<div class="status-empty">Couldn't load fleet status.</div>`;
  }
}

function statusBarHTML(row) {
  const total = row.total || 1;
  const pct = Math.max(0, Math.min(100, (row.value / total) * 100));
  const color = row.color || 'blue';

  return `
    <div class="status-bar-row">
      <div class="status-bar-label">
        <span>${escapeHTML(row.label)}</span>
        <span class="count">${escapeHTML(row.value)}</span>
      </div>
      <div class="status-bar-track">
        <div class="status-bar-fill ${color}" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}
