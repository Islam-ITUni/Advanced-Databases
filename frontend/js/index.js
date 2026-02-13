import { apiFetch, clearAlert, getToken, setSession, showAlert } from './core.js';

const loginTabButton = document.getElementById('tab-login');
const registerTabButton = document.getElementById('tab-register');
const loginFormWrap = document.getElementById('login-form-wrap');
const registerFormWrap = document.getElementById('register-form-wrap');

if (getToken()) {
  window.location.href = '/dashboard.html';
}

function activateTab(tab) {
  const isLogin = tab === 'login';

  loginTabButton.classList.toggle('active', isLogin);
  registerTabButton.classList.toggle('active', !isLogin);
  loginFormWrap.classList.toggle('hidden', !isLogin);
  registerFormWrap.classList.toggle('hidden', isLogin);

  clearAlert('auth-alert');
}

loginTabButton.addEventListener('click', () => activateTab('login'));
registerTabButton.addEventListener('click', () => activateTab('register'));

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert('auth-alert');

  const payload = {
    email: document.getElementById('login-email').value.trim(),
    password: document.getElementById('login-password').value
  };

  try {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false
    });

    setSession(result.token, result.user);
    window.location.href = '/dashboard.html';
  } catch (error) {
    showAlert('auth-alert', error.message, 'error');
  }
});

const registerForm = document.getElementById('register-form');
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert('auth-alert');

  const payload = {
    fullName: document.getElementById('register-fullname').value.trim(),
    email: document.getElementById('register-email').value.trim(),
    password: document.getElementById('register-password').value,
    adminKey: document.getElementById('register-admin-key').value.trim()
  };

  try {
    const result = await apiFetch('/auth/register', {
      method: 'POST',
      body: payload,
      auth: false
    });

    setSession(result.token, result.user);
    window.location.href = '/dashboard.html';
  } catch (error) {
    showAlert('auth-alert', error.message, 'error');
  }
});
