// components/events.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { qs, toast, todayISO } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

/*
  Events UI module (completo)
  - Soporta selección de instalaciones mediante checkboxes (más usable que multi-select)
  - Envía en FormData:
      - 'evento' (JSON) que contiene `instalaciones: [idInstalacion, ...]`
      - 'tipoAval', 'avalPdf'
      - 'organizaciones' (JSON) y archivos dinámicos 'certificado_org_<id>'
      - 'certificadoParticipacion' (opcional)
  - Mantiene editor inline de organizaciones, control de permisos por created_by
  - Valida y limpia archivos, maneja transacciones front->backend
*/

const SECTORES_ECONOMICOS = [
  'Agricultura','Comercio','Industria','Servicios','Tecnología',
  'Educación','Salud','Turismo','Transporte'
];

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
      <td>${(user && String(e.idUsuario)===String(user.id)) ? `<button class="btn small" data-edit="${escapeHtml(e.idEvento||e.id||'')}">Editar</button>` : ''}</td>
    </tr>
  `).join('') : '<tr><td colspan="5">No hay eventos</td></tr>';

  const instCheckboxesHtml = installations.map(i => {
    const id = escapeHtml(i.idInstalacion || i.id || '');
    const label = escapeHtml(i.nombre || i.ubicacion || i.descripcion || i.ciudad || `Instalación ${id}`);
    return `
      <div class="inst-item" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" class="inst-checkbox" value="${id}" data-inst="${id}" />
          <span>${label}</span>
        </label>
      </div>
    `;
  }).join('');

  const orgListHtml = organizations.map(o => {
    const id = escapeHtml(o.idOrganizacion || o.id || '');
    const name = escapeHtml(o.nombre || '');
    const sector = escapeHtml(o.sectorEconomico || o.sector || 'Sin sector');
    const createdBy = String(o.created_by || o.createdBy || '');
    const currentUser = getCurrentUser();
    const canEdit = currentUser && String(currentUser.id) === createdBy;
    return `
      <div class="org-item" data-org-id="${id}" style="padding:6px; border-bottom:1px solid #f0f0f0;">
        <label style="display:flex; align-items:flex-start; gap:8px;">
          <input type="checkbox" class="org-select" name="organizaciones[]" value="${id}" />
          <div style="flex:1;">
            <strong>${name}</strong> <small>— ${sector}</small>
            <div style="margin-top:6px;">
              <label style="margin-right:8px;"><input type="checkbox" class="org-rep" data-org="${id}" /> Representante legal</label>
              <input class="input org-encargado" data-org="${id}" placeholder="Nombre encargado (si no es representante)" style="display:none; width:60%;" />
            </div>
            <div style="margin-top:6px; display:none;" data-cert-block="${id}">
              <label class="label">Certificado de participación (PDF)</label>
              <input type="file" accept="application/pdf" class="org-cert" data-org="${id}" />
            </div>
          </div>
          <div style="min-width:90px; text-align:right;">
            ${ canEdit
              ? `<button type="button" class="btn tiny edit-org-inline" data-id="${id}">✎</button>
                 <button type="button" class="btn tiny danger delete-org-inline" data-id="${id}">🗑</button>`
              : ''
            }
          </div>
        </label>
      </div>
    `;
  }).join('');

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
<<<<<<< HEAD
=======
              <div style="flex:1"><label class="label">Capacidad (opcional)</label><input class="input" name="capacidad" type="number" min="1"></div>
>>>>>>> 3d88b9bc7ac5bc53c9cc7c12bedb8e14b112d16f
            </div>

            <div>
              <label class="label">Instalaciones</label>
              <div id="instList" style="border:1px solid #ddd; padding:8px; max-height:160px; overflow:auto;">
                ${instCheckboxesHtml || '<div class="muted">No hay instalaciones disponibles</div>'}
              </div>
              <div style="margin-top:8px;">
                <label style="cursor:pointer;"><input type="checkbox" id="instSelectAll" /> Seleccionar/Deseleccionar todas</label>
              </div>
            </div>

            <div><label class="label">Ubicación / descripción corta</label><input class="input" name="ubicacion" placeholder="Salón, dirección, etc."></div>

            <div>
              <label><input type="checkbox" id="evtHasOrg" name="hasOrganization"> Participa organización externa</label>
            </div>

            <div id="evtOrgBlock" style="display:none; margin-top:8px;">
              <label class="label">Organizaciones participantes</label>
              <input id="orgFilter" class="input" placeholder="Filtrar por nombre o sector" style="margin-bottom:8px;">
              <div id="orgSelectList" style="max-height:220px; overflow:auto; border:1px solid #ddd; padding:6px;">
                ${orgListHtml || '<div class="muted">No hay organizaciones registradas</div>'}
              </div>

              <div style="margin-top:8px; display:flex; gap:8px;">
                <button type="button" id="btnAddOrgInline" class="btn">+ Crear organización</button>
                <button type="button" id="btnClearOrgs" class="btn">Limpiar selección</button>
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

<<<<<<< HEAD
=======
            <div>
              <label class="label">Descripción (opcional)</label>
              <textarea class="textarea" name="descripcion"></textarea>
            </div>

>>>>>>> 3d88b9bc7ac5bc53c9cc7c12bedb8e14b112d16f
            <div class="flex-row" style="gap:8px;">
              <button type="submit" class="btn primary" id="evtSubmitBtn">Crear (estado: registrado)</button>
              <button type="button" id="evtClear" class="btn">Limpiar</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- modal placeholder inserted to body by ensureOrgInlineEditorExists -->
  `;
}

