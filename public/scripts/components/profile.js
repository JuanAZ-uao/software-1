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
document.addEventListener('submit', async (e) => {
  if (e.target?.id === 'profileForm') {
    e.preventDefault();
    await handleProfileUpdate(e.target);
  }
  if (e.target?.id === 'passwordForm') {
    e.preventDefault();
    await handlePasswordChange(e.target);
  }
});

/**
 * Maneja la actualización del perfil enviando datos al servidor
 */
async function handleProfileUpdate(form) {
  const fd = new FormData(form);
  const auth = JSON.parse(localStorage.getItem('uc_auth'));
  
  const profileData = {
    userId: auth.id, // ID del usuario actual
    nombre: String(fd.get('name') || ''),
    apellidos: String(fd.get('lastname') || ''),
    email: String(fd.get('email') || ''),
    telefono: String(fd.get('phone') || '')
  };

  try {
    const response = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Actualizar datos en localStorage con los datos del servidor
      auth.name = result.user.nombre;
      auth.lastname = result.user.apellidos;
      auth.email = result.user.email;
      auth.phone = result.user.telefono;
      localStorage.setItem('uc_auth', JSON.stringify(auth));
      
      toast('Perfil actualizado exitosamente', 'success');
      
      // Recargar la página para mostrar los datos actualizados
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast(result.message || 'Error al actualizar el perfil', 'error');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    toast('Error de conexión al actualizar el perfil', 'error');
  }
}

/**
 * Maneja el cambio de contraseña enviando datos al servidor
 */
async function handlePasswordChange(form) {
  const fd = new FormData(form);
  const auth = JSON.parse(localStorage.getItem('uc_auth'));
  
  const currentPassword = String(fd.get('currentPassword') || '');
  const newPassword = String(fd.get('newPassword') || '');
  const confirmPassword = String(fd.get('confirmPassword') || '');

  // Validaciones del lado del cliente
  if (!currentPassword || !newPassword) {
    toast('Todos los campos son requeridos', 'error');
    return;
  }

  if (newPassword.length < 6) {
    toast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    toast('Las contraseñas no coinciden', 'error');
    return;
  }

  const passwordData = {
    userId: auth.id,
    currentPassword,
    newPassword,
    confirmPassword
  };

  try {
    const response = await fetch('http://localhost:3000/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passwordData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      toast('Contraseña actualizada exitosamente', 'success');
      form.reset();
    } else {
      toast(result.message || 'Error al cambiar la contraseña', 'error');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    toast('Error de conexión al cambiar la contraseña', 'error');
  }
}
