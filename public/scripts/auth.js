
import { getState } from './utils/state.js';
import { qs, validateEmail, toast } from './utils/helpers.js';
import { navigateTo } from './utils/router.js';

export function isAuthenticated(){ return !!localStorage.getItem('uc_auth'); }
function setAuth(user){ localStorage.setItem('uc_auth', JSON.stringify(user)); }
export function getCurrentUser(){ try { return JSON.parse(localStorage.getItem('uc_auth') || 'null'); } catch { return null; } }
export function logout(){ localStorage.removeItem('uc_auth'); navigateTo('login'); }

export function renderAuthView(){
  return `
    <h1 class="auth-title">Universidad Connect</h1>
    <p class="auth-sub">Inicia sesión o crea una cuenta</p>
    <form id="loginForm" class="flex-col gap-12">
      <div><label class="label">Email</label><input class="input" name="email" type="email" placeholder="tu@uni.edu" required></div>
      <div><label class="label">Contraseña</label><input class="input" name="password" type="password" placeholder="••••••" required></div>
      <button class="btn primary" type="submit">Entrar</button>
      <div class="mt-8">
        <small>Usuarios demo:</small>
        <div class="mt-8 flex gap-8">
          <button class="btn small" data-demo="estudiante@uni.edu" type="button">Estudiante</button>
          <button class="btn small" data-demo="profesor@uni.edu" type="button">Profesor</button>
          <button class="btn small" data-demo="admin@uni.edu" type="button">Administrador</button>
        </div>
      </div>
    </form>
  `;
}

document.addEventListener('submit', (e) => {
  if (e.target?.id === 'loginForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get('email')||'').trim();
    const password = String(fd.get('password')||'').trim();
    if (!validateEmail(email)) return toast('Email inválido','error');
    if (!password) return toast('Contraseña requerida','error');
    const { users } = getState();
    const user = users.find(u => u.email === email);
    if (!user) return toast('Usuario no existe','error');
    if (password !== '123456') return toast('Credenciales incorrectas','error');
    setAuth(user);
    toast(`¡Bienvenido, ${user.name}!`,'success');
    location.hash = '#dashboard';
  }
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-demo]');
  if (btn) {
    const email = btn.getAttribute('data-demo');
    const input = qs('input[name="email"]');
    const pass = qs('input[name="password"]');
    if (input) input.value = email;
    if (pass) pass.value = '123456';
  }
});
