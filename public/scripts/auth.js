/**
 * auth.js - Lógica de autenticación frontend para Universidad Connect
 *
 * Este archivo gestiona el flujo de autenticación del lado del cliente:
 * - Login y registro de usuarios
 * - Manejo de sesión con localStorage
 * - Comunicación con la API backend
 * - Renderizado de la vista de autenticación
 * - Validación de formularios y mensajes de usuario
 * - Navegación SPA tras login/logout
 */

import { navigateTo } from './utils/router.js';

// URL base de la API backend
const API_BASE = 'http://localhost:3000/api';

/**
 * Verifica si el usuario está autenticado (token en localStorage)
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('uc_auth');
}

/**
 * Obtiene el usuario autenticado actual desde localStorage
 * @returns {object|null}
 */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('uc_auth') || 'null');
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión del usuario y navega a login
 */
export function logout() {
  localStorage.removeItem('uc_auth');
  if (typeof navigateTo === 'function') {
    navigateTo('login');
  } else {
    window.location.hash = '#login';
  }
}

/**
 * Guarda el usuario autenticado en localStorage
 * @param {object} user
 */
function setAuth(user) {
  localStorage.setItem('uc_auth', JSON.stringify(user));
}

/**
 * Realiza una llamada a la API backend
 * @param {string} endpoint
 * @param {object} options Opciones fetch
 * @returns {Promise<object>} Respuesta JSON
 */
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error en la petición');
  }
  return data;
}

/**
 * Inicia sesión con email y contraseña
 * @param {string} email
 * @param {string} password
 */
async function login(email, password) {
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuth(data.user);
    showMessage('¡Bienvenido!', 'success');
    // Navegar al dashboard usando el router SPA
    setTimeout(() => {
      if (typeof navigateTo === 'function') {
        navigateTo('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
      // Forzar renderizado del router
      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 10);
    }, 1000);
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

/**
 * Registra un nuevo usuario
 * @param {object} userData
 */
async function register(userData) {
  try {
    console.log('🔵 Frontend - Enviando datos de registro:', userData);
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    console.log('✅ Usuario registrado exitosamente:', data);
    showMessage('¡Usuario registrado exitosamente! Ahora puedes iniciar sesión.', 'success');
    document.getElementById('registerForm').reset();
    // Cambiar a tab de login después de 2 segundos
    setTimeout(() => {
      document.querySelector('[data-tab="login"]').click();
    }, 2000);
  } catch (error) {
    console.error('❌ Error en registro:', error);
    showMessage(error.message, 'error');
  }
}

/**
 * Muestra un mensaje en la interfaz
 * @param {string} text
 * @param {string} type info|success|error
 */
function showMessage(text, type = 'info') {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

/**
 * Renderiza el formulario de login/registro como HTML
 * @returns {string}
 */
export function renderAuthView() {
  return `
    <div class="auth-container">
      <div class="auth-form">
        <h1 class="auth-title">Universidad Connect</h1>
        <div class="tabs">
          <button class="tab-btn active" data-tab="login">Iniciar Sesión</button>
          <button class="tab-btn" data-tab="register">Registrarse</button>
        </div>
        <div id="login-form" class="tab-content active">
          <form id="loginForm">
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" required placeholder="tu@universidad.edu">
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" name="password" required placeholder="••••••">
            </div>
            <button type="submit" class="btn primary">Iniciar Sesión</button>
          </form>
        </div>
        <div id="register-form" class="tab-content">
          <form id="registerForm">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" name="nombre" required placeholder="Tu nombre">
            </div>
            <div class="form-group">
              <label>Apellidos</label>
              <input type="text" name="apellidos" required placeholder="Tus apellidos">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" required placeholder="tu@universidad.edu">
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="tel" name="telefono" required placeholder="1234567890">
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" name="password" required placeholder="••••••">
            </div>
            <div class="form-group">
              <label>Tipo de Usuario</label>
              <select name="tipo" required>
                <option value="">Selecciona...</option>
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="secretaria">Secretaría Académica</option>
              </select>
            </div>
            <button type="submit" class="btn primary">Registrarse</button>
          </form>
        </div>
        <div id="message" class="message"></div>
      </div>
    </div>
  `;
}

/**
 * Vuelve a conectar los event listeners de login/registro tras renderizar la vista
 */
export function bindAuthEvents() {
  // Tabs functionality
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${tabName}-form`).classList.add('active');
    });
  });
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const email = formData.get('email').trim();
      const password = formData.get('password').trim();
      if (!email || !password) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
      }
      await login(email, password);
    });
  }
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const userData = {
        nombre: formData.get('nombre').trim(),
        apellidos: formData.get('apellidos').trim(),
        email: formData.get('email').trim(),
        telefono: formData.get('telefono').trim(),
        password: formData.get('password').trim(),
        tipo: formData.get('tipo')
      };
      if (!userData.nombre || !userData.apellidos || !userData.email || !userData.telefono || !userData.password || !userData.tipo) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
      }
      if (!userData.password || userData.password.trim().length === 0) {
        showMessage('La contraseña no puede estar vacía', 'error');
        return;
      }
      if (!/^\d{10}$/.test(userData.telefono)) {
        showMessage('El teléfono debe tener exactamente 10 dígitos', 'error');
        return;
      }
      if (!validateEmail(userData.email)) {
        showMessage('Por favor ingresa un email válido', 'error');
        return;
      }
      await register(userData);
    });
  }
}

/**
 * Valida el formato de un email
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Solo redirigir al dashboard si ya está autenticado y la ruta es exactamente login
if (isAuthenticated() && location.hash === '#login') {
  const user = getCurrentUser();
  if (user && user.email && user.id) {
    navigateTo('dashboard');
  } else {
    // Si el usuario no es válido, limpiar sesión
    localStorage.removeItem('uc_auth');
  }
}
