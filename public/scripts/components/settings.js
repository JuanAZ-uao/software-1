/**
 * settings.js - Componente de configuración de usuario
 *
 * Este componente renderiza la vista de configuración, permitiendo cambiar el tema
 * y las preferencias de notificaciones. Utiliza localStorage para persistir opciones.
 */

export function renderSettings(){
  const theme = localStorage.getItem('uc_theme')||'light';
  const notifEmail = localStorage.getItem('uc_notif_email')==='1';
  const notifSystem = localStorage.getItem('uc_notif_system')==='1';

  return `
    <div class="card">
      <div class="card-head"><strong>Configuración</strong></div>
      <div class="card-body flex-col gap-12">
        <div>
          <div class="label">Tema</div>
          <button id="themeToggle2" class="btn">Modo ${theme==='dark'?'claro':'oscuro'}</button>
        </div>
        <div>
          <div class="label">Notificaciones</div>
          <label><input type="checkbox" id="notifEmail" ${notifEmail?'checked':''}/> Email</label>
          <label class="ml-8" style="margin-left:12px"><input type="checkbox" id="notifSystem" ${notifSystem?'checked':''}/> Sistema</label>
        </div>
      </div>
    </div>
  `;
}

/**
 * Listeners globales para cambios de tema y notificaciones
 */
document.addEventListener('click', (e) => {
  if (e.target?.id === 'themeToggle2') {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const mode = html.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('uc_theme', mode);
    e.target.textContent = 'Modo ' + (mode==='dark'?'claro':'oscuro');
  }
});

document.addEventListener('change', (e) => {
  if (e.target?.id === 'notifEmail') localStorage.setItem('uc_notif_email', e.target.checked?'1':'0');
  if (e.target?.id === 'notifSystem') localStorage.setItem('uc_notif_system', e.target.checked?'1':'0');
});
