/**
 * notifications.js - Componente de notificaciones
 *
 * Este componente renderiza la lista de notificaciones del usuario.
 * Permite marcar notificaciones como leídas y muestra el estado de cada una.
 * Utiliza el estado global para obtener y actualizar las notificaciones.
 * Se sincroniza con la BD a través de API REST.
 */

import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { toast } from '../utils/helpers.js';


let unreadCount = 0;
let notificationRefreshInterval = null;
let notificationFilter = 'all'; // 'all' | 'unread'

/**
 * Inicia el auto-refresh de notificaciones cada 10 segundos
 */
export function startNotificationRefresh() {
  if (notificationRefreshInterval) return; // Ya está corriendo
  
  notificationRefreshInterval = setInterval(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        stopNotificationRefresh();
        toast('Sesión expirada. Recarga la página para volver a iniciar sesión.', 'error');
        return;
      }
      await loadNotifications();
    } catch (err) {
      if (err?.status === 401 || (err?.message && err.message.includes('401'))) {
        stopNotificationRefresh();
        toast('Sesión expirada. Recarga la página para volver a iniciar sesión.', 'error');
      } else {
        console.error('Auto-refresh error:', err);
      }
    }
  }, 10000); // Cada 10 segundos
  
  console.log('📱 Notificaciones auto-refresh iniciado');
}

/**
 * Detiene el auto-refresh de notificaciones
 */
export function stopNotificationRefresh() {
  if (notificationRefreshInterval) {
    clearInterval(notificationRefreshInterval);
    notificationRefreshInterval = null;
    console.log('📱 Notificaciones auto-refresh detenido');
  }
}

/**
 * Obtiene el token JWT del localStorage
 */
function getAuthToken() {
  try {
    const user = getCurrentUser();
    return user?.token || sessionStorage.getItem('uc_auth_token');
  } catch {
    return null;
  }
}

/**
 * Realiza un fetch con autenticación JWT
 */
async function fetchWithAuth(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  return fetch(url, { ...options, headers });
}

/**
 * Obtiene las notificaciones desde la API
 */
