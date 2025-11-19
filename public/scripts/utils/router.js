const publicRoutes = ['login', 'home', 'reset-password'];
const privateRoutes = [
  'dashboard',
  'profile',
  'my-events',
  'organizations', 
  'events',
  'users',
  'notifications',
  'settings'
];

const allRoutes = [...publicRoutes, ...privateRoutes];

export function initRouter(render) {
  async function handle() {
    const hash = location.hash.replace('#', '') || 'home';
    const route = allRoutes.includes(hash) ? hash : 'home';
    
    // Validar que no intente acceder a ruta privada sin autenticación
    if (privateRoutes.includes(route)) {
      // Importar isAuthenticated desde auth.js
      const { isAuthenticated } = await import('../auth.js');
      if (!isAuthenticated()) {
        console.warn('❌ Acceso denegado: ruta privada sin autenticación');
        location.hash = '#login';
        return;
      }
    }
    
    try {
      await render(route);
      highlightNav(route);
    } catch (err) {
      console.error('Router: error rendering route', route, err);
    }
  }

  window.addEventListener('hashchange', handle);
  document.addEventListener('DOMContentLoaded', handle);
  handle();
}

export function navigateTo(route) {
  location.hash = '#' + route;
}

function highlightNav(route) {
  document.querySelectorAll('.nav a').forEach(a => {
    const is = a.getAttribute('href') === '#' + route;
    a.classList.toggle('active', is);
  });
}