
export const qs = (s, r=document) => r.querySelector(s);
export const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

export function toast(msg, type='info'){
  const el = document.getElementById('toast');
  if (!el) return alert(msg);
  el.textContent = msg; el.className = 'toast show ' + type;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(()=> el.className='toast', 4000);
}

/**
 * Wrapper para fetch que muestra toasts en errores y devuelve la respuesta JSON si aplica.
 * @param {string} url
 * @param {object} options
 */
export async function apiFetch(url, options = {}){
  try {
    const res = await fetch(url, options);
    let data = null;
    try { data = await res.json(); } catch (e) { /* no JSON */ }
    if (!res.ok) {
      const msg = data?.message || data?.error || `Error ${res.status}`;
      toast(msg, 'error');
      return { ok: false, status: res.status, data };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    toast('Error de conexión', 'error');
    return { ok: false, status: 0, error: err };
  }
}

/**
 * Wrapper para fetch con Authorization Bearer token (si existe en sessionStorage)
 */
export async function apiFetchWithAuth(url, options = {}){
  const token = sessionStorage.getItem('uc_auth_token') || null;
  const headers = { 'Accept': 'application/json', ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { ...options, headers };
  return await apiFetch(url, opts);
}

export function validateEmail(e){ return /.+@.+\..+/.test(String(e).toLowerCase()); }
export function validateURL(u){ try{ new URL(u); return true; }catch{ return false; } }
export function formatDate(iso){ try{ return new Date(iso).toLocaleDateString('es-CO'); }catch{ return iso; } }
export function todayISO(){ return new Date().toISOString().slice(0,10); }
export function validateFutureDate(iso){ try{ return new Date(iso) >= new Date(todayISO()); } catch { return false; } }
export function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

export function ensureTheme(){
  const t = localStorage.getItem('uc_theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
}