export async function loadNotifications(opts = {}) {
  try {
    console.log('📲 Cargando notificaciones...');
    const url = opts.unread ? '/api/notifications?unread=true' : '/api/notifications';
    const res = await fetchWithAuth(url);
    
    if (!res.ok) {
      toast('Error cargando notificaciones', 'error');
      return [];
    }
    
    const notificaciones = await res.json();
    console.log(`✅ ${notificaciones.length} notificaciones cargadas`);
    if (notificaciones.length > 0) {
      notificaciones.forEach(n => {
        console.log(`  • ${n.titulo} (${n.tipo}) - ${n.descripcion?.substring(0, 50)}...`);
      });
    }
    const st = getState();
    st.notifications = notificaciones;
    setState(st);
    // Actualizar conteo de no leídas
    unreadCount = notificaciones.filter(n => !n.leida).length;
    updateNotificationBadge();
    return notificaciones;
  } catch (err) {
    toast('Error de conexión al cargar notificaciones', 'error');
    return [];
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas
 */
export async function getUnreadCount() {
  try {
    const res = await fetchWithAuth('/api/notifications/unread-count');
    
    if (!res.ok) return 0;
    
    const data = await res.json();
    unreadCount = data.unreadCount || 0;
    updateNotificationBadge();
    return unreadCount;
  } catch (err) {
    toast('Error obteniendo conteo de notificaciones', 'error');
    return 0;
  }
}

/**
 * Actualiza el badge de notificaciones en el header
 */
function updateNotificationBadge() {
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Renderiza la lista de notificaciones en una tarjeta.
 * @returns {string} HTML de la vista de notificaciones
 */
export function renderNotifications(){
  const { notifications } = getState();
  let filtered = notifications || [];
  if (notificationFilter === 'unread') {
    filtered = filtered.filter(n => !n.leida);
  }
  if (!filtered || filtered.length === 0) {
    return `
      <div class="card">
        <div class="card-head">
          <strong>Notificaciones</strong>
          <div style="display: flex; gap: 8px; margin-left: auto;">
            <button id="showAllNotifications" class="btn small ${notificationFilter==='all' ? 'primary' : 'secondary'}">Todas</button>
            <button id="showUnreadNotifications" class="btn small ${notificationFilter==='unread' ? 'primary' : 'secondary'}">No leídas</button>
          </div>
        </div>
        <div class="card-body" style="text-align:center; padding:40px 20px;">
          <div class="muted">No tienes notificaciones${notificationFilter==='unread' ? ' no leídas' : ''}</div>
        </div>
      </div>
    `;
  }
  const items = filtered.map(n => {
    const fecha = new Date(n.fecha_creacion).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const tipoColor = {
      'enRevision': '#f59e0b',
      'evaluado': '#3b82f6',
      'aprobado': '#10b981',
      'rechazado': '#ef4444'
    };
    
    const tipoEmoji = {
      'enRevision': '📋',
      'evaluado': '✓',
      'aprobado': '✓✓',
      'rechazado': '✗'
    };
    
    const titulo = n.titulo || `Evento ${n.tipo}`;
    const descripcion = n.descripcion || `Evento ID: ${n.idEvento}`;
    
    return `
      <div class="notification-item ${n.leida ? 'read' : 'unread'}" data-id="${n.idNotificacion}">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <strong>${titulo}</strong>
              <span style="background:${tipoColor[n.tipo] || '#6b7280'}; color:white; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">
                ${tipoEmoji[n.tipo] || '•'} ${n.tipo}
              </span>
              ${!n.leida ? '<span style="background:var(--primary); width:8px; height:8px; border-radius:50%;"></span>' : ''}
            </div>
            <p style="margin:0 0 8px 0; color:var(--muted-foreground); font-size:0.95rem;">
              ${descripcion}
            </p>
            <small style="color:var(--muted-foreground);">
              ${fecha}
              ${n.nombreEvento ? ` • Evento: ${n.nombreEvento}` : ''}
            </small>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0;">
            ${!n.leida ? `<button class="btn small mark-read-btn" data-id="${n.idNotificacion}">Marcar leída</button>` : ''}
            <button class="btn small danger delete-notif-btn" data-id="${n.idNotificacion}">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="card">
      <div class="card-head">
        <strong>Notificaciones</strong>
        <div style="display: flex; gap: 8px; margin-left: auto; align-items: center;">
          <button id="showAllNotifications" class="btn small ${notificationFilter==='all' ? 'primary' : 'secondary'}">Todas</button>
          <button id="showUnreadNotifications" class="btn small ${notificationFilter==='unread' ? 'primary' : 'secondary'}">No leídas</button>
          <small style="color:var(--muted-foreground); margin-left: 12px;">
            ${notifications.filter(n => !n.leida).length} sin leer
          </small>
          <button id="refreshNotifications" class="btn small secondary" style="margin-left: 8px;">🔄 Recargar</button>
        </div>
      </div>
      <div class="card-body" style="padding:0;">
        <div style="max-height:600px; overflow-y:auto;">
          ${items}
        </div>
      </div>
    </div>
  `;
}

/**
 * Listener global para marcar notificaciones como leídas o eliminar
 */
document.addEventListener('click', async (e) => {
  // Filtro: mostrar todas
  const allBtn = e.target.closest('#showAllNotifications');
  if (allBtn) {
    notificationFilter = 'all';
    // pedir al backend todas las notificaciones
    await loadNotifications({ unread: false });
    const notifContainer = document.querySelector('#notificationsContainer');
    if (notifContainer) notifContainer.innerHTML = renderNotifications();
    return;
  }
  // Filtro: mostrar solo no leídas
  const unreadBtn = e.target.closest('#showUnreadNotifications');
  if (unreadBtn) {
    notificationFilter = 'unread';
    // solicitar únicamente no leídas al backend para asegurar consistencia
    await loadNotifications({ unread: true });
    const notifContainer = document.querySelector('#notificationsContainer');
    if (notifContainer) notifContainer.innerHTML = renderNotifications();
    return;
  }
  // Botón de recarga
  const refreshBtn = e.target.closest('#refreshNotifications');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Recargando...';
    await loadNotifications();
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Recargar';
    return;
  }

  // Marcar como leída
  const markBtn = e.target.closest('.mark-read-btn');
  if (markBtn) {
    const id = markBtn.getAttribute('data-id');
    try {
      const res = await fetchWithAuth(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const st = getState();
        const idx = st.notifications.findIndex(n => n.idNotificacion === Number(id));
        if (idx >= 0) {
          st.notifications[idx].leida = true;
          setState(st);
          markBtn.textContent = 'Leída';
          markBtn.disabled = true;
        }
        await getUnreadCount();
      } else {
        toast('No se pudo marcar como leída', 'error');
      }
    } catch (err) {
      toast('Error al marcar como leída', 'error');
    }
    return;
  }
  
  // Eliminar notificación con confirmación
  const deleteBtn = e.target.closest('.delete-notif-btn');
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    const confirmDelete = window.confirm('¿Seguro que deseas borrar esta notificación? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;
    try {
      const res = await fetchWithAuth(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const st = getState();
        st.notifications = st.notifications.filter(n => n.idNotificacion !== Number(id));
        setState(st);
        deleteBtn.closest('.notification-item').remove();
        await getUnreadCount();
      } else {
        toast('No se pudo eliminar la notificación', 'error');
      }
    } catch (err) {
      toast('Error eliminando notificación', 'error');
    }
  }
});

/* Estilos para notificaciones */
const notifStyles = document.createElement('style');
notifStyles.textContent = `
  .notification-item {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    transition: background 0.2s ease;
  }

  .notification-item:hover {
    background: rgba(30, 58, 138, 0.03);
  }

  .notification-item.unread {
    background: rgba(30, 58, 138, 0.08);
    border-left: 4px solid var(--primary);
  }

  .notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--destructive);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
  }
`;
if (!document.querySelector('style[data-notif-styles]')) {
  notifStyles.setAttribute('data-notif-styles', '1');
  document.head.appendChild(notifStyles);
}
