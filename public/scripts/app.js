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
import { renderAuthView, isAuthenticated, bindAuthEvents } from './auth.js';

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

async function renderRoute(route) {
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

function main() {
  initState();
  ensureTheme();

  initRouter((route) => {
    renderRoute(route).catch(err => {
      console.error('Error rendering route:', err);
      // fallback: render dashboard to avoid blank screen
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
