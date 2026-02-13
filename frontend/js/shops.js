import {
  apiFetch,
  clearAlert,
  ensureAuth,
  fetchCurrentUser,
  showAlert,
  setTopbarUser
} from './core.js';
import { initLayout } from './layout.js';

const shopsContainer = document.getElementById('shops-container');
const createForm = document.getElementById('create-shop-form');
const includeArchivedWrap = document.getElementById('filter-include-archived-wrap');
const includeArchivedCheckbox = document.getElementById('filter-include-archived');

if (ensureAuth()) {
  initLayout('/shops.html');
  bootstrap().catch((error) => showAlert('shops-alert', error.message, 'error'));
}

let shopsCache = [];
let isAdmin = false;
let currentUserId = '';

async function bootstrap() {
  const me = await fetchCurrentUser();
  isAdmin = me?.role === 'admin';
  currentUserId = String(me?._id || me?.id || '');
  setTopbarUser();
  applyRoleBasedUi();
  await loadShops();
}

function applyRoleBasedUi() {
  if (!includeArchivedWrap) {
    return;
  }

  includeArchivedWrap.classList.toggle('hidden', !isAdmin);
  if (!isAdmin && includeArchivedCheckbox) {
    includeArchivedCheckbox.checked = false;
  }
}

async function loadShops() {
  clearAlert('shops-alert');
  const status = document.getElementById('filter-status').value;
  const search = document.getElementById('filter-search').value.trim();

  const params = new URLSearchParams({ limit: '100' });
  if (status) {
    params.set('status', status);
  }

  if (search) {
    params.set('search', search);
  }

  if (isAdmin && includeArchivedCheckbox?.checked) {
    params.set('includeArchived', 'true');
  }

  const result = await apiFetch(`/shops?${params.toString()}`);
  shopsCache = result.items || [];
  renderShops();
}

function renderShops() {
  if (!shopsCache.length) {
    shopsContainer.innerHTML = '<p class="muted">No shops found for current filters.</p>';
    return;
  }

  shopsContainer.innerHTML = shopsCache
    .map((shop) => {
      const manageable = canManageShop(shop);
      return manageable ? renderManageableShop(shop) : renderReadOnlyShop(shop);
    })
    .join('');
}

function renderReadOnlyShop(shop) {
  return `
    <article class="card" id="shop-${shop._id}">
      <h3>${escapeHtml(shop.name)}</h3>
      <p class="muted">${escapeHtml(shop.description)}</p>
      <p class="muted">${escapeHtml(shop.location.city)}, ${escapeHtml(shop.location.address)}</p>
      <p><span class="status-chip">${shop.status}</span>${shop.archived ? ' <span class="status-chip">archived</span>' : ''}</p>
      <div class="actions">
        ${
          canOrderFromShop(shop)
            ? `<a class="btn" href="/orders.html?shopId=${shop._id}">Order from this shop</a>`
            : '<span class="muted">Ordering is unavailable for this shop.</span>'
        }
      </div>
    </article>`;
}

function renderManageableShop(shop) {
  const staffList = (shop.staff || [])
    .map((member) => {
      const memberId = member.user?._id || member.user;
      const canRemoveOwner = isObjectIdEqual(memberId, getOwnerId(shop));
      const removeButton = canRemoveOwner
        ? ''
        : `<button class="btn danger" data-action="remove-staff" data-shop-id="${shop._id}" data-user-id="${memberId}">Remove</button>`;

      return `
        <li>
          ${escapeHtml(member.user?.fullName || member.user)}
          <span class="muted">(${member.role})</span>
          ${removeButton}
        </li>`;
    })
    .join('');

  return `
    <article class="card" id="shop-${shop._id}">
      <h3>${escapeHtml(shop.name)}</h3>
      <p class="muted">${escapeHtml(shop.description)}</p>
      <p class="muted">${escapeHtml(shop.location.city)}, ${escapeHtml(shop.location.address)}</p>
      <p><span class="status-chip">${shop.status}</span>${shop.archived ? ' <span class="status-chip">archived</span>' : ''}</p>

      <div class="grid cols-2">
        <label>Name
          <input id="name-${shop._id}" value="${escapeAttr(shop.name)}" />
        </label>
        <label>Status
          <select id="status-${shop._id}">
            ${renderOption('open', shop.status)}
            ${renderOption('closed', shop.status)}
            ${renderOption('maintenance', shop.status)}
          </select>
        </label>
        <label>City
          <input id="city-${shop._id}" value="${escapeAttr(shop.location.city)}" />
        </label>
        <label>Address
          <input id="address-${shop._id}" value="${escapeAttr(shop.location.address)}" />
        </label>
      </div>

      <label>Description
        <textarea id="description-${shop._id}">${escapeHtml(shop.description)}</textarea>
      </label>

      <label>Menu Categories (comma separated)
        <input id="menu-${shop._id}" value="${escapeAttr((shop.menuCategories || []).join(', '))}" />
      </label>

      <label>Tags (comma separated)
        <input id="tags-${shop._id}" value="${escapeAttr((shop.tags || []).join(', '))}" />
      </label>

      <div class="actions">
        ${
          canOrderFromShop(shop)
            ? `<a class="btn secondary" href="/orders.html?shopId=${shop._id}">Order from this shop</a>`
            : '<span class="muted">You cannot order from your own shop.</span>'
        }
        <button class="btn" data-action="save-shop" data-shop-id="${shop._id}">Save Changes</button>
        ${
          isAdmin
            ? shop.archived
              ? `<button class="btn ok" data-action="restore-shop" data-shop-id="${shop._id}">Restore Shop</button>`
              : `<button class="btn danger" data-action="archive-shop" data-shop-id="${shop._id}">Archive Shop</button>`
            : ''
        }
        ${isAdmin ? `<a class="btn secondary" href="/analytics.html?shopId=${shop._id}">View Analytics</a>` : ''}
      </div>

      ${
        shop.archived
          ? '<p class="muted">Shop is archived.</p>'
          : `<hr />
      <h4>Staff</h4>
      <ul class="list">${staffList || '<li class="muted">No staff.</li>'}</ul>

      <div class="grid cols-3">
        <label>User ID
          <input id="staff-user-${shop._id}" placeholder="MongoDB user id" />
        </label>
        <label>Role
          <select id="staff-role-${shop._id}">
            <option value="manager">manager</option>
            <option value="barista">barista</option>
            <option value="cashier">cashier</option>
          </select>
        </label>
        <div class="actions" style="align-items:end;">
          <button class="btn ok" data-action="add-staff" data-shop-id="${shop._id}">Add Staff</button>
        </div>
      </div>`
      }
    </article>`;
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert('shops-alert');

  const payload = {
    name: document.getElementById('create-name').value.trim(),
    description: document.getElementById('create-description').value.trim(),
    city: document.getElementById('create-city').value.trim(),
    address: document.getElementById('create-address').value.trim(),
    status: document.getElementById('create-status').value,
    menuCategories: splitComma(document.getElementById('create-menu').value),
    tags: splitComma(document.getElementById('create-tags').value)
  };

  try {
    await apiFetch('/shops', { method: 'POST', body: payload });
    createForm.reset();
    showAlert('shops-alert', 'Shop created successfully.', 'success');
    await loadShops();
  } catch (error) {
    showAlert('shops-alert', error.message, 'error');
  }
});

