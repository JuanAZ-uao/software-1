
export const qs = (s, r=document) => r.querySelector(s);
export const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

export function toast(msg, type='info'){
  const el = document.getElementById('toast');
  if (!el) return alert(msg);
  el.textContent = msg; el.className = 'toast show ' + type;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(()=> el.className='toast', 4000);
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
