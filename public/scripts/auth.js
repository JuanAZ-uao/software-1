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
 * - Sistema de recuperación de contraseña con Gmail API
 */

import { navigateTo } from './utils/router.js';
import { toast } from './utils/helpers.js';

// URL base de la API backend
const API_BASE = 'http://localhost:3000/api';

/**
 * Verifica si el usuario está autenticado (token en localStorage)
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!sessionStorage.getItem('uc_auth');
}

/**
 * Valida la autenticación con el servidor
 * Limpia la sesión si el token es inválido
 * @returns {Promise<boolean>}
 */
export async function validateAuthentication() {
  if (!isAuthenticated()) {
    return false;
  }

  try {
    const token = getCurrentUser()?.token || sessionStorage.getItem('uc_auth_token');
    
    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Token inválido o expirado
      console.log('⚠️ Token inválido o expirado');
      logout();
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error validating authentication:', err);
    logout();
    return false;
  }
}

/**
 * Obtiene el usuario autenticado actual desde localStorage
 * @returns {object|null}
 */
export function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem('uc_auth') || 'null');
  } catch {
    return null;
  }
}

/**
 * Cierra la sesión del usuario y navega a home
 */
export function logout() {
  try {
    sessionStorage.removeItem('uc_auth');
    sessionStorage.removeItem('uc_auth_token');
    sessionStorage.removeItem('uc_state');
  } catch (e) {
    // ignore
  }

  // Intentar navegar con el router SPA si está disponible, de lo contrario ajustar el hash
  try {
    if (typeof navigateTo === 'function') {
      navigateTo('home');
    } else {
      window.location.hash = '#home';
    }
  } catch (e) {
    window.location.hash = '#home';
  }

  // Disparar manualmente el evento de cambio de hash para forzar re-render
  setTimeout(() => {
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { window.location.reload(); }
  }, 20);
}

/**
 * Guarda el usuario autenticado en localStorage
 * @param {object} user
 */
function setAuth(user) {
  sessionStorage.setItem('uc_auth', JSON.stringify(user));
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
 * Función SIMPLIFICADA para navegar al login
 */
function goToLogin() {
  console.log('🔄 Navegando al login...');
  
  // Método directo: recargar la página principal
  window.location.href = '/';
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
    // Guardar token JWT si está disponible
    if (data.token) {
      sessionStorage.setItem('uc_auth_token', data.token);
    }
    showMessage('¡Bienvenido!', 'success');
    
    // Navegar al dashboard usando el router SPA
    setTimeout(() => {
      console.log('🔄 Redirigiendo a dashboard después de login...');
      
      // Importar y llamar a loadInitialData si es necesario
      import('./app.js').then(({ loadInitialData }) => {
        if (loadInitialData && typeof loadInitialData === 'function') {
          loadInitialData().catch(err => console.error('Error cargando datos iniciales:', err));
        }
      }).catch(err => console.log('No loadInitialData disponible:', err));
      
      if (typeof navigateTo === 'function') {
        navigateTo('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
      
      // Forzar renderizado del router después de cambiar el hash
      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 50);
    }, 1000);
  } catch (error) {
    toast(error.message || 'Error en el login', 'error');
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
    toast(error.message || 'Error en el registro', 'error');
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
  }, 8000);
}

/**
 * Crea dinámicamente el formulario de restablecer contraseña usando JavaScript puro
 * @param {string} token Token de recuperación
 */
