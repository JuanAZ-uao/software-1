// app.js
import { initRouter, navigateTo } from './utils/router.js';
import { subscribe, initState, setState } from './utils/state.js';
import { qs, ensureTheme } from './utils/helpers.js';
import { renderHeader } from './components/header.js';
import { renderDashboard } from './components/dashboard.js';
import { renderProfile } from './components/profile.js';
import { renderOrganizations } from './components/organizations.js';
import { renderEvents } from './components/events.js';
import { renderUsers } from './components/users.js';
import { renderCalendar } from './components/calendar.js';
import { renderNotifications } from './components/notifications.js';
import { renderSettings } from './components/settings.js';
import { renderAuthView, isAuthenticated, bindAuthEvents, handleResetPasswordPage } from './auth.js';

const mount = document.getElementById('app');

function renderShell(children) {
  return `
    <header class="header">
      <div class="container header__inner" id="header-slot"></div>
    </header>
    <main class="container view-enter" id="view">${children || ''}</main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <div id="modal" class="modal">
      <div class="sheet">
        <div class="head">
          <div id="modal-title"></div>
          <button class="btn small" id="modal-close">Cerrar</button>
        </div>
        <div class="body" id="modal-body"></div>
      </div>
    </div>
    <div id="notif-dd" class="notif-dd"></div>
  `;
}

export async function loadInitialData() {
  try {
    const [eventsRes, orgsRes, instRes, notifRes] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/organizations'),
      fetch('/api/installations'),
      fetch('/api/notifications')
    ]);

    const [events, organizations, installations, notifications] = await Promise.all([
      eventsRes.ok ? eventsRes.json() : [],
      orgsRes.ok ? orgsRes.json() : [],
      instRes.ok ? instRes.json() : [],
      notifRes.ok ? notifRes.json() : []
    ]);

    setState({
      events: Array.isArray(events) ? events : [],
      organizations: Array.isArray(organizations) ? organizations : [],
      installations: Array.isArray(installations) ? installations : [],
      notifications: Array.isArray(notifications) ? notifications : []
    });
  } catch (err) {
    console.error('Error al cargar datos iniciales:', err);
    setState({ events: [], organizations: [], installations: [], notifications: [] });
  }
}


async function renderRoute(route) {
  // NUEVO: Detectar si estamos en la página de reset-password
  if (window.location.pathname === '/reset-password') {
    const handled = handleResetPasswordPage();
    if (handled) return;
  }

  if (!isAuthenticated() && route !== 'login') {
    navigateTo('login');
    return;
  }

  let view = '';
  switch (route) {
    case 'login':
      view = renderAuthView();
      mount.innerHTML = `<main class="auth"><div class="card auth-card"><div class="card-body">${view}</div></div></main><div id="toast" class="toast"></div>`;
      bindAuthEvents();
      return;

    case 'dashboard': view = renderDashboard(); break;
    case 'profile': view = renderProfile(); break;
    case 'organizations': view = await renderOrganizations(); break;
    case 'events': view = await renderEvents(); break;
    case 'users': view = renderUsers(); break;
    case 'calendar': view = renderCalendar(); break;
    case 'notifications': view = renderNotifications(); break;
    case 'settings': view = renderSettings(); break;
    default: view = renderDashboard(); break;
  }

  mount.innerHTML = renderShell(view);
  const headerSlot = qs('#header-slot');
  if (headerSlot) headerSlot.innerHTML = renderHeader();
}

function bindGlobalUI() {
  document.addEventListener('click', (e) => {
    if (e.target?.id === 'modal-close' || e.target?.id === 'modal') {
      qs('#modal').classList.remove('open');
    }
  });
}

async function main() {
  initState();
  ensureTheme();

  // NUEVO: Verificar si estamos en reset-password antes de cargar datos
  if (window.location.pathname === '/reset-password') {
    const handled = handleResetPasswordPage();
    if (handled) return;
  }

  if (isAuthenticated()) {
    await loadInitialData(); // ← Esto carga eventos, organizaciones, instalaciones, etc.
  }

  initRouter((route) => {
    renderRoute(route).catch(err => {
      console.error('Error rendering route:', err);
      navigateTo('dashboard');
    });
  });

  bindGlobalUI();

  subscribe(() => {
    const header = qs('#header-slot');
    if (header && isAuthenticated()) {
      header.innerHTML = renderHeader();
    }
  });
}

main();