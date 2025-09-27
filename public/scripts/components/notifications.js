/**
 * notifications.js - Componente de notificaciones
 *
 * Este componente renderiza la lista de notificaciones del usuario.
 * Permite marcar notificaciones como leídas y muestra el estado de cada una.
 * Utiliza el estado global para obtener y actualizar las notificaciones.
 */

import { getState, setState } from '../utils/state.js';

/**
 * Renderiza la lista de notificaciones en una tarjeta.
 * @returns {string} HTML de la vista de notificaciones
 */
export function renderNotifications(){
  const { notifications } = getState();
  const items = notifications.map(n => `
    <div class="list-item">
      <div>
        <strong>${n.title}</strong>
        <div class="muted">${n.type} • ${new Date(n.date).toLocaleString()}</div>
      </div>
      <button class="btn small" data-read="${n.id}">${n.read? 'Leída' : 'Marcar leída'}</button>
    </div>
  `).join('');
  return `<div class="card"><div class="card-head"><strong>Notificaciones</strong></div><div class="card-body list">${items||'<div class="muted">Sin notificaciones</div>'}</div></div>`;
}

/**
 * Listener global para marcar notificaciones como leídas
 */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-read]');
  if (!btn) return;
  const id = btn.getAttribute('data-read');
  const st = getState();
  const i = st.notifications.findIndex(n=>n.id===id);
  if (i>=0){ st.notifications[i].read = true; setState(st); }
});