function createResetPasswordForm(token) {
  // Limpiar contenido actual
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Crear elementos del formulario
  const container = document.createElement('div');
  container.className = 'auth-container';

  const form = document.createElement('div');
  form.className = 'auth-form';

  const title = document.createElement('h1');
  title.className = 'auth-title';
  title.textContent = '🔐 Restablecer Contraseña';

  const subtitle = document.createElement('p');
  subtitle.className = 'muted';
  subtitle.style.textAlign = 'center';
  subtitle.style.marginBottom = '20px';
  subtitle.textContent = 'Universidad Connect';

  const resetForm = document.createElement('form');
  resetForm.id = 'resetPasswordForm';

  // Campo nueva contraseña
  const newPasswordGroup = document.createElement('div');
  newPasswordGroup.className = 'form-group';
  
  const newPasswordLabel = document.createElement('label');
  newPasswordLabel.textContent = 'Nueva Contraseña';
  
  const newPasswordInput = document.createElement('input');
  newPasswordInput.type = 'password';
  newPasswordInput.name = 'password';
  newPasswordInput.required = true;
  newPasswordInput.placeholder = '••••••';
  newPasswordInput.minLength = 6;
  
  const newPasswordHelp = document.createElement('small');
  newPasswordHelp.style.color = '#666';
  newPasswordHelp.style.fontSize = '12px';
  newPasswordHelp.style.marginTop = '4px';
  newPasswordHelp.style.display = 'block';
  newPasswordHelp.textContent = 'Mínimo 6 caracteres, debe incluir una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")';

  newPasswordGroup.appendChild(newPasswordLabel);
  newPasswordGroup.appendChild(newPasswordInput);
  newPasswordGroup.appendChild(newPasswordHelp);

  // Campo confirmar contraseña
  const confirmPasswordGroup = document.createElement('div');
  confirmPasswordGroup.className = 'form-group';
  
  const confirmPasswordLabel = document.createElement('label');
  confirmPasswordLabel.textContent = 'Confirmar Nueva Contraseña';
  
  const confirmPasswordInput = document.createElement('input');
  confirmPasswordInput.type = 'password';
  confirmPasswordInput.name = 'confirmPassword';
  confirmPasswordInput.required = true;
  confirmPasswordInput.placeholder = '••••••';
  confirmPasswordInput.minLength = 6;

  confirmPasswordGroup.appendChild(confirmPasswordLabel);
  confirmPasswordGroup.appendChild(confirmPasswordInput);

  // Botón submit
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'btn primary';
  submitButton.id = 'resetBtn';
  submitButton.textContent = 'Restablecer Contraseña';

  // ✅ SOLUCION SIMPLIFICADA: Botón directo en lugar de enlace
  const backDiv = document.createElement('div');
  backDiv.style.textAlign = 'center';
  backDiv.style.marginTop = '16px';
  
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'btn';
  backButton.style.backgroundColor = 'transparent';
  backButton.style.border = 'none';
  backButton.style.color = '#666';
  backButton.style.fontSize = '14px';
  backButton.style.cursor = 'pointer';
  backButton.style.textDecoration = 'underline';
  backButton.textContent = '← Volver al login';
  
  // ✅ Event listener SIMPLIFICADO - solo un método
  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    console.log('🔄 Click en volver al login - método simplificado');
    goToLogin();
  });

  backDiv.appendChild(backButton);

  // Mensaje
  const messageDiv = document.createElement('div');
  messageDiv.id = 'reset-message';
  messageDiv.className = 'message';
  messageDiv.style.display = 'none';

  // Construir formulario
  resetForm.appendChild(newPasswordGroup);
  resetForm.appendChild(confirmPasswordGroup);
  resetForm.appendChild(submitButton);

  form.appendChild(title);
  form.appendChild(subtitle);
  form.appendChild(resetForm);
  form.appendChild(backDiv);
  form.appendChild(messageDiv);

  container.appendChild(form);
  app.appendChild(container);

  // Event listener para el formulario
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resetBtn = document.getElementById('resetBtn');
    const messageEl = document.getElementById('reset-message');
    const password = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // Validaciones
    if (!password || !confirmPassword) {
      showResetMessage('Todos los campos son requeridos', 'error', messageEl);
      return;
    }

    if (!isValidPassword(password)) {
      showResetMessage('La contraseña debe tener al menos 6 caracteres, una mayúscula y un carácter especial', 'error', messageEl);
      return;
    }

    if (password !== confirmPassword) {
      showResetMessage('Las contraseñas no coinciden', 'error', messageEl);
      return;
    }

    // Deshabilitar botón
    resetBtn.disabled = true;
    resetBtn.textContent = 'Restableciendo...';

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const result = await response.json();

      if (result.success) {
        showResetMessage(result.message, 'success', messageEl);
        resetForm.reset();
        
        // ✅ CAMBIO: Usar la función simplificada
        setTimeout(() => {
          console.log('✅ Contraseña cambiada exitosamente, redirigiendo al login...');
          goToLogin();
        }, 2000);
      } else {
        showResetMessage(result.message, 'error', messageEl);
      }
    } catch (error) {
      console.error('Error:', error);
      showResetMessage('Error de conexión. Inténtalo de nuevo.', 'error', messageEl);
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Restablecer Contraseña';
    }
  });
}

/**
 * Muestra mensaje en el formulario de reset
 */
function showResetMessage(text, type, messageEl) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 8000);
}