/* ---------- helpers: rebuild org list ---------- */
function rebuildOrgList(orgs) {
  const container = document.querySelector('#orgSelectList');
  if (!container) return;
  const html = Array.isArray(orgs) && orgs.length ? orgs.map(o => {
    const id = escapeHtml(o.idOrganizacion || o.id || '');
    const name = escapeHtml(o.nombre || '');
    const sector = escapeHtml(o.sectorEconomico || o.sector || 'Sin sector');
    const createdBy = String(o.created_by || o.createdBy || '');
    const currentUser = getCurrentUser();
    const canEdit = currentUser && String(currentUser.id) === createdBy;
    return `
      <div class="org-item" data-org-id="${id}" style="padding:6px; border-bottom:1px solid #f0f0f0;">
        <label style="display:flex; align-items:flex-start; gap:8px;">
          <input type="checkbox" class="org-select" name="organizaciones[]" value="${id}" />
          <div style="flex:1;">
            <strong>${name}</strong> <small>— ${sector}</small>
            <div style="margin-top:6px;">
              <label style="margin-right:8px;"><input type="checkbox" class="org-rep" data-org="${id}" /> Representante legal</label>
              <input class="input org-encargado" data-org="${id}" placeholder="Nombre encargado" style="display:none; width:60%;" />
            </div>
            <div style="margin-top:6px; display:none;" data-cert-block="${id}">
              <label class="label">Certificado de participación (PDF)</label>
              <input type="file" accept="application/pdf" class="org-cert" data-org="${id}" />
            </div>
          </div>
          <div style="min-width:90px; text-align:right;">
            ${ canEdit
              ? `<button type="button" class="btn tiny edit-org-inline" data-id="${id}">✎</button>
                 <button type="button" class="btn tiny danger delete-org-inline" data-id="${id}">🗑</button>`
              : ''
            }
          </div>
        </label>
      </div>
    `;
  }).join('') : '<div class="muted">No hay organizaciones registradas</div>';
  container.innerHTML = html;
}

