
import { getState, setState } from '../utils/state.js';

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

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-read]');
  if (!btn) return;
  const id = btn.getAttribute('data-read');
  const st = getState();
  const i = st.notifications.findIndex(n=>n.id===id);
  if (i>=0){ st.notifications[i].read = true; setState(st); }
});
