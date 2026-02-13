import {
  apiFetch,
  clearAlert,
  ensureAuth,
  fetchCurrentUser,
  setTopbarUser,
  showAlert
} from './core.js';
import { initLayout } from './layout.js';

const usersBody = document.getElementById('users-body');

if (ensureAuth()) {
  initLayout('/users.html');
  bootstrap().catch((error) => showAlert('users-alert', error.message, 'error'));
}

async function bootstrap() {
  const currentUser = await fetchCurrentUser();
  if (currentUser?.role !== 'admin') {
    window.location.href = '/dashboard.html';
    return;
  }

  setTopbarUser();
  await loadUsers();
}

async function loadUsers() {
  clearAlert('users-alert');

  try {
    const users = await apiFetch('/users');
    usersBody.innerHTML = users
      .map(
        (user) => `
      <tr>
        <td>${escapeHtml(user.fullName)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>
          <select id="role-${user._id}">
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </td>
        <td><button class="btn" data-user-id="${user._id}" data-action="save-role">Update Role</button></td>
      </tr>`
      )
      .join('');
  } catch (error) {
    if (error.status === 403) {
      usersBody.innerHTML = '<tr><td colspan="4" class="muted">Admin role required to view this page.</td></tr>';
      return;
    }

    throw error;
  }
}

document.getElementById('users-table').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="save-role"]');
  if (!button) {
    return;
  }

  const { userId } = button.dataset;
  const role = document.getElementById(`role-${userId}`).value;

  try {
    await apiFetch(`/users/${userId}/role`, {
      method: 'PATCH',
      body: { role }
    });

    showAlert('users-alert', 'User role updated.', 'success');
    await loadUsers();
  } catch (error) {
    showAlert('users-alert', error.message, 'error');
  }
});

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