/**
 * Renderiza el formulario de login/registro y recuperación como HTML
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
          <div style="text-align:right; margin-top:8px;">
            <a href="#" id="forgotPasswordLink" style="font-size:13px;">¿Olvidaste tu contraseña?</a>
          </div>
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
              <label>Documento</label>
              <input type="text" name="documento" required placeholder="Número de documento">
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
              <input type="password" name="password" required placeholder="••••••" minlength="6">
              <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">
                Mínimo 6 caracteres, debe incluir una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")
              </small>
            </div>
            <div class="form-group">
              <label>Tipo de Usuario</label>
              <select name="tipo" required id="tipoSelect">
                <option value="">Selecciona...</option>
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="secretaria">Secretaría Académica</option>
              </select>
            </div>
            <!-- Campos condicionales según el tipo -->
            <div class="form-group" id="facultadGroup" style="display:none">
              <label>Facultad</label>
              <select name="facultad" id="facultadSelect">
                <option value="">Selecciona...</option>
              </select>
              <input type="text" id="facultadInput" style="display:none" placeholder="Escribe el nombre de la facultad">
            </div>
            <div class="form-group" id="programaGroup" style="display:none">
              <label>Programa</label>
              <select name="programa" id="programaSelect">
                <option value="">Selecciona...</option>
              </select>
              <input type="text" id="programaInput" style="display:none" placeholder="Escribe el nombre del programa">
            </div>
            <div class="form-group" id="unidadGroup" style="display:none">
              <label>Unidad Académica</label>
              <select name="unidad" id="unidadSelect">
               
              </select>
              <input type="text" id="unidadInput" style="display:none" placeholder="Escribe el nombre de la unidad">
            </div>
            <button type="submit" class="btn primary">Registrarse</button>
          </form>
        </div>
        <div id="forgot-form" class="tab-content" style="display:none">
          <form id="forgotForm">
            <div class="form-group">
              <label>Ingresa tu email para recuperar tu contraseña</label>
              <input type="email" name="email" required placeholder="tu@universidad.edu">
              <small style="color: #666; font-size: 12px; margin-top: 4px; display: block;">
                Se enviará un enlace a tu correo que expirará en 15 minutos
              </small>
            </div>
            <button type="submit" class="btn primary" id="forgotBtn">Enviar Enlace de Recuperación</button>
            <button type="button" class="btn" id="backToLogin" style="margin-left:8px;">Volver</button>
          </form>
        </div>
        <div id="message" class="message"></div>
      </div>
    </div>
  `;
}

/**
 * Vuelve a conectar los event listeners de login/registro/recuperación tras renderizar la vista
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
        // Read selects/inputs by id to avoid name mismatches
        const tipo = formData.get('tipo');
        const nombre = (formData.get('nombre') || '').trim();
        const apellidos = (formData.get('apellidos') || '').trim();
        const documento = (formData.get('documento') || '').trim();
        const email = (formData.get('email') || '').trim();
        const telefono = (formData.get('telefono') || '').trim();
        const password = (formData.get('password') || '').trim();

        // helper to read select + optional manual input
        const readSelectOrManual = (selectId, manualInputId) => {
          const sel = document.getElementById(selectId);
          const manual = document.getElementById(manualInputId);
          if (!sel) return '';
          if (sel.value === '__manual__') {
            return manual ? manual.value.trim() : '';
          }
          return sel.value;
        };

        const userData = {
          nombre,
          apellidos,
          documento,
          email,
          telefono,
          password,
          tipo,
          programa: readSelectOrManual('programaSelect', 'programaInput'),
          facultad: readSelectOrManual('facultadSelect', 'facultadInput'),
          unidad: readSelectOrManual('unidadSelect', 'unidadInput')
        };
      if (!userData.nombre || !userData.apellidos || !userData.email || !userData.telefono || !userData.password || !userData.tipo) {
        showMessage('Por favor completa todos los campos', 'error');
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
      if (!isValidPassword(userData.password)) {
        showMessage('La contraseña debe tener al menos 6 caracteres, una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")', 'error');
        return;
      }
      await register(userData);
    });
  }

  // Mostrar formulario de recuperación
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.remove('active');
      document.getElementById('register-form').classList.remove('active');
      document.getElementById('forgot-form').style.display = 'block';
      document.getElementById('forgot-form').classList.add('active');
    });
  }

  // Volver a login desde recuperación
  const backBtn = document.getElementById('backToLogin');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('forgot-form').style.display = 'none';
      document.getElementById('forgot-form').classList.remove('active');
      document.getElementById('login-form').classList.add('active');
    });
  }

  // Enviar solicitud de recuperación por EMAIL REAL con Gmail API
  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = forgotForm.email.value.trim();
      const forgotBtn = document.getElementById('forgotBtn');
      
      if (!email) return showMessage('Ingresa tu email', 'error');
      
      // Deshabilitar botón mientras se envía
      forgotBtn.disabled = true;
      forgotBtn.textContent = 'Enviando...';
      
      try {
        const response = await apiCall('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        
        showMessage(response.message, 'success');
        forgotForm.reset();
        
        // Volver a login después de mostrar el mensaje
        setTimeout(() => {
          document.getElementById('forgot-form').style.display = 'none';
          document.getElementById('forgot-form').classList.remove('active');
          document.getElementById('login-form').classList.add('active');
        }, 3000);
        
      } catch (err) {
        showMessage('Error al enviar el email de recuperación', 'error');
      } finally {
        forgotBtn.disabled = false;
        forgotBtn.textContent = 'Enviar Enlace de Recuperación';
      }
    });
  }

  // Cargar programas y facultades en los selects
  const tipoSelect = document.getElementById('tipoSelect');
  if (tipoSelect) {
    tipoSelect.addEventListener('change', (e) => {
      handleTipoChange(e.target.value);
    });
  }

  // Cargar catálogo de programas/facultades al iniciar
  if (isAuthenticated()) {
    const user = getCurrentUser();
    if (user.tipo === 'estudiante') {
      loadCatalog('programas', 'programaSelect', 'programaInput');
    } else if (user.tipo === 'docente') {
      loadCatalog('facultades', 'facultadSelect', 'facultadInput');
    }
  }
}

/**
 * Detecta si estamos en la página de reset y maneja el token
 */
