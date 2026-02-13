import {
  apiFetch,
  clearAlert,
  ensureAuth,
  fetchCurrentUser,
  formatDate,
  formatMoney,
  getStoredUser,
  setTopbarUser,
  showAlert
} from './core.js';
import { initLayout } from './layout.js';

const createOrderForm = document.getElementById('create-order-form');
const ordersContainer = document.getElementById('orders-container');
const shopFilterSelect = document.getElementById('order-filter-shop');
const seedDemoButton = document.getElementById('seed-demo-data');

if (ensureAuth()) {
  initLayout('/orders.html');
  bootstrap().catch((error) => showAlert('orders-alert', error.message, 'error'));
}

let shops = [];
let orders = [];
let isAdmin = false;
let currentUserId = '';

const DEMO_SHOPS = [
  {
    name: 'Downtown Brew Bar',
    description: 'Specialty coffee bar with fast takeaway and breakfast items.',
    city: 'Almaty',
    address: 'Abay Ave 25',
    status: 'open',
    menuCategories: ['espresso', 'filter coffee', 'pastry'],
    tags: ['downtown', 'morning']
  },
  {
    name: 'Campus Roast Lab',
    description: 'Student-friendly coffee spot focused on espresso drinks and cold brew.',
    city: 'Almaty',
    address: 'Satbayev St 90',
    status: 'open',
    menuCategories: ['espresso', 'cold brew', 'desserts'],
    tags: ['campus', 'study']
  }
];

const DEMO_ORDER_TEMPLATES = [
  {
    customerName: 'Emma Johnson',
    status: 'served',
    paymentStatus: 'paid',
    orderType: 'takeaway',
    tableNumber: '',
    discountAmount: 0,
    taxAmount: 0.7,
    items: [
      {
        menuItemName: 'Cappuccino',
        size: 'medium',
        quantity: 1,
        unitPrice: 4.5,
        modifiers: ['oat milk'],
        itemStatus: 'served'
      },
      {
        menuItemName: 'Flat White',
        size: 'small',
        quantity: 1,
        unitPrice: 4.0,
        modifiers: [],
        itemStatus: 'served'
      }
    ]
  },
  {
    customerName: 'Noah Miller',
    status: 'preparing',
    paymentStatus: 'unpaid',
    orderType: 'dine_in',
    tableNumber: 'A2',
    discountAmount: 0,
    taxAmount: 0.85,
    items: [
      {
        menuItemName: 'Iced Latte',
        size: 'large',
        quantity: 1,
        unitPrice: 5.25,
        modifiers: ['extra shot', 'less ice'],
        itemStatus: 'in_preparation'
      },
      {
        menuItemName: 'Americano',
        size: 'medium',
        quantity: 1,
        unitPrice: 3.25,
        modifiers: [],
        itemStatus: 'queued'
      }
    ]
  }
];

async function bootstrap() {
  await fetchCurrentUser();
  const user = getStoredUser();
  isAdmin = user?.role === 'admin';
  currentUserId = String(user?._id || user?.id || '');
  setTopbarUser();

  if (!isAdmin && seedDemoButton) {
    seedDemoButton.classList.add('hidden');
  }

  await loadShops();
  await loadOrders();

  const params = new URLSearchParams(window.location.search);
  const shopIdFromQuery = params.get('shopId');
  if (shopIdFromQuery) {
    document.getElementById('create-order-shop').value = shopIdFromQuery;
    shopFilterSelect.value = shopIdFromQuery;
    await loadOrders();
  }
}

if (seedDemoButton) {
  seedDemoButton.addEventListener('click', () => {
    seedDemoData().catch((error) => showAlert('orders-alert', error.message, 'error'));
  });
}

async function loadShops() {
  const result = await apiFetch('/shops?limit=100');
  shops = result.items || [];

  const orderableShops = shops.filter((shop) => canOrderFromShop(shop));
  const options = orderableShops
    .map((shop) => `<option value="${shop._id}">${escapeHtml(shop.name)} (${escapeHtml(shop.location.city)})</option>`)
    .join('');

  document.getElementById('create-order-shop').innerHTML = `<option value="">Select shop</option>${options}`;
  shopFilterSelect.innerHTML = `<option value="">All shops</option>${options}`;

  if (!orderableShops.length) {
    showAlert('orders-alert', 'No eligible shops to order from.', 'error');
  }
}

