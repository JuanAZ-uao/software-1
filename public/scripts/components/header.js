import { getCurrentUser, logout, isAuthenticated } from '../auth.js';
import { getState, setState } from '../utils/state.js';
import { toast } from '../utils/helpers.js';

export function renderHeader() {
  const user = getCurrentUser();
  const isAuth = isAuthenticated();
  const userTipo = user?.tipo || user?.role || 'usuario';
  const isAdmin = userTipo === 'Administrador' || userTipo === 'admin';
  const isSecretaria = userTipo === 'secretaria';

  const { notifications = [] } = getState();
  const unread = Array.isArray(notifications) ? notifications.filter(n => !n.leida).length : 0;

  // Navegar según si está autenticado
  let navLinks = '';
  if (isAuth) {
    if (isSecretaria) {
      // Secretarias solo ven Inicio y Dashboard (perfil y notificaciones vía header)
      navLinks = `
        <a href="#home">Inicio</a>
        <a href="#dashboard">Dashboard</a>
      `;
    } else {
      navLinks = `
        <a href="#home">Inicio</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#events">Eventos</a>
        <a href="#my-events">Mis Eventos</a>
      `;
    }
  } else {
    navLinks = `
      <a href="#home">Inicio</a>
      <a href="#login">Iniciar Sesión</a>
    `;
  }

  // ✅ CAMBIO: Estructura completa del header con .header y .header__inner
  return `
    <div class="header">
      <div class="header__inner">
        <div class="brand">
          <div class="brand__logo"></div>
          <div class="brand__name">Universidad Connect</div>
        </div>
        
        <nav class="nav" id="main-nav">
          ${navLinks}
        </nav>
        
        <div class="header__tools">
          <button id="themeToggle" class="theme-toggle" title="Tema">🌓</button>
          
          ${isAuth ? `
            <div style="position:relative;">
              <button title="Notificaciones" class="badge" id="notifBtn">🔔 <span id="notif-count">${unread}</span></button>
              <div class="notif-dd" id="notif-dd">
                <!-- Notificaciones se cargan dinámicamente -->
              </div>
            </div>
            
            <div class="profile-menu">
              <img class="avatar" src="${user?.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b372?w=64'}" alt="avatar">
              <div class="profile-dropdown" id="profile-dd">
                <a href="#profile">👤 Ver perfil</a>
                <a href="#settings">⚙️ Configuración</a>
                <button id="logoutBtn">🚪 Cerrar sesión</button>
              </div>
            </div>
          ` : `
            <button class="btn small primary" onclick="window.location.hash='#login'" style="margin-right: 8px;">
              🔐 Iniciar Sesión
            </button>
          `}
          
          <button class="menu-btn btn" id="menuBtn">☰</button>
        </div>
      </div>
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
    const items = Array.isArray(st.notifications) && st.notifications.length > 0
      ? st.notifications.map(n => `
        <div class="notif-item">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
            <div style="flex:1;">
              <strong>${n.titulo || 'Notificación'}</strong>
              <div class="muted" style="font-size:0.85rem;margin-top:4px;">${n.tipo} • ${new Date(n.fecha_creacion).toLocaleString('es-CO')}</div>
              <div style="font-size:0.9rem;margin-top:6px;color:var(--muted-foreground);">${n.descripcion || 'Sin detalles'}</div>
            </div>
            ${!n.leida ? `<button class="btn small" data-read="${n.idNotificacion}">Marcar leída</button>` : ''}
          </div>
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
    const i = Array.isArray(st.notifications) ? st.notifications.findIndex(n => n.idNotificacion === Number(id)) : -1;
    if (i >= 0) {
      // Optimist update UI
      st.notifications[i].leida = true;
      setState(st);
      readBtn.style.display = 'none';
      // Enviar petición al backend para persistir
      (async () => {
        try {
          const token = getCurrentUser()?.token || sessionStorage.getItem('uc_auth_token');
          const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
          if (!res.ok) {
            // Revertir si falla
            st.notifications[i].leida = false;
            setState(st);
            readBtn.style.display = 'inline-block';
            toast('No se pudo marcar la notificación como leída', 'error');
          } else {
            // actualizar badge
            const unread = Array.isArray(st.notifications) ? st.notifications.filter(n => !n.leida).length : 0;
            const notifCount = document.getElementById('notif-count');
            if (notifCount) {
              if (unread > 0) {
                notifCount.textContent = unread;
                notifCount.style.display = 'inline-block';
              } else {
                notifCount.textContent = '';
                notifCount.style.display = 'none';
              }
            }
          }
        } catch (err) {
          st.notifications[i].leida = false;
          setState(st);
          readBtn.style.display = 'inline-block';
          toast('Error marcando notificación como leída', 'error');
        }
      })();
    }
  }
});