export function handleResetPasswordPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (window.location.pathname === '/reset-password' && token) {
    createResetPasswordForm(token);
    return true;
  }
  return false;
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
 * Carga un catálogo de la API a un select
 * @param {string} endpoint El endpoint de la API
 * @param {string} selectId El ID del select a llenar
 * @param {string} inputId El ID del input de texto (opcional)
 */
async function loadCatalog(endpoint, selectId, inputId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);
  if (!select) return;
  select.innerHTML = '<option value="">Selecciona...</option>';
  try {
    const res = await fetch(`http://localhost:3000/api/catalog/${endpoint}`);
    const items = await res.json();
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.idPrograma || item.idFacultad || item.idUnidad;
      opt.textContent = item.nombre;
      select.appendChild(opt);
    });
    // Opción para escribir manualmente
    const manualOpt = document.createElement('option');
    manualOpt.value = '__manual__';
    manualOpt.textContent = 'Otro (escribir manualmente)';
    select.appendChild(manualOpt);

    select.addEventListener('change', () => {
      if (select.value === '__manual__') {
        input.style.display = '';
      } else {
        input.style.display = 'none';
      }
    });
  } catch (e) {
    select.innerHTML = '<option value="">Error al cargar</option>';
  }
}

// Llama esto cuando el usuario selecciona tipo
function handleTipoChange(tipo) {
  // Mostrar/ocultar grupos
  const programaGroup = document.getElementById('programaGroup');
  const facultadGroup = document.getElementById('facultadGroup');
  const unidadGroup = document.getElementById('unidadGroup');
  const programaSelect = document.getElementById('programaSelect');
  const facultadSelect = document.getElementById('facultadSelect');
  const unidadSelect = document.getElementById('unidadSelect');

  programaGroup.style.display = tipo === 'estudiante' ? '' : 'none';
  unidadGroup.style.display = tipo === 'docente' ? '' : (tipo === 'secretaria' ? 'none' : 'none');
  facultadGroup.style.display = tipo === 'secretaria' ? '' : (tipo === 'docente' ? 'none' : 'none');

  // Intercambia los labels
  if (tipo === 'docente') {
    document.querySelector('#unidadGroup label').textContent = 'Unidad Académica';
    loadCatalog('unidades', 'unidadSelect', 'unidadInput');
    unidadSelect.required = true;
    facultadSelect.required = false;
    programaSelect.required = false;
  } else if (tipo === 'secretaria') {
    document.querySelector('#facultadGroup label').textContent = 'Facultad';
    loadCatalog('facultades', 'facultadSelect', 'facultadInput');
    facultadSelect.required = true;
    unidadSelect.required = false;
    programaSelect.required = false;
  } else if (tipo === 'estudiante') {
    loadCatalog('programas', 'programaSelect', 'programaInput');
    programaSelect.required = true;
    facultadSelect.required = false;
    unidadSelect.required = false;
  } else {
    programaSelect.required = false;
    facultadSelect.required = false;
    unidadSelect.required = false;
  }
}

// Solo redirigir al dashboard si ya está autenticado y la ruta es exactamente login
if (isAuthenticated() && location.hash === '#login') {
  const user = getCurrentUser();
  if (user && user.email && user.id) {
    navigateTo('dashboard');
  } else {
    // Si el usuario no es válido, limpiar sesión
    sessionStorage.removeItem('uc_auth');
  }
}