shopsContainer.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const { action, shopId, userId } = button.dataset;
  const shop = shopsCache.find((item) => String(item._id) === String(shopId));

  try {
    if (action === 'save-shop') {
      if (!canManageShop(shop)) {
        showAlert('shops-alert', 'You cannot edit this shop.', 'error');
        return;
      }

      const payload = {
        name: document.getElementById(`name-${shopId}`).value.trim(),
        description: document.getElementById(`description-${shopId}`).value.trim(),
        city: document.getElementById(`city-${shopId}`).value.trim(),
        address: document.getElementById(`address-${shopId}`).value.trim(),
        status: document.getElementById(`status-${shopId}`).value,
        menuCategories: splitComma(document.getElementById(`menu-${shopId}`).value),
        tags: splitComma(document.getElementById(`tags-${shopId}`).value)
      };

      await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: payload });
      showAlert('shops-alert', 'Shop updated.', 'success');
      await loadShops();
      return;
    }

    if (action === 'archive-shop') {
      if (!isAdmin) {
        showAlert('shops-alert', 'Only admin can archive shops.', 'error');
        return;
      }

      if (!window.confirm('Archive this shop?')) {
        return;
      }

      await apiFetch(`/shops/${shopId}`, { method: 'DELETE' });
      showAlert('shops-alert', 'Shop archived.', 'success');
      await loadShops();
      return;
    }

    if (action === 'restore-shop') {
      if (!isAdmin) {
        showAlert('shops-alert', 'Only admin can restore shops.', 'error');
        return;
      }

      await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: { archived: false } });
      showAlert('shops-alert', 'Shop restored.', 'success');
      await loadShops();
      return;
    }

    if (action === 'add-staff') {
      if (!canManageShop(shop)) {
        showAlert('shops-alert', 'You cannot manage staff for this shop.', 'error');
        return;
      }

      const payload = {
        userId: document.getElementById(`staff-user-${shopId}`).value.trim(),
        role: document.getElementById(`staff-role-${shopId}`).value
      };

      await apiFetch(`/shops/${shopId}/staff`, { method: 'POST', body: payload });
      showAlert('shops-alert', 'Staff member added.', 'success');
      await loadShops();
      return;
    }

    if (action === 'remove-staff') {
      if (!canManageShop(shop)) {
        showAlert('shops-alert', 'You cannot manage staff for this shop.', 'error');
        return;
      }

      await apiFetch(`/shops/${shopId}/staff/${userId}`, { method: 'DELETE' });
      showAlert('shops-alert', 'Staff member removed.', 'success');
      await loadShops();
    }
  } catch (error) {
    showAlert('shops-alert', error.message, 'error');
  }
});

document.getElementById('apply-filters').addEventListener('click', () => {
  loadShops().catch((error) => showAlert('shops-alert', error.message, 'error'));
});

if (includeArchivedCheckbox) {
  includeArchivedCheckbox.addEventListener('change', () => {
    loadShops().catch((error) => showAlert('shops-alert', error.message, 'error'));
  });
}

function canManageShop(shop) {
  if (!shop) {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  return isObjectIdEqual(getOwnerId(shop), currentUserId);
}

function canOrderFromShop(shop) {
  if (!shop || shop.archived || shop.status !== 'open') {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  return !isObjectIdEqual(getOwnerId(shop), currentUserId);
}

function getOwnerId(shop) {
  return String(shop?.owner?._id || shop?.owner || '');
}

function isObjectIdEqual(a, b) {
  return String(a) === String(b);
}

function splitComma(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderOption(value, current) {
  return `<option value="${value}" ${value === current ? 'selected' : ''}>${value}</option>`;
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(input) {
  return escapeHtml(input).replaceAll('`', '&#96;');
}
