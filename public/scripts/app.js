// app.js
import { initRouter, navigateTo } from './utils/router.js';
import { subscribe, initState, setState, getState } from './utils/state.js';
import { qs, ensureTheme } from './utils/helpers.js';
import { renderHeader } from './components/header.js';
import { renderDashboard } from './components/dashboard.js';
import { renderDashboardSecretaria, bindDashboardSecretariaEvents } from './components/dashboardSecretaria.js';
import { renderProfile } from './components/profile.js';
import { renderOrganizations } from './components/organizations.js';
import { renderEvents } from './components/events.js';
import { renderUsers } from './components/users.js';
import { renderNotifications, loadNotifications, getUnreadCount, startNotificationRefresh, stopNotificationRefresh } from './components/notifications.js';
import { renderSettings } from './components/settings.js';
import { renderAuthView, isAuthenticated, bindAuthEvents, handleResetPasswordPage, getCurrentUser, validateAuthentication } from './auth.js';


const mount = document.getElementById('app');

function renderShell(children) {
  return `
    <div id="header-slot"></div>
    <main class="container">
      ${children}
    </main>
    <div id="toast" class="toast"></div>
  `;
}

export async function loadInitialData() {
  try {
    console.log('📦 Cargando datos iniciales...');
    
    const user = getCurrentUser();
    const isSecretaria = user?.tipo === 'secretaria';
    
    // Si es secretaria, cargar eventos para evaluación
    const eventsEndpoint = isSecretaria ? '/api/events/for-secretaria' : '/api/events';
    
    const [eventsRes, installationsRes, orgsRes, facultadesRes, programasRes, notificationsRes] = await Promise.all([
      fetch(eventsEndpoint).catch(() => ({ ok: false })),
      fetch('/api/installations').catch(() => ({ ok: false })),
      fetch('/api/organizations').catch(() => ({ ok: false })),
      fetch('/api/facultades').catch(() => ({ ok: false })),
      fetch('/api/programas').catch(() => ({ ok: false })),
      loadNotifications().catch(() => [])
    ]);

    const st = getState();
    
    if (eventsRes.ok) {
      const events = await eventsRes.json();
      console.log('✅ Eventos cargados:', events.length);
      setState({ ...st, events });
    }

    if (installationsRes.ok) {
      const installations = await installationsRes.json();
      console.log('✅ Instalaciones cargadas:', installations.length);
      setState({ ...getState(), installations });
    }

    if (orgsRes.ok) {
      const orgs = await orgsRes.json();
      console.log('✅ Organizaciones cargadas:', orgs.length);
      setState({ ...getState(), organizations: orgs });
    }

    if (facultadesRes.ok) {
      const facultades = await facultadesRes.json();
      console.log('✅ Facultades cargadas:', facultades.length);
      setState({ ...getState(), facultades });
    }

    if (programasRes.ok) {
      const programas = await programasRes.json();
      console.log('✅ Programas cargados:', programas.length);
      setState({ ...getState(), programas });
    }

    console.log('✅ Notificaciones cargadas');
    await getUnreadCount();

    console.log('✅ Datos iniciales cargados correctamente');
  } catch (error) {
    console.error('❌ Error cargando datos iniciales:', error);
  }
}

