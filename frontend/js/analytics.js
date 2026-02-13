import {
  apiFetch,
  clearAlert,
  ensureAuth,
  fetchCurrentUser,
  formatMoney,
  setTopbarUser,
  showAlert
} from './core.js';
import { initLayout } from './layout.js';

const shopSelect = document.getElementById('analytics-shop-select');

if (ensureAuth()) {
  initLayout('/analytics.html');
  bootstrap().catch((error) => showAlert('analytics-alert', error.message, 'error'));
}

async function bootstrap() {
  await fetchCurrentUser();
  setTopbarUser();

  const shopsResult = await apiFetch('/shops?limit=100');
  const shops = shopsResult.items || [];

  shopSelect.innerHTML = shops
    .map((shop) => `<option value="${shop._id}">${escapeHtml(shop.name)} (${escapeHtml(shop.location.city)})</option>`)
    .join('');

  const params = new URLSearchParams(window.location.search);
  const selectedFromQuery = params.get('shopId');
  if (selectedFromQuery) {
    shopSelect.value = selectedFromQuery;
  }

  await loadSummary();
  await loadStaffPerformance();
}

async function loadSummary() {
  clearAlert('analytics-alert');
  const shopId = shopSelect.value;
  if (!shopId) {
    document.getElementById('summary-content').innerHTML = '<p class="muted">Please select a shop.</p>';
    return;
  }

  const result = await apiFetch(`/analytics/shops/${shopId}/summary`);
  const summary = result.summary || {};

  const revenue = summary.revenueMetrics?.[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageTicketSize: 0,
    paidRevenue: 0
  };

  document.getElementById('summary-content').innerHTML = `
    <div class="grid cols-4">
      <div class="card"><p class="muted">Total Orders</p><div class="big-number">${revenue.totalOrders || 0}</div></div>
      <div class="card"><p class="muted">Total Revenue</p><div class="big-number">${formatMoney(revenue.totalRevenue || 0)}</div></div>
      <div class="card"><p class="muted">Avg Ticket</p><div class="big-number">${formatMoney(revenue.averageTicketSize || 0)}</div></div>
      <div class="card"><p class="muted">Paid Revenue</p><div class="big-number">${formatMoney(revenue.paidRevenue || 0)}</div></div>
    </div>

    <div class="grid cols-2" style="margin-top:1rem;">
      <div class="card">
        <h4>Order Status Breakdown</h4>
        ${renderBreakdown(summary.orderStatusBreakdown)}
      </div>

      <div class="card">
        <h4>Payment Status Breakdown</h4>
        ${renderBreakdown(summary.paymentStatusBreakdown)}
      </div>

      <div class="card">
        <h4>Top Products</h4>
        ${renderTopProducts(summary.topProducts)}
      </div>

      <div class="card">
        <h4>Hourly Demand</h4>
        ${renderHourly(summary.hourlyDemand)}
      </div>
    </div>`;
}

async function loadStaffPerformance() {
  const result = await apiFetch('/analytics/staff/performance');
  const staff = result.staff || [];

  const table = staff
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.fullName)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${row.totalOrders || 0}</td>
        <td>${formatMoney(row.totalRevenue || 0)}</td>
        <td>${(row.statusStats || []).map((s) => `${s.status}: ${s.count}`).join(' | ') || '-'}</td>
      </tr>`
    )
    .join('');

  document.getElementById('staff-content').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Staff</th><th>Email</th><th>Total Orders</th><th>Total Revenue</th><th>Status Mix</th></tr></thead>
        <tbody>${table || '<tr><td colspan="5" class="muted">No data.</td></tr>'}</tbody>
      </table>
    </div>`;
}

document.getElementById('reload-summary').addEventListener('click', () => {
  loadSummary().catch((error) => showAlert('analytics-alert', error.message, 'error'));
});

document.getElementById('reload-staff').addEventListener('click', () => {
  loadStaffPerformance().catch((error) => showAlert('analytics-alert', error.message, 'error'));
});

function renderBreakdown(rows) {
  if (!rows || !rows.length) {
    return '<p class="muted">No data.</p>';
  }

  return `<ul class="list">${rows.map((item) => `<li>${item._id}: <strong>${item.count}</strong></li>`).join('')}</ul>`;
}

function renderTopProducts(rows) {
  if (!rows || !rows.length) {
    return '<p class="muted">No products yet.</p>';
  }

  return `<ul class="list">${rows
    .map((item) => `<li>${escapeHtml(item._id)} - ${item.totalQuantity} sold (${formatMoney(item.totalSales)})</li>`)
    .join('')}</ul>`;
}

function renderHourly(rows) {
  if (!rows || !rows.length) {
    return '<p class="muted">No hourly data.</p>';
  }

  return `<ul class="list">${rows.map((item) => `<li>${item._id}:00 - ${item.orderCount} orders</li>`).join('')}</ul>`;
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
