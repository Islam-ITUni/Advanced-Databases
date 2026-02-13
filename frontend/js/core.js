export const API_BASE = '/api/v1';
export const STORAGE_TOKEN_KEY = 'coffee_shop_token';
export const STORAGE_USER_KEY = 'coffee_shop_user';

export function getToken() {
  return localStorage.getItem(STORAGE_TOKEN_KEY) || '';
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_USER_KEY);
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

export function logout() {
  clearSession();
  window.location.href = '/index.html';
}

export function ensureAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/index.html';
    return false;
  }

  return true;
}

export function showAlert(targetId, message, type = 'error') {
  const el = document.getElementById(targetId);
  if (!el) {
    return;
  }

  el.className = `alert ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

export function clearAlert(targetId) {
  const el = document.getElementById(targetId);
  if (!el) {
    return;
  }

  el.classList.add('hidden');
  el.textContent = '';
}

function extractMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (payload.message) {
    return payload.message;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((item) => `${item.field}: ${item.message}`).join('; ');
  }

  return fallback;
}

export async function apiFetch(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    auth = true,
    headers = {}
  } = options;

  const requestHeaders = {
    ...headers
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
    }

    const message = extractMessage(payload, `Request failed with status ${response.status}`);
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export async function fetchCurrentUser() {
  const result = await apiFetch('/auth/me');
  if (result?.user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.user));
    return result.user;
  }

  return null;
}

export function formatMoney(amount, currency = 'USD') {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function formatDate(input) {
  if (!input) {
    return '-';
  }

  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }

  return d.toLocaleString();
}

export function setTopbarUser() {
  const user = getStoredUser();
  const holder = document.getElementById('topbar-user');
  if (!holder) {
    return;
  }

  if (!user) {
    holder.textContent = 'Guest';
    return;
  }

  holder.textContent = `${user.fullName} (${user.role})`;
}