async function renderRoute(route) {
  // Detectar si estamos en la página de reset-password
  if (window.location.pathname === '/reset-password') {
    const handled = handleResetPasswordPage();
    if (handled) return;
  }

  let view = '';
  switch (route) {
    case 'login':
      view = renderAuthView();
      mount.innerHTML = `<main class="auth"><div class="card auth-card"><div class="card-body">${view}</div></div></main><div id="toast" class="toast"></div>`;
      bindAuthEvents();
      return;

    case 'home': {
      // Página pública con eventos aprobados
      const { renderHome } = await import('./components/home.js');
      view = renderHome();
      mount.innerHTML = renderShell(view);
      const headerSlot = qs('#header-slot');
      if (headerSlot) headerSlot.innerHTML = renderHeader();
      // Importar y ejecutar listeners de home si existen
      try {
        const { bindHomeEvents } = await import('./components/home.js');
        bindHomeEvents?.();
      } catch (e) {
        console.log('No bindHomeEvents found');
      }
      return;
    }

    case 'dashboard': {
      // Detectar rol del usuario y renderizar dashboard correspondiente
      const user = getCurrentUser();
      console.log('🔍 Usuario detectado:', user);
      
      if (user?.tipo === 'secretaria') {
        console.log('✅ Renderizando dashboard de SECRETARIA');
        view = renderDashboardSecretaria();
        mount.innerHTML = renderShell(view);
        const headerSlot = qs('#header-slot');
        if (headerSlot) headerSlot.innerHTML = renderHeader();
        bindDashboardSecretariaEvents();
        return;
      } else {
        console.log('✅ Renderizando dashboard DEFAULT');
        view = renderDashboard();
      }
      break;
    }
      
    case 'profile': 
      view = renderProfile(); 
      break;
    
    case 'my-events': {
      // ✅ Renderizar Mis Eventos
      console.log('✅ Renderizando Mis Eventos');
      const { renderMyEvents, bindMyEventsListeners } = await import('./components/MyEvents.js');
      view = renderMyEvents();
      mount.innerHTML = renderShell(view);
      const headerSlot = qs('#header-slot');
      if (headerSlot) headerSlot.innerHTML = renderHeader();
      bindMyEventsListeners();
      return;
    }
    
    case 'organizations': 
      view = await renderOrganizations(); 
      break;
    
    case 'events': 
      view = await renderEvents(); 
      break;
    
    case 'users': 
        if (st.user && st.user.tipo === 'secretaria') {
          renderDashboardSecretaria();
        } else {
          view = await renderEvents(); 
        }
      break;
    
    // 'calendar' route removed — feature deprecated
        if (st.user && st.user.tipo === 'secretaria') {
          renderDashboardSecretaria();
        } else {
          view = await renderMyEvents();
        }
    case 'notifications': 
      view = `<div id="notificationsContainer">${renderNotifications()}</div>`;
      break;
    
    case 'settings': 
      view = renderSettings(); 
      break;
    
    default: {
      // Si no autenticado, mostrar home; si autenticado, mostrar dashboard según rol
      if (!isAuthenticated()) {
        const { renderHome } = await import('./components/home.js');
        view = renderHome();
        mount.innerHTML = renderShell(view);
        const headerSlot = qs('#header-slot');
        if (headerSlot) headerSlot.innerHTML = renderHeader();
        try {
          const { bindHomeEvents } = await import('./components/home.js');
          bindHomeEvents?.();
        } catch (e) {
          console.log('No bindHomeEvents found');
        }
        return;
      }

      const defaultUser = getCurrentUser();
      console.log('🔍 Usuario en default:', defaultUser);
      
      if (defaultUser?.tipo === 'secretaria') {
        console.log('✅ Renderizando dashboard de SECRETARIA (default)');
        view = renderDashboardSecretaria();
        mount.innerHTML = renderShell(view);
        const headerSlot = qs('#header-slot');
        if (headerSlot) headerSlot.innerHTML = renderHeader();
        bindDashboardSecretariaEvents();
        return;
      } else {
        console.log('✅ Renderizando dashboard DEFAULT (default)');
        view = renderDashboard();
      }
      break;
    }
  }

  mount.innerHTML = renderShell(view);
  const headerSlot = qs('#header-slot');
  if (headerSlot) headerSlot.innerHTML = renderHeader();
}

(async function init() {
  ensureTheme();
  initState();

  // Validar autenticación con el servidor
  if (isAuthenticated()) {
    const isValid = await validateAuthentication();
    if (isValid) {
      await loadInitialData();
      // Iniciar auto-refresh de notificaciones
      startNotificationRefresh();
    }
  }

  initRouter(renderRoute);
  subscribe(() => console.log('State updated:', getState()));
})();