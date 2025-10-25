// components/events.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { qs, toast, todayISO } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

/*
  Events UI module (completo)
  - Validación cliente: capacidad del evento comparada contra suma de capacidades de instalaciones seleccionadas
  - Envío FormData compatible con backend (evento JSON, organizaciones JSON, archivos dinámicos)
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

  if (!Array.isArray(st.events) || st.events.length === 0) {
    try {
      const r3 = await fetch('/api/events');
      if (r3.status === 401 || r3.status === 403) return;
      const data3 = await r3.json();
      setState({ ...getState(), events: Array.isArray(data3) ? data3 : [] });
    } catch (err) {
      console.warn('Error loading events', err);
      setState({ ...getState(), events: [] });
    }
  }
}

/* ---------- render ---------- */
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
    const cap = (i.capacidad !== undefined && i.capacidad !== null) ? ` (capacidad: ${escapeHtml(String(i.capacidad))})` : '';
    return `
      <div class="inst-item" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" class="inst-checkbox" value="${id}" data-inst="${id}" />
          <span>${label}${cap}</span>
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
              <div style="width:140px;">
                <label class="label">Capacidad</label>
                <input class="input" name="capacidad" id="capacidadEvento" type="number" min="1" step="1" placeholder="Personas" />
                <small id="capSummary" style="display:block; color:#666; margin-top:6px;"></small>
              </div>
            </div>

            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Fecha</label><input class="input" name="fecha" type="date" min="${todayISO()}" required></div>
              <div style="flex:1"><label class="label">Hora inicio</label><input class="input" name="hora" type="time" required></div>
            </div>

            <div class="flex gap-12">
              <div style="flex:1"><label class="label">Hora fin</label><input class="input" name="horaFin" type="time" required></div>
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

    // when capacity input changes, update cap summary
    if (e.target?.id === 'capacidadEvento' || e.target?.classList?.contains('inst-checkbox')) {
      updateCapacitySummary();
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
      updateCapacitySummary();
      return;
    }

    // installation checkbox changed
    if (e.target && e.target.classList && e.target.classList.contains('inst-checkbox')) {
      updateCapacitySummary();
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
      updateCapacitySummary();
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

    // continue click delegated handlers (rest)
    if (e.target && e.target.matches && e.target.matches('button[data-edit]')) {
      const id = e.target.getAttribute('data-edit');
      if (!id) return;
      navigateTo(`events/edit/${encodeURIComponent(id)}`);
      return;
    }

    if (e.target && e.target.matches && e.target.matches('button[data-delete]')) {
      const id = e.target.getAttribute('data-delete');
      if (!id) return;
      if (!confirm('¿Eliminar este evento?')) return;
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) { toast(body.error || 'Error eliminando evento', 'error'); return; }
        toast('Evento eliminado', 'success');
        const st = getState();
        setState({ ...st, events: (st.events || []).filter(ev => String(ev.idEvento||ev.id) !== String(id)) });
      } catch (err) { console.error(err); toast('Error eliminando evento', 'error'); }
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

      // validations basic
      if (!raw.nombre) { toast('Nombre del evento requerido', 'error'); throw new Error('validation'); }
      if (!raw.tipo) { toast('Tipo del evento requerido', 'error'); throw new Error('validation'); }
      if (!raw.fecha) { toast('Fecha del evento requerida', 'error'); throw new Error('validation'); }
      if (!raw.hora) { toast('Hora inicio del evento requerida', 'error'); throw new Error('validation'); }
      if (!raw.horaFin) { toast('Hora fin del evento requerida', 'error'); throw new Error('validation'); }
      if (new Date(raw.fecha) < new Date(todayISO())) { toast('Fecha debe ser hoy o futura', 'error'); throw new Error('validation'); }
      if (raw.horaFin <= raw.hora) { toast('Hora fin debe ser mayor que hora inicio', 'error'); throw new Error('validation'); }

      const instalacionCheckboxes = Array.from(evtForm.querySelectorAll('.inst-checkbox'));
      const instalacionesIds = instalacionCheckboxes.filter(cb => cb.checked).map(cb => cb.value).filter(Boolean);
      if (!instalacionesIds || instalacionesIds.length === 0) { toast('Seleccione al menos una instalación', 'error'); throw new Error('validation'); }

      const tipoAval = fd.get('tipoAval') || '';
      if (!avalFile) { toast('El aval en PDF es obligatorio', 'error'); throw new Error('validation'); }
      if (!tipoAval) { toast('Seleccione el tipo de aval', 'error'); throw new Error('validation'); }
      if (avalFile.type !== 'application/pdf') { toast('El aval debe ser PDF', 'error'); throw new Error('validation'); }

      // capacidad client-side: sum capacities of selected installations
      const capacidadRaw = fd.get('capacidad') || fd.get('capacidadEvento') || null;
      const capacidad = capacidadRaw ? Number(capacidadRaw) : null;
      if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad < 1)) { toast('Capacidad inválida', 'error'); throw new Error('validation'); }

      if (capacidad !== null) {
        // sum capacities from state
        const st = getState();
        const installationsState = Array.isArray(st.installations) ? st.installations : [];
        let sumCap = 0;
        for (const iid of instalacionesIds) {
          const inst = installationsState.find(x => String(x.idInstalacion || x.id) === String(iid));
          const capInst = inst && (inst.capacidad !== undefined && inst.capacidad !== null) ? Number(inst.capacidad) : null;
          if (capInst === null || !Number.isInteger(capInst)) {
            toast(`Instalación ${iid} sin capacidad definida`, 'error'); throw new Error('validation');
          }
          sumCap += capInst;
        }
        const capSummaryEl = document.querySelector('#capSummary');
        if (capSummaryEl) capSummaryEl.textContent = `Capacidad total instalaciones seleccionadas: ${sumCap}`;
        if (sumCap < capacidad) { toast(`Capacidad total instalaciones (${sumCap}) menor que capacidad del evento (${capacidad})`, 'error'); throw new Error('validation'); }
      }

      // organizations payload
      const organizacionesPayload = [];
      if (evtForm.querySelector('#evtHasOrg')?.checked) {
        const selectedOrgs = Array.from(evtForm.querySelectorAll('#orgSelectList input.org-select:checked'));
        if (!selectedOrgs.length) { toast('Seleccione al menos una organización participante', 'error'); throw new Error('validation'); }
        for (const cb of selectedOrgs) {
          const oid = cb.value;
          const repEl = document.querySelector(`#orgSelectList .org-rep[data-org="${oid}"]`);
          const isRep = !!(repEl && repEl.checked);
          const encEl = document.querySelector(`#orgSelectList .org-encargado[data-org="${oid}"]`);
          const encargado = encEl ? encEl.value.trim() : '';
          let participante = encargado || null;
          if (isRep && !participante) {
            const orgRec = (getState().organizations || []).find(x => String(x.idOrganizacion||x.id) === String(oid));
            participante = orgRec ? (orgRec.representanteLegal || orgRec.representante || null) : null;
            if (!participante) { toast(`Falta representante legal para organización ${oid}`, 'error'); throw new Error('validation'); }
          }
          organizacionesPayload.push({ idOrganizacion: oid, esRepresentanteLegal: isRep ? 'si' : 'no', participante });
        }
      }

      // build FormData to send
      const sendForm = new FormData();
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
        capacidad: capacidad !== null ? capacidad : null,
        descripcion: raw.descripcion || ''
      };
      sendForm.append('evento', JSON.stringify(payloadEvento));
      sendForm.append('tipoAval', tipoAval);
      if (avalFile) sendForm.append('avalPdf', avalFile);

      // org certificates
      if (organizacionesPayload.length) {
        for (const org of organizacionesPayload) {
          const certInput = document.querySelector(`#orgSelectList .org-cert[data-org="${org.idOrganizacion}"]`);
          const cert = certInput?.files?.[0];
          if (cert) {
            if (cert.type !== 'application/pdf') { toast('Certificado debe ser PDF', 'error'); throw new Error('validation'); }
            sendForm.append(`certificado_org_${org.idOrganizacion}`, cert);
          }
        }
        sendForm.append('organizaciones', JSON.stringify(organizacionesPayload));
      }

      if (certFileGeneral) {
        if (certFileGeneral.type !== 'application/pdf') { toast('Certificado general debe ser PDF', 'error'); throw new Error('validation'); }
        sendForm.append('certificadoParticipacion', certFileGeneral);
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
      updateCapacitySummary();
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

/* ---------- capacity helper ---------- */
function updateCapacitySummary() {
  const form = document.querySelector('#eventForm');
  if (!form) return;
  const capacidadRaw = form.querySelector('#capacidadEvento')?.value || null;
  const capacidad = capacidadRaw ? Number(capacidadRaw) : null;
  const selected = Array.from(form.querySelectorAll('.inst-checkbox:checked')).map(cb => cb.value);
  const st = getState();
  const installationsState = Array.isArray(st.installations) ? st.installations : [];
  let sumCap = 0;
  let undef = [];
  for (const iid of selected) {
    const inst = installationsState.find(x => String(x.idInstalacion || x.id) === String(iid));
    const capInst = inst && (inst.capacidad !== undefined && inst.capacidad !== null) ? Number(inst.capacidad) : null;
    if (capInst === null) undef.push(iid);
    else sumCap += capInst;
  }
  const el = document.querySelector('#capSummary');
  if (!el) return;
  if (selected.length === 0) {
    el.textContent = '';
    return;
  }
  if (undef.length) {
    el.textContent = `Algunas instalaciones no tienen capacidad definida: ${undef.join(', ')}`;
    el.style.color = '#b00';
    return;
  }
  el.style.color = '#666';
  el.textContent = `Capacidad total instalaciones seleccionadas: ${sumCap}` + (capacidad !== null ? ` — Evento pide: ${capacidad}` : '');
}

/* ---------- org inline editor (mantener como en tu versión) ---------- */
/* Reutiliza las funciones ensureOrgInlineEditorExists, openOrgInlineEditor, closeOrgInlineEditor,
   bindEventListeners (público) tal como ya tienes en tu código. Para no duplicar, las dejo intactas. */

export function bindEventListeners() {
  if (_eventsBound) return;
  _eventsBound = true;
  bindEventListenersInner();
}

document.addEventListener('DOMContentLoaded', () => {
  try { ensureLookups(); } catch (e) { /* noop */ }
  bindEventListeners();
  setTimeout(bindEventListeners, 100);
});

export default {
  render: renderEvents,
  bind: bindEventListeners
};
