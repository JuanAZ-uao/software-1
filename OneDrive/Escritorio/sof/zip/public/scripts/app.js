
import { initRouter, navigateTo } from './utils/router.js';
import { subscribe, initState } from './utils/state.js';
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
import { renderAuthView, isAuthenticated } from './auth.js';

const mount = document.getElementById('app');

function renderShell(children) {
  return `
    <header class="header">
      <div class="container header__inner" id="header-slot"></div>
    </header>
    <main class="container view-enter" id="view">${children || ''}</main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <div id="modal" class="modal"><div class="sheet"><div class="head"><div id="modal-title"></div><button class="btn small" id="modal-close">Cerrar</button></div><div class="body" id="modal-body"></div></div></div>
    <div id="notif-dd" class="notif-dd"></div>
  `;
}

function renderRoute(route) {
  if (!isAuthenticated() && route !== 'login') {
    navigateTo('login');
    return;
  }
  let view = '';
  switch (route) {
    case 'login': view = renderAuthView(); break;
    case 'dashboard': view = renderDashboard(); break;
    case 'profile': view = renderProfile(); break;
    case 'organizations': view = renderOrganizations(); break;
    case 'events': view = renderEvents(); break;
    case 'users': view = renderUsers(); break;
    case 'calendar': view = renderCalendar(); break;
    case 'notifications': view = renderNotifications(); break;
    case 'settings': view = renderSettings(); break;
    default: view = renderDashboard(); break;
  }

  if (route === 'login') {
    mount.innerHTML = `<main class="auth"><div class="card auth-card"><div class="card-body">${view}</div></div></main><div id="toast" class="toast"></div>`;
    return;
  }
  mount.innerHTML = renderShell(view);
  qs('#header-slot').innerHTML = renderHeader();
}

function bindGlobalUI() {
  document.addEventListener('click', (e) => {
    if (e.target?.id === 'modal-close' || e.target?.id === 'modal') {
      qs('#modal').classList.remove('open');
    }
  });
}

function main() {
  initState();
  ensureTheme();
  initRouter(renderRoute);
  bindGlobalUI();
  subscribe(() => {
    const header = qs('#header-slot');
    if (header && isAuthenticated()) header.innerHTML = renderHeader();
  });
}

main();
