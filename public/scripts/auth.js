
// Frontend Auth - Conectado con BD real
const API_BASE = 'http://localhost:3000/api';

// Funciones de autenticación
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
  window.location.reload();
}

function setAuth(user) {
  localStorage.setItem('uc_auth', JSON.stringify(user));
}

// Funciones de API
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

// Login
async function login(email, password) {
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    setAuth(data.user);
    showMessage('¡Bienvenido!', 'success');
    
    // Redirigir al dashboard después del login
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1000);
    
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// Registro
async function register(userData) {
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    showMessage('¡Usuario registrado exitosamente! Ahora puedes iniciar sesión.', 'success');
    
    // Cambiar a tab de login
    document.querySelector('[data-tab="login"]').click();
    
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

// Mostrar mensajes
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Tabs functionality
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tabName}-form`).classList.add('active');
    });
  });
  
  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
  
  // Register form
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
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
    
    // Validaciones básicas
    if (!userData.nombre || !userData.apellidos || !userData.email || 
        !userData.telefono || !userData.password || !userData.tipo) {
      showMessage('Por favor completa todos los campos', 'error');
      return;
    }
    
    if (userData.password.length < 6) {
      showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    
    await register(userData);
  });
});

// Verificar si ya está logueado al cargar
if (isAuthenticated()) {
  window.location.href = '/dashboard.html';
}
