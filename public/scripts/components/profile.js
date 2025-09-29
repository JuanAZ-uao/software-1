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
          <h2 class="mt-16" style="margin:0">${u.name} ${u.lastname||''}</h2>
          <div class="muted">${u.role} — ${u.department || ''}</div>
          <div class="muted">${u.email||''}</div>
          <div class="muted">${u.phone||''}</div>
        </div>
      </div>
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Editar perfil</strong></div>
        <div class="card-body">
          <form id="profileForm" class="flex-col gap-12">
            <div><label class="label">Nombre</label><input class="input" name="name" value="${u.name||''}"></div>
            <div><label class="label">Apellido</label><input class="input" name="lastname" value="${u.lastname||''}"></div>
            <div><label class="label">Correo electrónico</label><input class="input" name="email" type="email" value="${u.email||''}"></div>
            <div><label class="label">Teléfono</label><input class="input" name="phone" type="tel" value="${u.phone||''}"></div>
            <!-- Campos de bio e intereses eliminados -->
            <button class="btn primary">Guardar</button>
          </form>
        </div>
        <hr style="margin:32px 0;">
        <div class="card-head"><strong>Cambiar contraseña</strong></div>
        <div class="card-body">
          <form id="passwordForm" class="flex-col gap-12">
            <div><label class="label">Contraseña actual</label><input class="input" name="currentPassword" type="password" required></div>
            <div><label class="label">Nueva contraseña</label><input class="input" name="newPassword" type="password" required></div>
            <div><label class="label">Confirmar nueva contraseña</label><input class="input" name="confirmPassword" type="password" required></div>
            <button class="btn primary">Cambiar contraseña</button>
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
    auth.name = String(fd.get('name')||'');
    auth.lastname = String(fd.get('lastname')||'');
    auth.email = String(fd.get('email')||'');
    auth.phone = String(fd.get('phone')||'');
  // Campos de bio e intereses eliminados
    localStorage.setItem('uc_auth', JSON.stringify(auth));
    toast('Perfil actualizado','success');
  }
  if (e.target?.id === 'passwordForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const auth = JSON.parse(localStorage.getItem('uc_auth'));
    const current = String(fd.get('currentPassword')||'');
    const nueva = String(fd.get('newPassword')||'');
    const confirm = String(fd.get('confirmPassword')||'');
    if (!auth.password || current !== auth.password) {
      toast('La contraseña actual es incorrecta','error');
      return;
    }
    if (nueva.length < 6) {
      toast('La nueva contraseña debe tener al menos 6 caracteres','error');
      return;
    }
    if (nueva !== confirm) {
      toast('Las contraseñas no coinciden','error');
      return;
    }
    auth.password = nueva;
    localStorage.setItem('uc_auth', JSON.stringify(auth));
    toast('Contraseña actualizada','success');
    e.target.reset();
  }
});
