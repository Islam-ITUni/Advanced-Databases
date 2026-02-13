import { apiFetch, ensureAuth, fetchCurrentUser, formatDate, setTopbarUser, showAlert } from './core.js';
import { initLayout } from './layout.js';

if (ensureAuth()) {
  initLayout('/dashboard.html');
  bootstrap().catch((error) => {
    showAlert('dashboard-alert', error.message, 'error');
  });
}

async function bootstrap() {
  await fetchCurrentUser();
  setTopbarUser();

  const shopsResult = await apiFetch('/shops?limit=100');
  const ordersResult = await apiFetch('/orders?limit=100');

  const shops = shopsResult.items || [];
  const orders = ordersResult.items || [];

  const now = new Date();
  const todayOrders = orders.filter((order) => {
    const created = new Date(order.createdAt);
    return created.toDateString() === now.toDateString();
  });

  const activeOrders = orders.filter((order) => ['pending', 'preparing'].includes(order.status));
  const openShops = shops.filter((shop) => shop.status === 'open' && !shop.archived);

  document.getElementById('metric-shops').textContent = String(shops.length);
  document.getElementById('metric-open-shops').textContent = String(openShops.length);
  document.getElementById('metric-orders-today').textContent = String(todayOrders.length);
  document.getElementById('metric-active-orders').textContent = String(activeOrders.length);

  renderRecentOrders(orders.slice(0, 6));
  renderShops(shops.slice(0, 6));
}

function renderRecentOrders(orders) {
  const holder = document.getElementById('recent-orders');
  if (!orders.length) {
    holder.innerHTML = '<p class="muted">No orders yet.</p>';
    return;
  }

  holder.innerHTML = orders
    .map(
      (order) => `
      <div class="card">
        <h4>${order.customerName}</h4>
        <p class="muted">Status: ${order.status} | Payment: ${order.paymentStatus}</p>
        <p class="muted">Created: ${formatDate(order.createdAt)}</p>
        <a class="btn secondary" href="/orders.html">Open Orders</a>
      </div>`
    )
    .join('');
}

function renderShops(shops) {
  const holder = document.getElementById('recent-shops');
  if (!shops.length) {
    holder.innerHTML = '<p class="muted">No shops yet.</p>';
    return;
  }

  holder.innerHTML = shops
    .map(
      (shop) => `
      <div class="card">
        <h4>${shop.name}</h4>
        <p class="muted">${shop.location.city}, ${shop.location.address}</p>
        <span class="status-chip">${shop.status}</span>
      </div>`
    )
    .join('');
}
