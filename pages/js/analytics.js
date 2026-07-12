/* ============================================
   TransitOps — Analytics (Reports & Analytics, PDF §3.8)
   Renders KPIs, charts, and role-specific tables from
   hardcoded sample data. Charts are drawn as inline SVG
   (no external chart library needed). Role gating is
   handled by /js/auth-guard.js via [data-roles].
   ============================================ */

/* ---------- Hardcoded sample data ---------- */

const KPIS = [
  { label: 'Fleet Utilization', value: 78, suffix: '%', color: 'green' },
  { label: 'Avg Fuel Efficiency', value: 11.4, suffix: ' km/L', color: 'blue' },
  { label: 'Operational Cost (30d)', value: '₹4.86L', color: 'orange' },
  { label: 'Fleet ROI', value: 22.5, suffix: '%', color: 'green' },
];

const UTILIZATION = [
  { label: 'Feb', value: 64 },
  { label: 'Mar', value: 69 },
  { label: 'Apr', value: 72 },
  { label: 'May', value: 70 },
  { label: 'Jun', value: 81 },
  { label: 'Jul', value: 78 },
];

const FUEL_EFFICIENCY = [
  { label: 'Van-05', value: 13.2 },
  { label: 'TRK-11', value: 6.8 },
  { label: 'Mini-02', value: 15.6 },
  { label: 'Bus-07', value: 5.4 },
  { label: 'Van-09', value: 12.9 },
];

const COST_SPLIT = [
  { label: 'Fuel', value: 318000, color: '#e8385f' },
  { label: 'Maintenance', value: 168000, color: '#3ab0ff' },
];

// Vehicle ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
const ROI_ROWS = [
  { vehicle: 'Van-05', revenue: 480000, fuel: 62000, maintenance: 28000, acqCost: 620000 },
  { vehicle: 'TRK-11', revenue: 910000, fuel: 176000, maintenance: 94000, acqCost: 1850000 },
  { vehicle: 'Mini-02', revenue: 260000, fuel: 31000, maintenance: 12000, acqCost: 410000 },
  { vehicle: 'Bus-07', revenue: 720000, fuel: 148000, maintenance: 61000, acqCost: 1600000 },
  { vehicle: 'Van-09', revenue: 505000, fuel: 58000, maintenance: 33000, acqCost: 640000 },
];

const SAFETY_ROWS = [
  { driver: 'Alex Mercer', score: 92, expiry: '2027-04-18', status: 'Available' },
  { driver: 'Priya Nair', score: 88, expiry: '2026-08-02', status: 'On Trip' },
  { driver: 'Sam Ortiz', score: 61, expiry: '2026-07-25', status: 'Off Duty' },
  { driver: 'Wei Chen', score: 74, expiry: '2026-07-14', status: 'Suspended' },
];

const DELIVERIES = [
  { trip: 'TRP-2041', route: 'Pune → Mumbai', vehicle: 'Van-05', progress: 72, status: 'On Trip' },
  { trip: 'TRP-2044', route: 'Nashik → Pune', vehicle: 'TRK-11', progress: 40, status: 'On Trip' },
  { trip: 'TRP-2049', route: 'Pune → Surat', vehicle: 'Bus-07', progress: 15, status: 'Dispatched' },
];

/* ---------- Helpers ---------- */

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

function roiPct(row) {
  return ((row.revenue - (row.maintenance + row.fuel)) / row.acqCost) * 100;
}

/* ---------- KPI cards ---------- */

function renderKpis() {
  const el = document.getElementById('analyticsKpis');
  el.innerHTML = KPIS.map((k) => `
    <div class="stat-card stat-${k.color}">
      <div class="stat-value">${escapeHTML(k.value)}${escapeHTML(k.suffix || '')}</div>
      <div class="stat-label">${escapeHTML(k.label)}</div>
    </div>
  `).join('');
}

/* ---------- Bar chart (inline SVG) ---------- */

