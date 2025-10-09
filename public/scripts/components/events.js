// components/events.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { qs, toast, todayISO } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

let _eventsBound = false;
let _isSubmitting = false;

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function ensureLookups() {
  const st = getState();
  if (!Array.isArray(st.installations) || st.installations.length === 0) {
    try {
      const r = await fetch('/api/installations');
      if (r.status === 401 || r.status === 403) return;
      const data = await r.json();
      setState({ ...getState(), installations: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.warn('Error loading installations', err);
      setState({ ...getState(), installations: [] });
    }
  }

  if (!Array.isArray(st.organizations) || st.organizations.length === 0) {
    try {
      const r2 = await fetch('/api/organizations');
      if (r2.status === 401 || r2.status === 403) return;
      const data2 = await r2.json();
      setState({ ...getState(), organizations: Array.isArray(data2) ? data2 : [] });
    } catch (err) {
      console.warn('Error loading organizations', err);
      setState({ ...getState(), organizations: [] });
    }
  }
}

export async function renderEvents() {
  await ensureLookups();
  const st = getState();
  const user = getCurrentUser();
  const events = Array.isArray(st.events) ? st.events : [];
  const installations = Array.isArray(st.installations) ? st.installations : [];
  const organizations = Array.isArray(st.organizations) ? st.organizations : [];

  const rows = events.length ? events.map(e => `
    <tr data-id="${escapeHtml(e.idEvento || e.id || '')}">
      <td>${escapeHtml(e.nombre || '')}</td>
      <td>${escapeHtml(e.tipo || '')}</td>
      <td>${escapeHtml(e.fecha || '')} ${escapeHtml(e.hora || '')}</td>
      <td>${escapeHtml(e.ubicacion || '')}</td>
      <td>${(user && (user.role==='Administrador' || user.role==='Profesor' || String(e.idUsuario)===String(user.id))) ? `<button class="btn small" data-edit="${escapeHtml(e.idEvento||e.id||'')}">Editar</button>` : ''}</td>
    </tr>
  `).join('') : '<tr><td colspan="5">No hay eventos</td></tr>';

  const instOptions = installations.map(i=>`<option value="${escapeHtml(i.idInstalacion||i.id)}">${escapeHtml(i.nombre||i.ubicacion||'')}</option>`).join('');
  const orgOptions = organizations.map(o=>`<option value="${escapeHtml(o.idOrganizacion||o.id)}">${escapeHtml(o.nombre||'')}</option>`).join('');

  return `
    <div class="grid">
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Eventos</strong>
          <div class="flex gap-8"><input id="eventSearch" class="input" placeholder="Buscar..." style="max-width:240px"></div>
        </div>
        <div class="card-body table-wrap">
          <table class="table" id="eventsTable">
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Fecha</th><th>Ubicación</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <div class="card col-4 col-12">
        <div class="card-head"><strong>Crear evento</strong></div>
        <div class="card-body">
          <form id="eventForm" class="flex-col gap-12" enctype="multipart/form-data" autocomplete="off">
            <input type="hidden" name="idUsuario" value="${escapeHtml(user?.id||'')}" />
            <div><label class="label">Nombre</label><input class="input" name="nombre" required></div>

            <div class="flex gap-12">
              <div style="flex:1">
                <label class="label">Tipo</label>
                <select class="select" name="tipo" required>
                  <option value="academico">academico</option>
                  <option value="ludico">ludico</option>
                </select>
              </div>
            </div>

            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Fecha</label><input class="input" name="fecha" type="date" min="${todayISO()}" required></div>
              <div style="flex:1"><label class="label">Hora inicio</label><input class="input" name="hora" type="time" required></div>
            </div>

            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Hora fin</label><input class="input" name="horaFin" type="time" required></div>
              <div style="flex:1"><label class="label">Capacidad (opcional)</label><input class="input" name="capacidad" type="number" min="1"></div>
            </div>

            <div>
              <label class="label">Instalación</label>
              <select class="select" name="idInstalacion" required>
                <option value="">- Seleccionar -</option>
                ${instOptions}
              </select>
            </div>

            <div><label class="label">Ubicación / descripción corta</label><input class="input" name="ubicacion" placeholder="Salón, dirección, etc."></div>

            <div>
              <label><input type="checkbox" id="evtHasOrg" name="hasOrganization"> Participa organización externa</label>
            </div>

            <div id="evtOrgBlock" style="display:none; margin-top:8px;">
              <label class="label">Organización</label>
              <select class="select" name="organizacionId">
                <option value="">- Seleccionar -</option>
                ${orgOptions}
              </select>

              <div style="margin-top:8px;">
                <label><input type="checkbox" id="evtOrgIsRep" name="orgIsRepresentative"> Encargado es representante legal</label>
              </div>

              <div id="evtOrgEncargado" style="margin-top:8px; display:none;">
                <label class="label">Nombre del encargado</label>
                <input class="input" name="organizacionEncargado" placeholder="Nombre del encargado si no es representante legal">
              </div>

              <div style="margin-top:8px;">
                <label class="label">Certificado de participación (PDF)</label>
                <input class="input" name="certificadoParticipacion" type="file" accept="application/pdf">
              </div>
            </div>

            <div>
              <label class="label">Aval (PDF obligatorio)</label>
              <input class="input" name="avalPdf" type="file" accept="application/pdf" required>
            </div>

            <div>
              <label class="label">Tipo de Aval</label>
              <select class="select" name="tipoAval" required>
                <option value="">- Seleccionar -</option>
                <option value="director_programa">Director de programa</option>
                <option value="director_docencia">Director de docencia</option>
              </select>
            </div>

            <div>
              <label class="label">Descripción (opcional)</label>
              <textarea class="textarea" name="descripcion"></textarea>
            </div>

            <div class="flex-row" style="gap:8px;">
              <button type="submit" class="btn primary" id="evtSubmitBtn">Crear (estado: registrado)</button>
              <button type="button" id="evtClear" class="btn">Limpiar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

function bindEventListenersInner() {
  // Search input
  document.addEventListener('input', (e) => {
    if (e.target?.id === 'eventSearch') {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#eventsTable tbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    }
  });

  // Toggle organization block and encargado input
  document.addEventListener('change', (e) => {
    if (e.target?.id === 'evtHasOrg') {
      const block = document.querySelector('#evtOrgBlock');
      if (!block) return;
      block.style.display = e.target.checked ? '' : 'none';
    }
    if (e.target?.id === 'evtOrgIsRep') {
      const enc = document.querySelector('#evtOrgEncargado');
      if (!enc) return;
      enc.style.display = e.target.checked ? 'none' : '';
    }
  });

  // Clear form button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#evtClear');
    if (btn) {
      const form = document.querySelector('#eventForm');
      if (form) form.reset();
      const block = document.querySelector('#evtOrgBlock'); if (block) block.style.display = 'none';
      const enc = document.querySelector('#evtOrgEncargado'); if (enc) enc.style.display = 'none';
    }
  });

  // Prevent double submit and send form
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form || form.id !== 'eventForm') return;
    e.preventDefault();
    e.stopPropagation();

    if (_isSubmitting) {
      toast('Enviando... espera', 'info');
      return;
    }

    const submitBtn = document.querySelector('#evtSubmitBtn');
    _isSubmitting = true;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const fd = new FormData(form);
      const raw = Object.fromEntries(fd.entries());
      const avalFile = form.querySelector('input[name="avalPdf"]')?.files?.[0];
      const certFile = form.querySelector('input[name="certificadoParticipacion"]')?.files?.[0];

      if (!raw.nombre) { toast('Nombre requerido', 'error'); return; }
      if (!raw.tipo) { toast('Tipo requerido', 'error'); return; }
      if (!raw.fecha) { toast('Fecha requerida', 'error'); return; }
      if (!raw.hora) { toast('Hora requerida', 'error'); return; }
      if (!raw.horaFin) { toast('Hora fin requerida', 'error'); return; }
      if (new Date(raw.fecha) < new Date(todayISO())) { toast('Fecha debe ser hoy o futura', 'error'); return; }
      if (raw.horaFin <= raw.hora) { toast('Hora fin debe ser mayor que hora inicio', 'error'); return; }
      if (!raw.idInstalacion) { toast('Seleccione instalación', 'error'); return; }

      const tipoAval = fd.get('tipoAval') || '';
      if (!avalFile) { toast('El aval en PDF es obligatorio', 'error'); return; }
      if (!tipoAval) { toast('Seleccione el tipo de aval', 'error'); return; }
      if (avalFile.type !== 'application/pdf') { toast('El aval debe ser PDF', 'error'); return; }

      const hasOrg = !!form.querySelector('#evtHasOrg')?.checked;
      const organizacionId = fd.get('organizacionId') || '';
      const orgIsRep = !!form.querySelector('#evtOrgIsRep')?.checked;
      const encargado = fd.get('organizacionEncargado') || '';

      if (hasOrg && !organizacionId) { toast('Seleccione la organización participante', 'error'); return; }
      if (hasOrg && !orgIsRep && !encargado) { toast('Escriba el nombre del encargado', 'error'); return; }
      if (hasOrg && certFile && certFile.type !== 'application/pdf') { toast('El certificado debe ser PDF', 'error'); return; }

      const payloadEvento = {
        idUsuario: raw.idUsuario || getCurrentUser()?.id,
        idInstalacion: raw.idInstalacion,
        estado: 'registrado',
        nombre: raw.nombre,
        tipo: raw.tipo,
        fecha: raw.fecha,
        hora: raw.hora,
        horaFin: raw.horaFin,
        ubicacion: raw.ubicacion || '',
        capacidad: raw.capacidad || null,
        descripcion: raw.descripcion || ''
      };

      const sendForm = new FormData();
      sendForm.append('evento', JSON.stringify(payloadEvento));
      sendForm.append('tipoAval', tipoAval);
      if (avalFile) sendForm.append('avalPdf', avalFile);
      if (hasOrg) {
        sendForm.append('organizacionId', organizacionId);
        sendForm.append('orgIsRepresentative', orgIsRep ? '1' : '0');
        if (!orgIsRep) sendForm.append('organizacionEncargado', encargado);
        sendForm.append('participante', orgIsRep ? 'Representante legal' : (encargado || ''));
        if (certFile) sendForm.append('certificadoParticipacion', certFile);
      }

      console.log('submitting event', new Date().toISOString());
      const res = await fetch('/api/events', { method: 'POST', body: sendForm });
      if (res.status === 401 || res.status === 403) {
        toast('Sesión expirada', 'error');
        navigateTo('login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        console.error('Backend error events:', data);
        toast(data.error || data.message || 'Error guardando evento', 'error');
        return;
      }

      const st2 = getState();
      const evs = Array.isArray(st2.events) ? st2.events.slice() : [];
      evs.unshift(data);
      setState({ ...st2, events: evs });

      toast('Evento creado', 'success');
      form.reset();
      document.querySelector('#evtOrgBlock').style.display = 'none';
      document.querySelector('#evtOrgEncargado').style.display = 'none';

      const tbody = document.querySelector('#eventsTable tbody');
      if (tbody) {
        tbody.innerHTML = (Array.isArray(getState().events)?getState().events:[])
          .map(ev => `
            <tr data-id="${escapeHtml(ev.idEvento || ev.id || '')}">
              <td>${escapeHtml(ev.nombre || '')}</td>
              <td>${escapeHtml(ev.tipo || '')}</td>
              <td>${escapeHtml(ev.fecha || '')} ${escapeHtml(ev.hora || '')}</td>
              <td>${escapeHtml(ev.ubicacion || '')}</td>
              <td>${(getCurrentUser() && (getCurrentUser().role==='Administrador' || getCurrentUser().role==='Profesor' || String(ev.idUsuario)===String(getCurrentUser().id))) ? `<button class="btn small" data-edit="${escapeHtml(ev.idEvento||ev.id||'')}">Editar</button>` : ''}</td>
            </tr>
          `).join('');
      }
    } catch (err) {
      console.error('Error guardando evento:', err);
      toast('Error guardando evento', 'error');
    } finally {
      _isSubmitting = false;
      const submitBtn2 = document.querySelector('#evtSubmitBtn');
      if (submitBtn2) submitBtn2.disabled = false;
    }
  });
}

export function bindEventListeners() {
  if (_eventsBound) return;
  _eventsBound = true;
  bindEventListenersInner();
}

// execute binding on DOM ready (SPA should call this after render)
document.addEventListener('DOMContentLoaded', () => {
  bindEventListeners();
  setTimeout(bindEventListeners, 100);
});
