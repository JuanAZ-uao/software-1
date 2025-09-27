/**
 * profile.js - Componente de perfil de usuario
 *
 * Este componente renderiza la vista de perfil, mostrando información del usuario
 * y permitiendo editar bio e intereses. Utiliza el usuario autenticado actual.
 */

import { getCurrentUser } from '../auth.js';
import { toast } from '../utils/helpers.js';

/**
 * Renderiza la vista de perfil de usuario con formulario de edición.
 * @returns {string} HTML de la vista de perfil
 */
export function renderProfile(){
  const u = getCurrentUser();
  return `
    <div class="grid">
      <div class="card col-4 col-12">
        <div class="card-body">
          <img class="avatar" style="width:72px;height:72px" src="${u.avatar}" alt="avatar" />
          <h2 class="mt-16" style="margin:0">${u.name}</h2>
          <div class="muted">${u.role} — ${u.department || ''}</div>
        </div>
      </div>
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Editar perfil</strong></div>
        <div class="card-body">
          <form id="profileForm" class="flex-col gap-12">
            <div><label class="label">Bio</label><textarea class="textarea" name="bio">${u.bio||''}</textarea></div>
            <div><label class="label">Intereses (coma separados)</label><input class="input" name="interests" value="${(u.interests||[]).join(', ')}"></div>
            <button class="btn primary">Guardar</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

/**
 * Listener global para guardar cambios en el perfil
 */
document.addEventListener('submit', (e) => {
  if (e.target?.id === 'profileForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const auth = JSON.parse(localStorage.getItem('uc_auth'));
    auth.bio = String(fd.get('bio')||'');
    auth.interests = String(fd.get('interests')||'').split(',').map(s=>s.trim()).filter(Boolean);
    localStorage.setItem('uc_auth', JSON.stringify(auth));
    toast('Perfil actualizado','success');
  }
});