function renderBarChart(mountId, data, unit) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const W = 520, H = 240, padL = 34, padB = 34, padT = 12, padR = 8;
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const bw = plotW / data.length;

  const gridlines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = padT + plotH * (1 - f);
    return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="grid" />
            <text x="${padL - 6}" y="${y + 3}" class="axis-label" text-anchor="end">${Math.round(max * f)}</text>`;
  }).join('');

  const bars = data.map((d, i) => {
    const bh = (d.value / max) * plotH;
    const x = padL + i * bw + bw * 0.22;
    const w = bw * 0.56;
    const y = padT + plotH - bh;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${bh}" rx="4" class="bar" />
      <text x="${x + w / 2}" y="${y - 6}" class="bar-value" text-anchor="middle">${d.value}</text>
      <text x="${x + w / 2}" y="${H - padB + 16}" class="axis-label" text-anchor="middle">${escapeHTML(d.label)}</text>
    `;
  }).join('');

  mount.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${escapeHTML(unit || '')} bar chart">
      ${gridlines}${bars}
    </svg>`;
}

/* ---------- Donut chart (inline SVG) ---------- */

function renderDonut(mountId, data) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70, C = 90, sw = 26;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  const arcs = data.map((d) => {
    const frac = d.value / total;
    const dash = `${frac * circ} ${circ - frac * circ}`;
    const seg = `<circle cx="${C}" cy="${C}" r="${R}" fill="none"
        stroke="${d.color}" stroke-width="${sw}"
        stroke-dasharray="${dash}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${C} ${C})" />`;
    offset += frac * circ;
    return seg;
  }).join('');

  const legend = data.map((d) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${d.color}"></span>
      <span class="legend-label">${escapeHTML(d.label)}</span>
      <span class="legend-value">${inr(d.value)}</span>
    </div>`).join('');

  mount.innerHTML = `
    <svg viewBox="0 0 180 180" class="donut-svg" role="img" aria-label="Operational cost breakdown">
      ${arcs}
      <text x="${C}" y="${C - 4}" text-anchor="middle" class="donut-total">${inr(total)}</text>
      <text x="${C}" y="${C + 14}" text-anchor="middle" class="donut-caption">total</text>
    </svg>
    <div class="donut-legend">${legend}</div>`;
}

/* ---------- Tables ---------- */

function renderRoi() {
  const body = document.getElementById('roiBody');
  if (!body) return;
  body.innerHTML = ROI_ROWS.map((r) => {
    const pct = roiPct(r);
    const cls = pct >= 0 ? 'roi-pos' : 'roi-neg';
    return `
      <tr>
        <td><strong>${escapeHTML(r.vehicle)}</strong></td>
        <td>${inr(r.revenue)}</td>
        <td>${inr(r.fuel)}</td>
        <td>${inr(r.maintenance)}</td>
        <td>${inr(r.acqCost)}</td>
        <td class="${cls}">${pct.toFixed(1)}%</td>
      </tr>`;
  }).join('');
}

function renderSafety() {
  const body = document.getElementById('safetyBody');
  if (!body) return;
  const today = new Date('2026-07-12');
  body.innerHTML = SAFETY_ROWS.map((d) => {
    const expired = new Date(d.expiry) < today;
    const soon = !expired && (new Date(d.expiry) - today) / 86400000 <= 30;
    const licenseTag = expired
      ? '<span class="trip-status delayed">Expired</span>'
      : soon
      ? '<span class="trip-status draft">Expiring soon</span>'
      : '<span class="trip-status completed">Valid</span>';
    const scoreCls = d.score >= 80 ? 'roi-pos' : d.score >= 65 ? '' : 'roi-neg';
    const statusCls = String(d.status).toLowerCase().replace(/\s+/g, '-');
    return `
      <tr>
        <td><strong>${escapeHTML(d.driver)}</strong></td>
        <td class="${scoreCls}">${d.score}</td>
        <td>${escapeHTML(d.expiry)} ${licenseTag}</td>
        <td><span class="trip-status ${statusCls}">${escapeHTML(d.status)}</span></td>
      </tr>`;
  }).join('');
}

function renderDeliveries() {
  const body = document.getElementById('deliveriesBody');
  if (!body) return;
  body.innerHTML = DELIVERIES.map((t) => {
    const statusCls = String(t.status).toLowerCase().replace(/\s+/g, '-');
    return `
      <tr>
        <td><strong>${escapeHTML(t.trip)}</strong></td>
        <td>${escapeHTML(t.route)}</td>
        <td>${escapeHTML(t.vehicle)}</td>
        <td>
          <div class="mini-track"><div class="mini-fill" style="width:${t.progress}%"></div></div>
          <span class="mini-pct">${t.progress}%</span>
        </td>
        <td><span class="trip-status ${statusCls}">${escapeHTML(t.status)}</span></td>
      </tr>`;
  }).join('');
}

/* ---------- CSV export (PDF §3.8) ---------- */

function exportCsv() {
  const header = ['Vehicle', 'Revenue', 'Fuel', 'Maintenance', 'AcquisitionCost', 'ROI_%'];
  const rows = ROI_ROWS.map((r) => [
    r.vehicle, r.revenue, r.fuel, r.maintenance, r.acqCost, roiPct(r).toFixed(1),
  ]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transitops-vehicle-roi.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderKpis();
  renderBarChart('utilizationChart', UTILIZATION, '%');
  renderBarChart('fuelEfficiencyChart', FUEL_EFFICIENCY, 'km/L');
  renderDonut('costDonut', COST_SPLIT);
  renderRoi();
  renderSafety();
  renderDeliveries();

  const btn = document.getElementById('exportCsvBtn');
  if (btn) btn.addEventListener('click', exportCsv);
});