async function loadOrders() {
  clearAlert('orders-alert');

  const params = new URLSearchParams({ limit: '100' });
  const shop = shopFilterSelect.value;
  const status = document.getElementById('order-filter-status').value;
  const paymentStatus = document.getElementById('order-filter-payment').value;

  if (shop) {
    params.set('shop', shop);
  }

  if (status) {
    params.set('status', status);
  }

  if (paymentStatus) {
    params.set('paymentStatus', paymentStatus);
  }

  const result = await apiFetch(`/orders?${params.toString()}`);
  orders = result.items || [];
  renderOrders();
}

function renderOrders() {
  if (!orders.length) {
    ordersContainer.innerHTML = '<p class="muted">No orders found for selected filter.</p>';
    return;
  }

  ordersContainer.innerHTML = orders
    .map((order) => {
      const itemsRows = (order.items || [])
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.menuItemName)}</td>
            <td>${item.size}</td>
            <td>${item.quantity}</td>
            <td>${formatMoney(item.unitPrice, order.currency || 'USD')}</td>
            <td>${item.itemStatus}</td>
            <td>
              <div class="actions">
                <button class="btn secondary" data-action="adjust-qty" data-order-id="${order._id}" data-item-id="${item._id}" data-delta="1">+1</button>
                <button class="btn secondary" data-action="adjust-qty" data-order-id="${order._id}" data-item-id="${item._id}" data-delta="-1">-1</button>
                <select id="item-status-${order._id}-${item._id}">
                  ${statusOption('queued', item.itemStatus)}
                  ${statusOption('in_preparation', item.itemStatus)}
                  ${statusOption('ready', item.itemStatus)}
                  ${statusOption('served', item.itemStatus)}
                </select>
                <button class="btn ok" data-action="set-item-status" data-order-id="${order._id}" data-item-id="${item._id}">Save</button>
                <button class="btn danger" data-action="remove-item" data-order-id="${order._id}" data-item-id="${item._id}">Remove</button>
              </div>
            </td>
          </tr>`
        )
        .join('');

      const notesList = (order.notes || [])
        .map(
          (note) => `
          <li>
            ${escapeHtml(note.text)}
            <span class="muted">(${escapeHtml(note.author?.fullName || 'staff')})</span>
            <button class="btn danger" data-action="remove-note" data-order-id="${order._id}" data-note-id="${note._id}">Delete</button>
          </li>`
        )
        .join('');

      return `
      <article class="card">
        <h3>${escapeHtml(order.customerName)} <span class="status-chip">${order.status}</span></h3>
        <p class="muted">Shop: ${escapeHtml(order.shop?.name || '-')} | Payment: ${order.paymentStatus} | Created: ${formatDate(order.createdAt)}</p>

        <div class="grid cols-4">
          <label>Status
            <select id="order-status-${order._id}">
              ${statusOption('pending', order.status)}
              ${statusOption('preparing', order.status)}
              ${statusOption('served', order.status)}
              ${statusOption('cancelled', order.status)}
            </select>
          </label>
          <label>Payment
            <select id="order-payment-${order._id}">
              ${statusOption('unpaid', order.paymentStatus)}
              ${statusOption('paid', order.paymentStatus)}
              ${statusOption('refunded', order.paymentStatus)}
            </select>
          </label>
          <label>Discount
            <input type="number" min="0" step="0.01" id="order-discount-${order._id}" value="${Number(order.discountAmount || 0)}" />
          </label>
          <label>Tax
            <input type="number" min="0" step="0.01" id="order-tax-${order._id}" value="${Number(order.taxAmount || 0)}" />
          </label>
        </div>

        <div class="actions">
          <button class="btn" data-action="save-order" data-order-id="${order._id}">Save Order</button>
          <button class="btn danger" data-action="delete-order" data-order-id="${order._id}">Delete Order</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>${itemsRows || '<tr><td colspan="6" class="muted">No items yet.</td></tr>'}</tbody>
          </table>
        </div>

        <div class="grid cols-4">
          <label>Menu Item
            <input id="add-item-name-${order._id}" placeholder="Latte" />
          </label>
          <label>Size
            <select id="add-item-size-${order._id}">
              <option value="small">small</option>
              <option value="medium" selected>medium</option>
              <option value="large">large</option>
            </select>
          </label>
          <label>Quantity
            <input type="number" min="1" value="1" id="add-item-qty-${order._id}" />
          </label>
          <label>Unit Price
            <input type="number" min="0" step="0.01" value="4.50" id="add-item-price-${order._id}" />
          </label>
        </div>

        <label>Modifiers (comma separated)
          <input id="add-item-modifiers-${order._id}" placeholder="oat milk, extra shot" />
        </label>

        <div class="actions">
          <button class="btn ok" data-action="add-item" data-order-id="${order._id}">Add Item</button>
        </div>

        <h4>Order Notes</h4>
        <ul class="list">${notesList || '<li class="muted">No notes yet.</li>'}</ul>

        <div class="actions">
          <input id="order-note-${order._id}" placeholder="Write note..." style="flex:1; min-width:250px;" />
          <button class="btn secondary" data-action="add-note" data-order-id="${order._id}">Add Note</button>
        </div>

        <p class="muted">Subtotal: ${formatMoney(order.subtotal, order.currency)} | Total: ${formatMoney(order.totalAmount, order.currency)}</p>
      </article>`;
    })
    .join('');
}

createOrderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert('orders-alert');

  const payload = {
    shop: document.getElementById('create-order-shop').value,
    customerName: document.getElementById('create-order-customer').value.trim(),
    orderType: document.getElementById('create-order-type').value,
    paymentStatus: document.getElementById('create-order-payment').value,
    tableNumber: document.getElementById('create-order-table').value.trim(),
    discountAmount: Number(document.getElementById('create-order-discount').value || 0),
    taxAmount: Number(document.getElementById('create-order-tax').value || 0)
  };

  try {
    await apiFetch('/orders', { method: 'POST', body: payload });
    createOrderForm.reset();
    showAlert('orders-alert', 'Order created.', 'success');
    await loadOrders();
  } catch (error) {
    showAlert('orders-alert', error.message, 'error');
  }
});

ordersContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const { action, orderId, itemId, delta, noteId } = button.dataset;

  try {
    if (action === 'save-order') {
      const payload = {
        status: document.getElementById(`order-status-${orderId}`).value,
        paymentStatus: document.getElementById(`order-payment-${orderId}`).value,
        discountAmount: Number(document.getElementById(`order-discount-${orderId}`).value || 0),
        taxAmount: Number(document.getElementById(`order-tax-${orderId}`).value || 0)
      };

      await apiFetch(`/orders/${orderId}`, { method: 'PATCH', body: payload });
      showAlert('orders-alert', 'Order updated.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'delete-order') {
      if (!window.confirm('Delete this order?')) {
        return;
      }

      await apiFetch(`/orders/${orderId}`, { method: 'DELETE' });
      showAlert('orders-alert', 'Order deleted.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'add-item') {
      const payload = {
        menuItemName: document.getElementById(`add-item-name-${orderId}`).value.trim(),
        size: document.getElementById(`add-item-size-${orderId}`).value,
        quantity: Number(document.getElementById(`add-item-qty-${orderId}`).value || 1),
        unitPrice: Number(document.getElementById(`add-item-price-${orderId}`).value || 0),
        modifiers: splitComma(document.getElementById(`add-item-modifiers-${orderId}`).value)
      };

      await apiFetch(`/orders/${orderId}/items`, { method: 'POST', body: payload });
      showAlert('orders-alert', 'Item added to order.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'adjust-qty') {
      await apiFetch(`/orders/${orderId}/items/${itemId}/quantity`, {
        method: 'PATCH',
        body: { delta: Number(delta) }
      });
      showAlert('orders-alert', 'Item quantity updated.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'set-item-status') {
      const status = document.getElementById(`item-status-${orderId}-${itemId}`).value;
      await apiFetch(`/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        body: { itemStatus: status }
      });
      showAlert('orders-alert', 'Item status updated.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'remove-item') {
      await apiFetch(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE' });
      showAlert('orders-alert', 'Item removed.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'add-note') {
      const text = document.getElementById(`order-note-${orderId}`).value.trim();
      await apiFetch(`/orders/${orderId}/notes`, { method: 'POST', body: { text } });
      showAlert('orders-alert', 'Note added.', 'success');
      await loadOrders();
      return;
    }

    if (action === 'remove-note') {
      await apiFetch(`/orders/${orderId}/notes/${noteId}`, { method: 'DELETE' });
      showAlert('orders-alert', 'Note removed.', 'success');
      await loadOrders();
    }
  } catch (error) {
    showAlert('orders-alert', error.message, 'error');
  }
});

