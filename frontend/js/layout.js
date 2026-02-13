import { getStoredUser, logout, setTopbarUser } from './core.js';

function applyRoleBasedNavVisibility() {
  const user = getStoredUser();
  const isAdmin = user?.role === 'admin';

  const adminOnlyLinks = document.querySelectorAll('[data-admin-only]');
  adminOnlyLinks.forEach((link) => {
    link.classList.toggle('hidden', !isAdmin);
  });
}

export function initLayout(activePath) {
  applyRoleBasedNavVisibility();

  const links = document.querySelectorAll('[data-nav]');
  links.forEach((link) => {
    const target = link.getAttribute('href');
    if (target === activePath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  setTopbarUser();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}
