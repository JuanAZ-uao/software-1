import { navigateTo } from './utils/router.js';

// URL base de la API backend
const API_BASE = 'http://localhost:3000/api';

export function isAuthenticated() {
  return !!localStorage.getItem('uc_auth');
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('uc_auth') || 'null');
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('uc_auth');
  if (typeof navigateTo === 'function') {
    navigateTo('login');
  } else {
    window.location.hash = '#login';
  }
}

function setAuth(user) {
  localStorage.setItem('uc_auth', JSON.stringify(user));
}

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

async function login(email, password) {
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuth(data.user);
    showMessage('¡Bienvenido!', 'success');
    setTimeout(() => {
      if (typeof navigateTo === 'function') {
        navigateTo('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 10);
    }, 1000);
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

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
    setTimeout(() => {
      document.querySelector('[data-tab="login"]').click();
    }, 2000);
  } catch (error) {
    console.error('❌ Error en registro:', error);
    showMessage(error.message, 'error');
  }
}

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
              <select name="tipo" required id="tipoSelect">
                <option value="">Selecciona...</option>
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="secretaria">Secretaría Académica</option>
              </select>
            </div>
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
              <select name="unidad" id="unidadSelect"></select>
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
            </div>
            <button type="submit" class="btn primary">Enviar token</button>
            <button type="button" class="btn" id="backToLogin" style="margin-left:8px;">Volver</button>
          </form>
        </div>
        <div id="token-form" class="tab-content" style="display:none">
          <form id="tokenForm">
            <div class="form-group">
              <label>Ingresa el token recibido</label>
              <input type="text" name="token" maxlength="4" required placeholder="Token de 4 caracteres">
            </div>
            <button type="submit" class="btn primary">Verificar token</button>
            <button type="button" class="btn" id="backToForgot" style="margin-left:8px;">Volver</button>
          </form>
        </div>
        <div id="reset-form" class="tab-content" style="display:none">
          <form id="resetForm">
            <div class="form-group">
              <label>Nueva contraseña</label>
              <input type="password" name="password" required placeholder="Nueva contraseña">
            </div>
            <button type="submit" class="btn primary">Cambiar contraseña</button>
          </form>
        </div>
        <div id="message" class="message"></div>
      </div>
    </div>
  `;
}

let recoveryEmail = '';
let recoveryToken = '';

export function bindAuthEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${tabName}-form`).classList.add('active');
    });
  });

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
        tipo: formData.get('tipo'),
        programa: formData.get('programaSelect') === '__manual__' ? formData.get('programaManual') : formData.get('programa'),
        facultad: formData.get('facultadSelect') === '__manual__' ? formData.get('facultadManual') : formData.get('facultad'),
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
      await register(userData);
    });
  }

  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('forgot-form').style.display = 'block';
      document.getElementById('forgot-form').classList.add('active');
    });
  }

  const backBtn = document.getElementById('backToLogin');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('forgot-form').style.display = 'none';
      document.getElementById('forgot-form').classList.remove('active');
      document.getElementById('login-form').classList.add('active');
    });
  }

  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = forgotForm.email.value.trim();
      if (!email) return showMessage('Ingresa tu email', 'error');
      try {
        await apiCall('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        recoveryEmail = email;
        showMessage('Token enviado. Revisa la consola del servidor.', 'info');
        document.getElementById('forgot-form').classList.remove('active');
        document.getElementById('token-form').style.display = 'block';
        document.getElementById('token-form').classList.add('active');
      } catch (err) {
        showMessage('Error al enviar el token', 'error');
      }
      forgotForm.reset();
    });
  }

  const backToForgot = document.getElementById('backToForgot');
  if (backToForgot) {
    backToForgot.addEventListener('click', () => {
      document.getElementById('token-form').style.display = 'none';
      document.getElementById('token-form').classList.remove('active');
      document.getElementById('forgot-form').classList.add('active');
    });
  }

  // Cambiado: ahora valida el token con el backend antes de mostrar el panel de cambio de contraseña
  const tokenForm = document.getElementById('tokenForm');
  if (tokenForm) {
    tokenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = tokenForm.token.value.trim().toUpperCase();
      if (!token || token.length !== 4) {
        showMessage('El token debe tener 4 caracteres', 'error');
        return;
      }
      try {
        await apiCall('/auth/validate-token', {
          method: 'POST',
          body: JSON.stringify({
            email: recoveryEmail,
            token
          })
        });
        recoveryToken = token;
        document.getElementById('token-form').classList.remove('active');
        document.getElementById('reset-form').style.display = 'block';
        document.getElementById('reset-form').classList.add('active');
      } catch (err) {
        // No mostrar mensaje, solo volver al login limpio
        document.getElementById('token-form').style.display = 'none';
        document.getElementById('token-form').classList.remove('active');
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('forgot-form').classList.remove('active');
        document.getElementById('reset-form').style.display = 'none';
        document.getElementById('reset-form').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
        // Limpia el mensaje si existe
        const messageEl = document.getElementById('message');
        if (messageEl) {
          messageEl.textContent = '';
          messageEl.style.display = 'none';
        }
      }
    });
  }

  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = resetForm.password.value.trim();
      if (!password || password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
      }
      try {
        await apiCall('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email: recoveryEmail,
            token: recoveryToken,
            password
          })
        });
        showMessage('Contraseña cambiada correctamente. Ahora puedes iniciar sesión.', 'success');
        setTimeout(() => {
          // Oculta todos los paneles de recuperación y muestra solo el login limpio
          document.getElementById('forgot-form').style.display = 'none';
          document.getElementById('forgot-form').classList.remove('active');
          document.getElementById('token-form').style.display = 'none';
          document.getElementById('token-form').classList.remove('active');
          document.getElementById('reset-form').style.display = 'none';
          document.getElementById('reset-form').classList.remove('active');
          document.getElementById('login-form').classList.add('active');
          // Limpia el mensaje si existe
          const messageEl = document.getElementById('message');
          if (messageEl) {
            messageEl.textContent = '';
            messageEl.style.display = 'none';
          }
        }, 1500);
      } catch (err) {
        showMessage('Token inválido o expirado', 'error');
      }
      resetForm.reset();
    });
  }

  const tipoSelect = document.getElementById('tipoSelect');
  if (tipoSelect) {
    tipoSelect.addEventListener('change', (e) => {
      handleTipoChange(e.target.value);
    });
  }

  if (isAuthenticated()) {
    const user = getCurrentUser();
    if (user.tipo === 'estudiante') {
      loadCatalog('programas', 'programaSelect', 'programaInput');
    } else if (user.tipo === 'docente') {
      loadCatalog('facultades', 'facultadSelect', 'facultadInput');
    }
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

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

function handleTipoChange(tipo) {
  const programaGroup = document.getElementById('programaGroup');
  const facultadGroup = document.getElementById('facultadGroup');
  const unidadGroup = document.getElementById('unidadGroup');
  const programaSelect = document.getElementById('programaSelect');
  const facultadSelect = document.getElementById('facultadSelect');
  const unidadSelect = document.getElementById('unidadSelect');

  programaGroup.style.display = tipo === 'estudiante' ? '' : 'none';
  unidadGroup.style.display = tipo === 'docente' ? '' : (tipo === 'secretaria' ? 'none' : 'none');
  facultadGroup.style.display = tipo === 'secretaria' ? '' : (tipo === 'docente' ? 'none' : 'none');

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

if (isAuthenticated() && location.hash === '#login') {
  const user = getCurrentUser();
  if (user && user.email && user.id) {
    navigateTo('dashboard');
  } else {
    localStorage.removeItem('uc_auth');
  }
}