document.getElementById('apply-order-filters').addEventListener('click', () => {
  loadOrders().catch((error) => showAlert('orders-alert', error.message, 'error'));
});

async function seedDemoData() {
  clearAlert('orders-alert');

  const initialLabel = seedDemoButton.textContent;
  seedDemoButton.disabled = true;
  seedDemoButton.textContent = 'Loading demo data...';

  let createdShops = 0;
  let createdOrders = 0;

  try {
    let availableShops = shops;

    if (!availableShops.length) {
      for (const payload of DEMO_SHOPS) {
        await apiFetch('/shops', { method: 'POST', body: payload });
        createdShops += 1;
      }
      await loadShops();
      availableShops = shops;
    }

    if (!availableShops.length) {
      throw new Error('Cannot seed demo data because no shops are available.');
    }

    const existingOrdersResult = await apiFetch('/orders?limit=100');
    const existingOrders = existingOrdersResult.items || [];
    const existingOrderCountByShop = new Map();

    for (const order of existingOrders) {
      const shopId = order.shop?._id || order.shop;
      if (!shopId) {
        continue;
      }
      existingOrderCountByShop.set(shopId, (existingOrderCountByShop.get(shopId) || 0) + 1);
    }

    for (const shop of availableShops) {
      const currentCount = existingOrderCountByShop.get(shop._id) || 0;
      const missingCount = Math.max(2 - currentCount, 0);

      for (let i = 0; i < missingCount && i < DEMO_ORDER_TEMPLATES.length; i += 1) {
        await apiFetch('/orders', {
          method: 'POST',
          body: buildDemoOrderPayload(shop._id, DEMO_ORDER_TEMPLATES[i])
        });
        createdOrders += 1;
      }
    }

    await loadOrders();

    if (!createdShops && !createdOrders) {
      showAlert('orders-alert', 'Demo data already exists. Nothing new was added.', 'success');
    } else {
      showAlert(
        'orders-alert',
        `Demo data loaded: ${createdShops} shops and ${createdOrders} orders created.`,
        'success'
      );
    }
  } finally {
    seedDemoButton.disabled = false;
    seedDemoButton.textContent = initialLabel;
  }
}

function statusOption(value, current) {
  return `<option value="${value}" ${value === current ? 'selected' : ''}>${value}</option>`;
}

function buildDemoOrderPayload(shopId, template) {
  return {
    shop: shopId,
    customerName: template.customerName,
    status: template.status,
    paymentStatus: template.paymentStatus,
    orderType: template.orderType,
    tableNumber: template.tableNumber,
    discountAmount: Number(template.discountAmount || 0),
    taxAmount: Number(template.taxAmount || 0),
    items: (template.items || []).map((item) => ({
      menuItemName: item.menuItemName,
      size: item.size || 'medium',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      modifiers: item.modifiers || [],
      itemStatus: item.itemStatus || 'queued'
    }))
  };
}

function splitComma(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function canOrderFromShop(shop) {
  if (!shop || shop.archived || shop.status !== 'open') {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  const ownerId = String(shop.owner?._id || shop.owner || '');
  return ownerId !== currentUserId;
}
