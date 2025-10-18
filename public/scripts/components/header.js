import { getCurrentUser, logout } from '../auth.js';
import { getState, setState } from '../utils/state.js';

export function renderHeader() {
  const user = getCurrentUser();
  const role = user?.role || 'Estudiante';
  const isAdmin = role === 'Administrador';

  const { notifications = [] } = getState();
  const unread = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

  return `
    <div class="brand">
      <div class="brand__logo"></div>
      <div class="brand__name">Universidad Connect</div>
    </div>
    <nav class="nav" id="main-nav">
      <a href="#dashboard">Dashboard</a>
      <a href="#events">Eventos</a>
      <a href="#my-events">Mis Eventos</a>
      <a href="#calendar">Calendario</a>
    </nav>
    <div class="header__tools">
      <button id="themeToggle" class="theme-toggle" title="Tema">🌓</button>
      <div style="position:relative;">
        <button title="Notificaciones" class="badge" id="notifBtn">🔔 <span id="notif-count">${unread}</span></button>
      </div>
      <div class="profile-menu">
        <img class="avatar" src="${user?.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b372?w=64'}" alt="avatar">
        <div class="profile-dropdown" id="profile-dd">
          <a href="#profile">Ver perfil</a>
          <a href="#settings">Configuración</a>
          <button id="logoutBtn">Cerrar sesión</button>
        </div>
      </div>
      <button class="menu-btn btn" id="menuBtn">☰</button>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const avatar = e.target.closest('.avatar');
  const profileDd = document.getElementById('profile-dd');
  const notifBtn = e.target?.id === 'notifBtn' || e.target.closest('#notifBtn');
  const notifDd = document.getElementById('notif-dd');

  if (avatar) { profileDd?.classList.toggle('open'); return; }
  if (e.target?.id === 'logoutBtn') { logout(); return; }
  if (e.target?.id === 'themeToggle') {
    const html = document.documentElement;
    html.classList.toggle('dark');
    localStorage.setItem('uc_theme', html.classList.contains('dark') ? 'dark' : 'light');
    return;
  }
  if (e.target?.id === 'menuBtn') {
    const nav = document.getElementById('main-nav'); nav?.classList.toggle('open');
    return;
  }
  if (notifBtn) {
    const st = getState();
    const items = Array.isArray(st.notifications)
      ? st.notifications.map(n => `
        <div class="notif-item">
          <div style="display:flex;justify-content:space-between;">
            <strong>${n.title}</strong>
            ${!n.read ? `<button class="btn small" data-read="${n.id}">Leer</button>` : ''}
          </div>
          <div class="muted">${n.type} • ${new Date(n.date).toLocaleString()}</div>
        </div>`).join('')
      : '<div class="notif-item muted">Sin notificaciones</div>';
    if (notifDd) { notifDd.innerHTML = items; notifDd.classList.toggle('open'); }
    return;
  }

  if (!e.target.closest('.profile-menu')) profileDd?.classList.remove('open');
  if (!e.target.closest('#notifBtn')) notifDd?.classList.remove('open');

  const readBtn = e.target.closest('button[data-read]');
  if (readBtn) {
    const id = readBtn.getAttribute('data-read');
    const st = getState();
    const i = Array.isArray(st.notifications) ? st.notifications.findIndex(n => n.id === id) : -1;
    if (i >= 0) {
      st.notifications[i].read = true;
      setState(st);
    }
  }
});
