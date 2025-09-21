
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { qs, toast, todayISO, validateFutureDate } from '../utils/helpers.js';

const CATEGORIES = {
  'Académicos': ['Conferencias','Seminarios','Talleres','Cursos'],
  'Investigación': ['Presentaciones','Simposios','Congresos','Grupos de Estudio'],
  'Culturales': ['Festivales','Exposiciones','Obras de Teatro','Concursos'],
  'Deportivos': ['Torneos','Entrenamientos','Competencias','Actividades Recreativas'],
  'Sociales': ['Fiestas','Reuniones','Networking','Celebraciones'],
  'Voluntariado': ['Proyectos Comunitarios','Causas Benéficas','Campañas','Actividades Ambientales'],
  'Profesionales': ['Ferias de Empleo','Workshops','Capacitaciones','Mentorías'],
  'Tecnológicos': ['Hackathons','Bootcamps','Demos','Innovación'],
};

const STATUS = ['Borrador','Publicado','Cancelado'];

export function renderEvents(){
  const { events, organizations } = getState();
  const user = getCurrentUser();
  const isProf = user.role === 'Profesor';
  const isAdmin = user.role === 'Administrador';

  const tabs = STATUS.map(s=>`<button class="tab" data-tab="${s}">${s}</button>`).join('');

  const rows = (filterStatus='') => events
    .filter(e => !filterStatus || e.status === filterStatus)
    .map(e=> `
      <tr>
        <td>${e.title}</td>
        <td>${e.category} / ${e.subcategory}</td>
        <td>${e.date} ${e.time}</td>
        <td>${e.location}</td>
        <td><span class="badge">${e.status}</span></td>
        <td>${(isAdmin || isProf || e.organizerId === user.id) ? `<button class="btn small" data-edit="${e.id}">Editar</button>`: ''}</td>
      </tr>
    `).join('');

  const orgOptions = ['','- Ninguna -', ...organizations.map(o=>`${o.id}::${o.name}`)]
    .map(v=> {
      if (v === '' || v === '- Ninguna -') return `<option value="">${v||'- Seleccionar -'}</option>`;
      const [id,name] = v.split('::');
      return `<option value="${id}">${name}</option>`;
    }).join('');

  const catOptions = Object.keys(CATEGORIES).map(c=>`<option>${c}</option>`).join('');

  return `
    <div class="grid">
      <div class="card col-8 col-12">
        <div class="card-head">
          <strong>Eventos</strong>
          <div class="flex gap-8">
            <input id="eventSearch" class="input" placeholder="Buscar..." style="max-width:240px">
          </div>
        </div>
        <div class="card-body">
          <div class="tabs" id="evtTabs">${tabs}</div>
          <div class="table-wrap">
            <table class="table" id="eventsTable">
              <thead><tr><th>Título</th><th>Categoría</th><th>Fecha</th><th>Ubicación</th><th>Estado</th><th></th></tr></thead>
              <tbody>${rows('Publicado')}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card col-4 col-12">
        <div class="card-head"><strong>Crear / Editar evento</strong></div>
        <div class="card-body">
          <form id="eventForm" class="flex-col gap-12">
            <input type="hidden" name="id" />
            <div><label class="label">Título</label><input class="input" name="title" required></div>
            <div><label class="label">Descripción</label><textarea class="textarea" name="description"></textarea></div>
            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Categoría</label>
                <select class="select" name="category" id="evtCat" required>${catOptions}</select>
              </div>
              <div style="flex:1"><label class="label">Subcategoría</label>
                <select class="select" name="subcategory" id="evtSub" required></select>
              </div>
            </div>
            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Fecha</label><input class="input" name="date" type="date" min="${todayISO()}" required></div>
              <div style="flex:1"><label class="label">Hora</label><input class="input" name="time" type="time" required></div>
            </div>
            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Ubicación</label><input class="input" name="location" required></div>
              <div style="flex:1"><label class="label">Capacidad</label><input class="input" name="capacity" type="number" min="1" required></div>
            </div>
            <div><label class="label">Organización externa (opcional)</label>
              <select class="select" name="organizationId">${orgOptions}</select>
            </div>
            <div><label class="label">Aval (PDF simulado)</label><input class="input" name="aval" type="file" accept="application/pdf"></div>
            <div><label class="label">Estado</label>
              <select class="select" name="status"><option>Borrador</option><option>Publicado</option><option>Cancelado</option></select>
            </div>
            <button class="btn primary">Guardar</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function fillSubcats() {
  const cat = qs('#evtCat')?.value;
  const sub = qs('#evtSub');
  if (!sub || !cat) return;
  sub.innerHTML = (CATEGORIES[cat]||[]).map(s=>`<option>${s}</option>`).join('');
}

document.addEventListener('change', (e) => { if (e.target?.id === 'evtCat') fillSubcats(); });

// tabs + búsqueda
let currentTab = 'Publicado';

document.addEventListener('click', (e) => {
  const t = e.target.closest('.tab[data-tab]');
  if (t) {
    currentTab = t.getAttribute('data-tab');
    document.querySelectorAll('#evtTabs .tab').forEach(x=>x.classList.toggle('active', x===t));
    const tbody = document.querySelector('#eventsTable tbody');
    if (!tbody) return;
    const st = getState();
    tbody.innerHTML = st.events
      .filter(ev => !currentTab || ev.status===currentTab)
      .map(ev => `
        <tr>
          <td>${ev.title}</td><td>${ev.category} / ${ev.subcategory}</td>
          <td>${ev.date} ${ev.time}</td><td>${ev.location}</td>
          <td><span class="badge">${ev.status}</span></td>
          <td><button class="btn small" data-edit="${ev.id}">Editar</button></td>
        </tr>`).join('');
  }

  const btn = e.target.closest('button[data-edit]');
  if (btn) {
    const id = btn.getAttribute('data-edit');
    const st = getState();
    const ev = st.events.find(x => x.id === id);
    if (!ev) return;
    const form = qs('#eventForm');
    if (!form) return;
    for (const [k,v] of Object.entries(ev)) {
      const el = form.querySelector(`[name="${k}"]`);
      if (!el) continue;
      if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = v;
    }
    qs('#evtCat').value = ev.category; fillSubcats(); qs('#evtSub').value = ev.subcategory;
  }
});

document.addEventListener('input', (e) => {
  if (e.target?.id === 'eventSearch') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#eventsTable tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
});

document.addEventListener('submit', (e) => {
  if (e.target?.id === 'eventForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = Object.fromEntries(fd.entries());
    if (!validateFutureDate(p.date)) return toast('La fecha debe ser futura','error');
    if (!(+p.capacity > 0)) return toast('Capacidad debe ser > 0','error');
    const st = getState();
    const me = JSON.parse(localStorage.getItem('uc_auth'));
    if (!p.id) {
      const id = (Math.max(0, ...st.events.map(ev=>+ev.id||0)) + 1).toString();
      st.events.unshift({ id, ...p, attendees: 0, organizerId: me.id });
      toast('Evento creado','success');
    } else {
      const i = st.events.findIndex(ev => ev.id === p.id);
      if (i>=0) st.events[i] = { ...st.events[i], ...p };
      toast('Evento actualizado','success');
    }
    setState(st);
    e.target.reset();
    fillSubcats();
  }
});

// activar tab inicial
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#evtTabs .tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === 'Publicado');
  });
});
