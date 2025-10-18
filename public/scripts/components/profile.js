/**
 * profile.js - Componente de perfil de usuario
 *
 * Este componente renderiza la vista de perfil, mostrando información del usuario
 * y permitiendo editar nombre, apellidos, teléfono y contraseña.
 * Se conecta con la API para actualizar los datos en la base de datos.
 */

import { getCurrentUser } from '../auth.js';
import { toast } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

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
          <img class="avatar" style="width:72px;height:72px" src="${u.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b372?w=64'}" alt="avatar" />
          <h2 class="mt-16" style="margin:0" id="profile-name">${u.name || ''}</h2>
          <div class="muted">${u.tipo || 'Usuario'}</div>
          <div class="muted" id="profile-email">${u.email || ''}</div>
          <div class="muted" id="profile-telefono">${u.telefono || ''}</div>
        </div>
      </div>
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Editar perfil</strong></div>
        <div class="card-body">
          <form id="profileForm" class="flex-col gap-12">
            <div><label class="label">Nombre</label><input class="input" name="nombre" value="${u.nombre || ''}" required></div>
            <div><label class="label">Apellidos</label><input class="input" name="apellidos" value="${u.apellidos || ''}" required></div>
            <div><label class="label">Correo electrónico</label><input class="input" name="email" type="email" value="${u.email || ''}" readonly style="background-color: #f5f5f5; cursor: not-allowed;"></div>
            <div><label class="label">Teléfono</label><input class="input" name="telefono" type="tel" value="${u.telefono || ''}" pattern="[0-9]{10}" title="Debe contener exactamente 10 dígitos" required></div>
            <button type="submit" class="btn primary" id="saveProfileBtn">Guardar cambios</button>
          </form>
        </div>
        
        <hr style="margin:32px 0;">
        <div class="card-head"><strong>Cambiar contraseña</strong></div>
        <div class="card-body">
          <form id="passwordForm" class="flex-col gap-12">
            <div><label class="label">Contraseña actual</label><input class="input" name="currentPassword" type="password" required></div>
            <div>
              <label class="label">Nueva contraseña</label>
              <input class="input" name="newPassword" type="password" minlength="6" required>
              <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">
                Mínimo 6 caracteres, debe incluir una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")
              </small>
            </div>
            <div><label class="label">Confirmar nueva contraseña</label><input class="input" name="confirmPassword" type="password" minlength="6" required></div>
            <button type="submit" class="btn primary" id="changePasswordBtn">Cambiar contraseña</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

/**
 * Actualiza el perfil del usuario en la base de datos
 */
async function updateProfile(profileData) {
  try {
    const response = await fetch('/api/users/profile/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });

    const result = await response.json();
    
    if (result.success) {
      // Actualizar localStorage con los nuevos datos
      const currentAuth = JSON.parse(localStorage.getItem('uc_auth'));
      const updatedAuth = {
        ...currentAuth,
        name: `${result.user.nombre} ${result.user.apellidos}`,
        nombre: result.user.nombre,
        apellidos: result.user.apellidos,
        telefono: result.user.telefono
      };
      localStorage.setItem('uc_auth', JSON.stringify(updatedAuth));
      
      // Actualizar la vista inmediatamente sin recargar toda la página
      updateProfileView(updatedAuth);
      
      toast('Perfil actualizado correctamente', 'success');
    } else {
      toast(result.message || 'Error actualizando perfil', 'error');
    }
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    toast('Error de conexión al actualizar perfil', 'error');
  }
}

/**
 * Actualiza los elementos visuales del perfil con los nuevos datos
 */
function updateProfileView(userData) {
  // Actualizar el nombre en la parte superior
  const profileName = document.getElementById('profile-name');
  if (profileName) {
    profileName.textContent = userData.name || '';
  }

  // Actualizar el teléfono en la parte superior
  const profileTelefono = document.getElementById('profile-telefono');
  if (profileTelefono) {
    profileTelefono.textContent = userData.telefono || '';
  }

  // Actualizar los campos del formulario con los nuevos valores
  const nombreInput = document.querySelector('input[name="nombre"]');
  if (nombreInput) {
    nombreInput.value = userData.nombre || '';
  }

  const apellidosInput = document.querySelector('input[name="apellidos"]');
  if (apellidosInput) {
    apellidosInput.value = userData.apellidos || '';
  }

  const telefonoInput = document.querySelector('input[name="telefono"]');
  if (telefonoInput) {
    telefonoInput.value = userData.telefono || '';
  }

  // También actualizar el header si existe
  const headerUserName = document.querySelector('.header .user-name');
  if (headerUserName) {
    headerUserName.textContent = userData.name || '';
  }
}

/**
 * Cambia la contraseña del usuario
 */
async function changePassword(passwordData) {
  try {
    const response = await fetch('/api/users/profile/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData)
    });

    const result = await response.json();
    
    if (result.success) {
      toast('Contraseña actualizada correctamente', 'success');
      document.getElementById('passwordForm').reset();
    } else {
      toast(result.message || 'Error actualizando contraseña', 'error');
    }
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    toast('Error de conexión al cambiar contraseña', 'error');
  }
}

