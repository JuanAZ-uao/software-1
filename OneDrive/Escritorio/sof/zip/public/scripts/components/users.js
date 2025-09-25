
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { toast } from '../utils/helpers.js';

export function renderUsers(){
  const me = getCurrentUser();
  if (me.role !== 'Administrador') return '<div class="card"><div class="card-body">Acceso denegado.</div></div>';
  const { users } = getState();
  const rows = users.map(u=> `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.department||''}</td>
      <td><button class="btn small" data-role="${u.id}">Cambiar rol</button></td>
    </tr>
  `).join('');
  return `
    <div class="card">
      <div class="card-head"><strong>Usuarios</strong></div>
      <div class="card-body table-wrap">
        <table class="table"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Departamento</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>`;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-role]');
  if (!btn) return;
  const id = btn.getAttribute('data-role');
  const st = getState();
  const i = st.users.findIndex(u => u.id === id);
  if (i<0) return;
  const order = ['Estudiante','Profesor','Administrador'];
  const next = order[(order.indexOf(st.users[i].role)+1)%order.length];
  st.users[i].role = next;
  setState(st);
  toast('Rol actualizado a '+next, 'success');
});
