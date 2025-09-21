
const routes = ['login','dashboard','profile','organizations','events','users','calendar','notifications','settings'];

export function initRouter(render){
  function handle(){
    const hash = location.hash.replace('#','') || 'dashboard';
    const route = routes.includes(hash) ? hash : 'dashboard';
    render(route);
    highlightNav(route);
  }
  window.addEventListener('hashchange', handle);
  document.addEventListener('DOMContentLoaded', handle);
  handle();
}

export function navigateTo(route){ location.hash = '#'+route; }

function highlightNav(route){
  document.querySelectorAll('.nav a').forEach(a => {
    const is = a.getAttribute('href') === '#'+route;
    a.classList.toggle('active', is);
  });
}