/**
 * Valida que la contraseña cumpla con los requisitos de seguridad
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
  if (!password || password.length < 6) {
    return false;
  }
  
  // Verificar que tenga al menos una mayúscula
  const hasUpperCase = /[A-Z]/.test(password);
  
  // Verificar que tenga al menos un carácter especial
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?"]/.test(password);
  
  return hasUpperCase && hasSpecialChar;
}

/**
 * Listener global para manejar los formularios del perfil
 */
document.addEventListener('submit', async (e) => {
  if (e.target?.id === 'profileForm') {
    e.preventDefault();
    
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
    }
    
    const formData = new FormData(e.target);
    const user = getCurrentUser();
    
    const profileData = {
      idUsuario: user.id,
      nombre: formData.get('nombre').trim(),
      apellidos: formData.get('apellidos').trim(),
      telefono: formData.get('telefono').trim()
    };

    // Validaciones del frontend
    if (!profileData.nombre || !profileData.apellidos || !profileData.telefono) {
      toast('Todos los campos son requeridos', 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar cambios';
      }
      return;
    }

    if (!/^\d{10}$/.test(profileData.telefono)) {
      toast('El teléfono debe tener exactamente 10 dígitos', 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar cambios';
      }
      return;
    }

    await updateProfile(profileData);
    
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar cambios';
    }
  }

  if (e.target?.id === 'passwordForm') {
    e.preventDefault();
    
    const changeBtn = document.getElementById('changePasswordBtn');
    if (changeBtn) {
      changeBtn.disabled = true;
      changeBtn.textContent = 'Cambiando...';
    }
    
    const formData = new FormData(e.target);
    const user = getCurrentUser();
    
    const currentPassword = formData.get('currentPassword').trim();
    const newPassword = formData.get('newPassword').trim();
    const confirmPassword = formData.get('confirmPassword').trim();

    // Validaciones del frontend
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast('Todos los campos son requeridos', 'error');
      if (changeBtn) {
        changeBtn.disabled = false;
        changeBtn.textContent = 'Cambiar contraseña';
      }
      return;
    }

    if (!isValidPassword(newPassword)) {
      toast('La nueva contraseña debe tener al menos 6 caracteres, una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")', 'error');
      if (changeBtn) {
        changeBtn.disabled = false;
        changeBtn.textContent = 'Cambiar contraseña';
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('Las contraseñas no coinciden', 'error');
      if (changeBtn) {
        changeBtn.disabled = false;
        changeBtn.textContent = 'Cambiar contraseña';
      }
      return;
    }

    const passwordData = {
      idUsuario: user.id,
      currentPassword,
      newPassword
    };

    await changePassword(passwordData);
    
    if (changeBtn) {
      changeBtn.disabled = false;
      changeBtn.textContent = 'Cambiar contraseña';
    }
  }
});