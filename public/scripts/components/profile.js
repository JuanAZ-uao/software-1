/**
 * profile.js - Componente de perfil de usuario
 *
 * Este componente renderiza la vista de perfil, mostrando información del usuario
 * y permitiendo editar datos básicos y cambiar contraseña. Utiliza el usuario autenticado actual.
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
          <img class="avatar" style="width:72px;height:72px" src="${u.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b372?w=150'}" alt="avatar" />
          <h2 class="mt-16" style="margin:0">${u.name || u.nombre || ''} ${u.lastname || u.apellidos || ''}</h2>
          <div class="muted">${u.role || u.tipo || ''} — ${u.department || ''}</div>
          <div class="muted">${u.email||''}</div>
          <div class="muted">${u.phone || u.telefono ||''}</div>
        </div>
      </div>
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Editar perfil</strong></div>
        <div class="card-body">
          <form id="profileForm" class="flex-col gap-12">
            <div><label class="label">Nombre</label><input class="input" name="name" value="${u.name || u.nombre || ''}" required></div>
            <div><label class="label">Apellido</label><input class="input" name="lastname" value="${u.lastname || u.apellidos || ''}" required></div>
            <div><label class="label">Correo electrónico</label><input class="input" name="email" type="email" value="${u.email||''}" required></div>
            <div><label class="label">Teléfono</label><input class="input" name="phone" type="tel" value="${u.phone || u.telefono || ''}" required pattern="[0-9]{10}" title="Debe tener 10 dígitos"></div>
            <button class="btn primary" type="submit">Guardar</button>
          </form>
        </div>
        <hr style="margin:32px 0;">
        <div class="card-head"><strong>Cambiar contraseña</strong></div>
        <div class="card-body">
          <form id="passwordForm" class="flex-col gap-12">
            <div><label class="label">Contraseña actual</label><input class="input" name="currentPassword" type="password" required></div>
            <div><label class="label">Nueva contraseña</label><input class="input" name="newPassword" type="password" required minlength="6"></div>
            <div><label class="label">Confirmar nueva contraseña</label><input class="input" name="confirmPassword" type="password" required minlength="6"></div>
            <button class="btn primary" type="submit">Cambiar contraseña</button>
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
  
  // Usar idUsuario si existe, sino usar id, sino usar 1 por defecto (usuario simulado)
  const userId = auth.idUsuario || auth.id || 1;
  
  const profileData = {
    userId: userId,
    nombre: String(fd.get('name') || '').trim(),
    apellidos: String(fd.get('lastname') || '').trim(),
    email: String(fd.get('email') || '').trim(),
    telefono: String(fd.get('phone') || '').trim()
  };

  // Validaciones del lado del cliente
  if (!profileData.nombre || !profileData.apellidos || !profileData.email || !profileData.telefono) {
    toast('Todos los campos son requeridos', 'error');
    return;
  }

  if (!/^\d{10}$/.test(profileData.telefono)) {
    toast('El teléfono debe tener exactamente 10 dígitos', 'error');
    return;
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profileData.email)) {
    toast('Por favor ingresa un email válido', 'error');
    return;
  }

  console.log('🔄 Enviando actualización de perfil:', profileData);

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
      auth.nombre = result.user.nombre;
      auth.lastname = result.user.apellidos;
      auth.apellidos = result.user.apellidos;
      auth.email = result.user.email;
      auth.phone = result.user.telefono;
      auth.telefono = result.user.telefono;
      auth.idUsuario = result.user.idUsuario;
      
      localStorage.setItem('uc_auth', JSON.stringify(auth));
      
      toast('Perfil actualizado exitosamente', 'success');
      
      // Recargar la página para mostrar los datos actualizados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
  
  const currentPassword = String(fd.get('currentPassword') || '').trim();
  const newPassword = String(fd.get('newPassword') || '').trim();
  const confirmPassword = String(fd.get('confirmPassword') || '').trim();

  // Validaciones del lado del cliente
  if (!currentPassword || !newPassword || !confirmPassword) {
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

  if (currentPassword === newPassword) {
    toast('La nueva contraseña debe ser diferente a la actual', 'error');
    return;
  }

  // Usar idUsuario si existe, sino usar id, sino usar 1 por defecto (usuario simulado)
  const userId = auth.idUsuario || auth.id || 1;

  const passwordData = {
    userId: userId,
    currentPassword,
    newPassword,
    confirmPassword
  };

  console.log('🔄 Enviando cambio de contraseña para usuario:', userId);

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