/* ---------- handlers (bind) ---------- */
function bindEventListenersInner() {
  // INPUT delegated
  document.addEventListener('input', (e) => {
    if (e.target?.id === 'eventSearch') {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#eventsTable tbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      return;
    }
    if (e.target?.id === 'orgFilter') {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#orgSelectList .org-item').forEach(div => {
        div.style.display = div.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      return;
    }
  });

  // CHANGE delegated
  document.addEventListener('change', (e) => {
    if (e.target?.id === 'evtHasOrg') {
      const block = document.querySelector('#evtOrgBlock');
      if (!block) return;
      block.style.display = e.target.checked ? '' : 'none';
      return;
    }

    if (e.target && e.target.classList && e.target.classList.contains('org-select')) {
      const orgId = e.target.value;
      const certBlock = document.querySelector(`[data-cert-block="${orgId}"]`);
      if (certBlock) certBlock.style.display = e.target.checked ? '' : 'none';
      return;
    }

    if (e.target && e.target.classList && e.target.classList.contains('org-rep')) {
      const orgId = e.target.getAttribute('data-org');
      const enc = document.querySelector(`.org-encargado[data-org="${orgId}"]`);
      if (!enc) return;
      enc.style.display = e.target.checked ? 'none' : '';
      return;
    }

    // select/deselect all installations
    if (e.target?.id === 'instSelectAll') {
      const checked = !!e.target.checked;
      document.querySelectorAll('.inst-checkbox').forEach(cb => cb.checked = checked);
      return;
    }
  });

  // CLICK delegated
  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'btnClearOrgs') {
      document.querySelectorAll('#orgSelectList input.org-select').forEach(cb => cb.checked = false);
      document.querySelectorAll('#orgSelectList input.org-rep').forEach(cb => cb.checked = false);
      document.querySelectorAll('#orgSelectList .org-encargado').forEach(inp => { inp.style.display = 'none'; inp.value = ''; });
      document.querySelectorAll('#orgSelectList [data-cert-block]').forEach(b => b.style.display = 'none');
      return;
    }

    if (e.target && e.target.closest && e.target.closest('#evtClear')) {
      const form = document.querySelector('#eventForm');
      if (form) form.reset();
      const block = document.querySelector('#evtOrgBlock'); if (block) block.style.display = 'none';
      return;
    }

    if (e.target?.id === 'btnAddOrgInline') {
      openOrgInlineEditor();
      return;
    }

    if (e.target?.id === 'orgInlineCancel' || e.target?.id === 'orgInlineCancelBottom') {
      e.preventDefault();
      closeOrgInlineEditor();
      return;
    }

    if (e.target?.id === 'orgInlineSaveBtn') {
      e.preventDefault();
      const formOrg = document.querySelector('#orgInlineForm');
      if (!formOrg) { toast('Formulario de organización no encontrado', 'error'); return; }

      const fdOrg = new FormData(formOrg);
      const payload = {};
      for (const [k,v] of fdOrg.entries()) payload[k] = (typeof v === 'string') ? v.trim() : v;

      // attach idUsuario required by DB
      const user = getCurrentUser();
      if (!user || !user.id) { toast('Sesión expirada', 'error'); navigateTo('login'); return; }
      payload.idUsuario = String(user.id);

      if (!payload.nombre) { toast('Nombre de la organización es requerido', 'error'); return; }
      if (!payload.representanteLegal) { toast('Representante legal es requerido', 'error'); return; }
      if (!payload.sectorEconomico) { toast('Seleccione sector económico para la organización', 'error'); return; }

      const editingId = payload.id;
      try {
        const url = editingId ? `/api/organizations/${editingId}` : '/api/organizations';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.status === 401 || res.status === 403) { toast('Sesión expirada', 'error'); navigateTo('login'); return; }
        const data = await res.json();
        if (!res.ok) { toast(data.error || data.message || 'Error al guardar organización', 'error'); return; }

        const st = getState();
        const orgs = Array.isArray(st.organizations) ? st.organizations.slice() : [];
        if (editingId) {
          const i = orgs.findIndex(o => String(o.idOrganizacion||o.id) === String(editingId));
          if (i >= 0) orgs[i] = data;
        } else {
          orgs.unshift(data);
        }
        setState({ ...st, organizations: orgs });
        rebuildOrgList(orgs);
        toast(editingId ? 'Organización actualizada' : 'Organización creada', 'success');
        formOrg.reset();
        closeOrgInlineEditor();
      } catch (err) {
        console.error('Error guardando organización:', err);
        toast('Error al guardar organización', 'error');
      }
      return;
    }

    const editBtn = e.target.closest && e.target.closest('.edit-org-inline');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openOrgInlineEditor(id);
      return;
    }

    const delBtn = e.target.closest && e.target.closest('.delete-org-inline');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      if (!confirm('Eliminar organización? Esta acción no se puede deshacer.')) return;
      try {
        const user = getCurrentUser();
        const res = await fetch(`/api/organizations/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUsuario: user?.id || null })
        });
        const body = await res.json();
        if (res.status === 401 || res.status === 403) { toast('No autorizado', 'error'); return; }
        if (!res.ok) { toast(body.error || 'Error eliminando organización', 'error'); return; }
        const st = getState();
        const orgs = (st.organizations || []).filter(o => String(o.idOrganizacion||o.id) !== String(id));
        setState({ ...st, organizations: orgs });
        rebuildOrgList(orgs);
        toast('Organización eliminada', 'success');
      } catch (err) {
        console.error('Error eliminando org:', err);
        toast('Error eliminando organización', 'error');
      }
      return;
    }
  });

  // SUBMIT delegated (only eventForm)
  document.addEventListener('submit', async (e) => {
    if (e.target?.id !== 'eventForm') return;
    e.preventDefault();
    e.stopPropagation();

    if (_isSubmitting) { toast('Enviando... espera', 'info'); return; }
    _isSubmitting = true;
    const submitBtn = document.querySelector('#evtSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const evtForm = e.target;
      const fd = new FormData(evtForm);
      const raw = Object.fromEntries(fd.entries());

      // files
      const avalFile = evtForm.querySelector('input[name="avalPdf"]')?.files?.[0];
      const certFileGeneral = evtForm.querySelector('input[name="certificadoParticipacion"]')?.files?.[0];

      // validations
      if (!raw.nombre) { toast('Nombre del evento requerido', 'error'); throw new Error('validation'); }
      if (!raw.tipo) { toast('Tipo de evento requerido', 'error'); throw new Error('validation'); }
      if (!raw.fecha) { toast('Fecha del evento requerida', 'error'); throw new Error('validation'); }
      if (!raw.hora) { toast('Hora inicio del evento requerida', 'error'); throw new Error('validation'); }
      if (!raw.horaFin) { toast('Hora fin del evento requerida', 'error'); throw new Error('validation'); }
      if (new Date(raw.fecha) < new Date(todayISO())) { toast('Fecha debe ser hoy o futura', 'error'); throw new Error('validation'); }
      if (raw.horaFin <= raw.hora) { toast('Hora fin debe ser mayor que hora inicio', 'error'); throw new Error('validation'); }

      // instalaciones seleccionadas (checkboxes)
      const instalacionCheckboxes = Array.from(evtForm.querySelectorAll('.inst-checkbox'));
      const instalacionesIds = instalacionCheckboxes.filter(cb => cb.checked).map(cb => cb.value).filter(Boolean);
      if (!instalacionesIds || instalacionesIds.length === 0) { toast('Seleccione al menos una instalación', 'error'); throw new Error('validation'); }

      const tipoAval = fd.get('tipoAval') || '';
      if (!avalFile) { toast('El aval en PDF es obligatorio', 'error'); throw new Error('validation'); }
      if (!tipoAval) { toast('Seleccione el tipo de aval', 'error'); throw new Error('validation'); }
      if (avalFile.type !== 'application/pdf') { toast('El aval debe ser PDF', 'error'); throw new Error('validation'); }

      const hasOrg = !!evtForm.querySelector('#evtHasOrg')?.checked;
      let organizacionesPayload = [];
      const sendForm = new FormData();

      // build evento payload including instalaciones array
      const payloadEvento = {
        idUsuario: raw.idUsuario || getCurrentUser()?.id,
        instalaciones: instalacionesIds,
        estado: 'registrado',
        nombre: raw.nombre,
        tipo: raw.tipo,
        fecha: raw.fecha,
        hora: raw.hora,
        horaFin: raw.horaFin,
        ubicacion: raw.ubicacion || '',
        capacidad: raw.capacidad ? Number(raw.capacidad) : null,
        descripcion: raw.descripcion || ''
      };

      sendForm.append('evento', JSON.stringify(payloadEvento));
      sendForm.append('tipoAval', tipoAval);
      if (avalFile) sendForm.append('avalPdf', avalFile);

      if (hasOrg) {
        const selected = Array.from(evtForm.querySelectorAll('#orgSelectList input.org-select:checked'));
        if (selected.length === 0) { toast('Seleccione al menos una organización participante', 'error'); throw new Error('validation'); }

        for (const cb of selected) {
          const orgId = cb.value;
          const repInput = document.querySelector(`.org-rep[data-org="${orgId}"]`);
          const isRep = repInput ? !!repInput.checked : false;
          const encargadoInput = document.querySelector(`.org-encargado[data-org="${orgId}"]`);
          const encargadoVal = encargadoInput ? (encargadoInput.value || '') : '';
          if (!isRep && !encargadoVal) { toast('Ingrese encargado para una organización sin representante legal', 'error'); throw new Error('validation'); }

          const participante = isRep ? null : encargadoVal;
          organizacionesPayload.push({
            idOrganizacion: orgId,
            representanteLegal: isRep ? 'si' : 'no',
            participante: participante
          });

          const certFileInput = document.querySelector(`.org-cert[data-org="${orgId}"]`);
          const cert = certFileInput?.files?.[0];
          if (cert) {
            if (cert.type !== 'application/pdf') { toast('Certificado debe ser PDF', 'error'); throw new Error('validation'); }
            sendForm.append(`certificado_org_${orgId}`, cert);
          }
        }

        if (certFileGeneral) {
          if (certFileGeneral.type !== 'application/pdf') { toast('Certificado general debe ser PDF', 'error'); throw new Error('validation'); }
          sendForm.append('certificadoParticipacion', certFileGeneral);
        }

        sendForm.append('organizaciones', JSON.stringify(organizacionesPayload));
      }

      const res = await fetch('/api/events', { method: 'POST', body: sendForm });
      if (res.status === 401 || res.status === 403) { toast('Sesión expirada', 'error'); navigateTo('login'); return; }
      const data = await res.json();
      if (!res.ok) { console.error('Backend error events:', data); toast(data.error || data.message || 'Error guardando evento', 'error'); return; }

      const st2 = getState();
      const evs = Array.isArray(st2.events) ? st2.events.slice() : [];
      evs.unshift(data);
      setState({ ...st2, events: evs });

      toast('Evento creado', 'success');
      evtForm.reset();
      const evtOrgBlock = document.querySelector('#evtOrgBlock'); if (evtOrgBlock) evtOrgBlock.style.display = 'none';

      const tbody = document.querySelector('#eventsTable tbody');
      if (tbody) {
        tbody.innerHTML = (Array.isArray(getState().events)?getState().events:[])
          .map(ev => `
            <tr data-id="${escapeHtml(ev.idEvento || ev.id || '')}">
              <td>${escapeHtml(ev.nombre || '')}</td>
              <td>${escapeHtml(ev.tipo || '')}</td>
              <td>${escapeHtml(ev.fecha || '')} ${escapeHtml(ev.hora || '')}</td>
              <td>${escapeHtml(ev.ubicacion || '')}</td>
              <td>${(getCurrentUser() && String(ev.idUsuario)===String(getCurrentUser().id)) ? `<button class="btn small" data-edit="${escapeHtml(ev.idEvento||ev.id||'')}">Editar</button>` : ''}</td>
            </tr>
          `).join('');
      }
    } catch (err) {
      if (err.message !== 'validation') console.error('Error guardando evento:', err);
    } finally {
      _isSubmitting = false;
      const submitBtn2 = document.querySelector('#evtSubmitBtn');
      if (submitBtn2) submitBtn2.disabled = false;
    }
  });
}

/* ---------- editor open/close and ensure modal ---------- */

function openOrgInlineEditor(id) {
  ensureOrgInlineEditorExists();
  const modal = document.querySelector('#orgModal');
  const form = document.querySelector('#orgInlineForm');
  if (!modal || !form) { console.warn('editor not found'); return; }

  const inputId = form.querySelector('input[name="id"]');
  const name = form.querySelector('input[name="nombre"]');
  const rep = form.querySelector('input[name="representanteLegal"]');
  const sector = form.querySelector('select[name="sectorEconomico"]');
  const ubic = form.querySelector('input[name="ubicacion"]');
  const dir = form.querySelector('input[name="direccion"]');
  const ciudad = form.querySelector('input[name="ciudad"]');
  const actividad = form.querySelector('input[name="actividadPrincipal"]');
  const telefono = form.querySelector('input[name="telefono"]');

  if (!id) {
    inputId.value = '';
    name.value = '';
    rep.value = '';
    if (sector) sector.value = '';
    if (ubic) ubic.value = '';
    if (dir) dir.value = '';
    if (ciudad) ciudad.value = '';
    if (actividad) actividad.value = '';
    if (telefono) telefono.value = '';
    modal.classList.add('open');
    name.focus();
    return;
  }

  const st = getState();
  const org = (st.organizations || []).find(o => String(o.idOrganizacion||o.id) === String(id));
  if (!org) { toast('Organización no encontrada', 'error'); return; }
  const user = getCurrentUser();
  const ownerId = String(org.created_by || org.createdBy || '');
  if (!user || (ownerId && String(user.id) !== ownerId)) { toast('No autorizado', 'error'); return; }

  inputId.value = org.idOrganizacion || org.id || '';
  name.value = org.nombre || '';
  rep.value = org.representanteLegal || '';
  if (sector) sector.value = org.sectorEconomico || org.sector || '';
  if (ubic) ubic.value = org.ubicacion || '';
  if (dir) dir.value = org.direccion || '';
  if (ciudad) ciudad.value = org.ciudad || '';
  if (actividad) actividad.value = org.actividadPrincipal || '';
  if (telefono) telefono.value = org.telefono || '';
  modal.classList.add('open');
  name.focus();
}

function closeOrgInlineEditor() {
  const modal = document.querySelector('#orgModal');
  const form = document.querySelector('#orgInlineForm');
  if (!modal || !form) return;
  modal.classList.remove('open');
  form.reset();
}

function ensureOrgInlineEditorExists() {
  if (document.querySelector('#orgModal')) return;

  const html = `
    <div id="orgModal" class="modal" aria-hidden="true">
      <div class="sheet" role="dialog" aria-modal="true" id="orgInlineEditor">
        <div class="head" style="display:flex; justify-content:space-between; align-items:center;">
          <strong>Organización</strong>
          <div>
            <button type="button" id="orgInlineCancel" class="btn">✕</button>
          </div>
        </div>
        <div class="body" style="max-height:70vh; overflow:auto; padding:12px;">
          <form id="orgInlineForm" class="flex-col gap-8" autocomplete="off">
            <input type="hidden" name="id" value="">
            <div class="form-group"><label>Nombre</label><input class="input" name="nombre" required></div>
            <div class="form-group"><label>Representante Legal</label><input class="input" name="representanteLegal" required></div>
            <div class="form-group"><label>Sector</label>
              <select class="select" name="sectorEconomico" required>
                <option value="">- Seleccionar sector -</option>
                ${SECTORES_ECONOMICOS.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Ubicación / sede</label><input class="input" name="ubicacion"></div>
            <div class="form-group"><label>Dirección</label><input class="input" name="direccion"></div>
            <div class="form-group"><label>Ciudad</label><input class="input" name="ciudad"></div>
            <div class="form-group"><label>Actividad principal</label><input class="input" name="actividadPrincipal"></div>
            <div class="form-group"><label>Teléfono</label><input class="input" name="telefono" type="tel"></div>
            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
              <button type="button" id="orgInlineSaveBtn" class="btn primary">Guardar organización</button>
              <button type="button" id="orgInlineCancelBottom" class="btn">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  try {
    document.body.insertAdjacentHTML('beforeend', html);
    const b = document.querySelector('#orgInlineCancelBottom');
    if (b) b.addEventListener('click', () => closeOrgInlineEditor());
    const topCancel = document.querySelector('#orgInlineCancel');
    if (topCancel) topCancel.addEventListener('click', () => closeOrgInlineEditor());
    document.body.addEventListener('click', (ev) => {
      const modal = document.querySelector('#orgModal');
      const sheet = document.querySelector('#orgInlineEditor');
      if (!modal || !sheet) return;
      if (!modal.classList.contains('open')) return;
      if (ev.target === modal) closeOrgInlineEditor();
    });
  } catch (err) {
    console.warn('Could not inject orgModal', err);
  }
}

/* ---------- public bind ---------- */
export function bindEventListeners() {
  if (_eventsBound) return;
  _eventsBound = true;
  bindEventListenersInner();
}

document.addEventListener('DOMContentLoaded', () => {
  try { ensureOrgInlineEditorExists(); } catch (e) { /* noop */ }
  bindEventListeners();
  setTimeout(bindEventListeners, 100);
});
