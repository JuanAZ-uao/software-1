const routes = [
  'login',
  'dashboard',
  'profile',
  'organizations',
  'events',
  'users',
  'calendar',
  'notifications',
  'settings'
];

export function initRouter(render) {
  async function handle() {
    const hash = location.hash.replace('#', '') || 'login';
    const route = routes.includes(hash) ? hash : 'login';
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