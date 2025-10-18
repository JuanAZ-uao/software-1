// components/myEvents.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { toast } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

let _isSubmittingEdit = false;

function escapeHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toDateInputValue(raw) {
  if (!raw) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch { return ''; }
}

export function renderMyEvents() {
  const user = getCurrentUser();
  const allEvents = getState().events || [];
  const myEvents = allEvents.filter(ev => String(ev.idUsuario) === String(user?.id));

  const rows = myEvents.length
    ? myEvents.map(ev => {
        const id = ev.idEvento || ev.id;
        const nombre = ev.nombre || '';
        const tipo = ev.tipo || '';
        const fecha = ev.fecha || '';
        const hora = ev.hora || '';
        const estado = ev.estado || '';
        const editable = estado === 'registrado';
        return `
          <tr data-id="${escapeHtml(id)}">
            <td>${escapeHtml(nombre)}</td>
            <td>${escapeHtml(tipo)}</td>
            <td>${escapeHtml(fecha)} ${escapeHtml(hora)}</td>
            <td>${escapeHtml(estado)}</td>
            <td>
              ${editable
                ? `<button class="btn small" data-edit="${escapeHtml(id)}">Editar</button>
                   <button class="btn small danger" data-delete="${escapeHtml(id)}">Eliminar</button>`
                : `<span class="muted">No editable</span>`}
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5">No has creado eventos aún</td></tr>';

  return `
    <div class="card">
      <div class="card-head"><strong>Mis Eventos</strong></div>
      <div class="card-body table-wrap">
        <table class="table" id="myEventsTable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div id="eventEditModal" class="modal" style="display:none;">
      <div class="sheet" style="max-width:980px;">
        <div class="head">
          <strong>Editar Evento</strong>
          <button class="btn small" id="closeEditModal">✕</button>
        </div>
        <div class="body">
          <form id="eventEditForm" class="flex-col gap-12" enctype="multipart/form-data" autocomplete="off">
            <input type="hidden" name="idEvento">
            <input type="hidden" name="idUsuario">

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
              <div style="flex:1"><label class="label">Fecha</label><input class="input" name="fecha" type="date" required></div>
              <div style="flex:1"><label class="label">Hora inicio</label><input class="input" name="hora" type="time" required></div>
              <div style="flex:1"><label class="label">Hora fin</label><input class="input" name="horaFin" type="time" required></div>
            </div>

            <div>
              <label class="label">Instalaciones</label>
              <div id="editInstList" style="border:1px solid #ddd; padding:8px; max-height:160px; overflow:auto;"></div>
              <div style="margin-top:8px;">
                <label style="cursor:pointer;"><input type="checkbox" id="editInstSelectAll" /> Seleccionar/Deseleccionar todas</label>
              </div>
            </div>

            <div>
              <label><input type="checkbox" id="editHasOrg" name="hasOrganization"> Participa organización externa</label>
            </div>

            <div id="editOrgBlock" style="display:none; margin-top:8px;">
              <label class="label">Organizaciones participantes</label>
              <input id="editOrgFilter" class="input" placeholder="Filtrar por nombre o sector" style="margin-bottom:8px;">
              <div id="editOrgList" style="max-height:320px; overflow:auto; border:1px solid #ddd; padding:6px;"></div>
            </div>

            <div class="flex-row" style="gap:8px;">
              <button type="submit" class="btn primary" id="evtEditSubmitBtn">Guardar cambios</button>
              <button type="button" class="btn" id="evtEditCancelBtn">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

/* ---------- listeners ---------- */
export function bindMyEventsListeners() {
  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'closeEditModal' || e.target?.id === 'evtEditCancelBtn') {
      const modal = document.getElementById('eventEditModal');
      if (modal) modal.style.display = 'none';
      return;
    }

    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete');
      if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
      try {
        const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) { toast(body.error || 'Error eliminando evento', 'error'); return; }
        toast('Evento eliminado correctamente', 'success');
        const updatedEvents = getState().events.filter(ev => String(ev.idEvento || ev.id) !== String(id));
        setState({ ...getState(), events: updatedEvents });
      } catch (err) {
        console.error('Error eliminando evento:', err); toast('Error eliminando evento', 'error');
      }
      return;
    }

    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-edit');
      await openEventEditModal(id);
      return;
    }

    if (e.target?.id === 'editInstSelectAll') {
      const chk = !!e.target.checked;
      document.querySelectorAll('#editInstList .inst-checkbox').forEach(cb => cb.checked = chk);
      return;
    }

    if (e.target?.id === 'editHasOrg') {
      const block = document.getElementById('editOrgBlock');
      if (block) block.style.display = e.target.checked ? '' : 'none';
      return;
    }

    // toggle cert delete checkbox shows/hides file input
    if (e.target && e.target.classList && e.target.classList.contains('cert-delete')) {
      const orgId = e.target.getAttribute('data-org');
      const fileWrap = document.querySelector(`#editOrgList [data-file-wrap="${escapeHtml(orgId)}"]`);
      if (fileWrap) fileWrap.style.display = e.target.checked ? '' : 'none';
      return;
    }

    // toggle org-select shows/hides cert block area
    if (e.target && e.target.classList && e.target.classList.contains('org-select')) {
      const orgId = e.target.value;
      const certBlock = document.querySelector(`#editOrgList [data-cert-block="${escapeHtml(orgId)}"]`);
      if (certBlock) certBlock.style.display = e.target.checked ? '' : 'none';
      return;
    }

    // org-rep checkbox handler: hide/show encargado and preserve value
    if (e.target && e.target.classList && e.target.classList.contains('org-rep')) {
      const orgId = e.target.getAttribute('data-org');
      const enc = document.querySelector(`#editOrgList .org-encargado[data-org="${escapeHtml(orgId)}"]`);
      if (!enc) return;
      if (e.target.checked) { enc.setAttribute('data-prev', enc.value || ''); enc.value = ''; enc.style.display = 'none'; }
      else { enc.value = enc.getAttribute('data-prev') || ''; enc.style.display = ''; }
      return;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target?.id === 'editOrgFilter') {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#editOrgList .org-item').forEach(div => {
        div.style.display = div.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      return;
    }
  });

  document.addEventListener('submit', async (e) => {
    if (e.target?.id !== 'eventEditForm') return;
    e.preventDefault();
    await submitEditedEvent(e.target);
  });
}

/* ---------- open modal and preload data ---------- */
async function openEventEditModal(id) {
  try {
    const rEvt = await fetch(`/api/events/${id}`);
    if (rEvt.status === 401 || rEvt.status === 403) { toast('No autorizado', 'error'); return; }
    const evento = await rEvt.json();
    if (!rEvt.ok || !evento) { toast('No se pudo cargar el evento', 'error'); return; }

    const st = getState();
    if (!Array.isArray(st.installations) || st.installations.length === 0) {
      try { const rInst = await fetch('/api/installations'); const instData = await rInst.json(); setState({ ...getState(), installations: Array.isArray(instData) ? instData : [] }); } catch {}
    }
    if (!Array.isArray(st.organizations) || st.organizations.length === 0) {
      try { const rOrg = await fetch('/api/organizations'); const orgData = await rOrg.json(); setState({ ...getState(), organizations: Array.isArray(orgData) ? orgData : [] }); } catch {}
    }

    const rAssoc = await fetch(`/api/organization-event/event/${id}`);
    const assocList = rAssoc.ok ? await rAssoc.json() : [];

    const modal = document.getElementById('eventEditModal');
    const form = document.getElementById('eventEditForm');
    const instList = document.getElementById('editInstList');
    const orgList = document.getElementById('editOrgList');
    if (!modal || !form || !instList || !orgList) { toast('Modal o formulario no está disponible', 'error'); return; }

    const setIf = (selector, value) => { const el = form.querySelector(selector); if (el) el.value = value ?? ''; };
    setIf('[name="idEvento"]', evento.idEvento || evento.id || '');
    setIf('[name="idUsuario"]', evento.idUsuario || '');
    setIf('[name="nombre"]', evento.nombre || '');
    setIf('[name="tipo"]', evento.tipo || 'academico');
    setIf('[name="fecha"]', toDateInputValue(evento.fecha || evento.fechaEvento || evento.fecha_inicio || ''));
    setIf('[name="hora"]', evento.hora || '');
    setIf('[name="horaFin"]', evento.horaFin || '');
    setIf('[name="capacidad"]', evento.capacidad || '');

    // instalaciones
    const installations = Array.isArray(getState().installations) ? getState().installations : [];
    instList.innerHTML = installations.map(i => {
      const iid = i.idInstalacion || i.id;
      const label = escapeHtml(i.nombre || i.ubicacion || `Instalación ${iid}`);
      const checked = Array.isArray(evento.instalaciones) && evento.instalaciones.some(x => String(x) === String(iid));
      return `<div style="padding:4px 0;"><label><input type="checkbox" class="inst-checkbox" name="instalaciones" value="${escapeHtml(iid)}" ${checked ? 'checked' : ''}> ${label}</label></div>`;
    }).join('');

    // map associations by org id (assoc rows include certificadoParticipacion, participante, esRepresentanteLegal, org data)
    const assocMap = {};
    (assocList || []).forEach(a => {
      const key = String(a.idOrganizacion || (a.org && a.org.idOrganizacion) || a.org_idOrganizacion || '');
      if (!key) return;
      assocMap[key] = a;
    });

    const hasOrg = Object.keys(assocMap).length > 0;
    const editHasOrgEl = document.getElementById('editHasOrg');
    const editOrgBlockEl = document.getElementById('editOrgBlock');
    if (editHasOrgEl) editHasOrgEl.checked = hasOrg;
    if (editOrgBlockEl) editOrgBlockEl.style.display = hasOrg ? '' : 'none';

    const organizations = Array.isArray(getState().organizations) ? getState().organizations : [];
    orgList.innerHTML = organizations.length ? organizations.map(o => {
      const oid = o.idOrganizacion || o.id;
      const name = escapeHtml(o.nombre || '');
      const sector = escapeHtml(o.sectorEconomico || o.sector || '');
      const lookup = assocMap[String(oid)];
      const checked = !!lookup;

      // normalize esRepresentanteLegal
      let rep = false;
      if (lookup) {
        const val = lookup.esRepresentanteLegal ?? lookup.representanteLegal ?? (lookup.org && lookup.org.representanteLegal);
        rep = (val === true) || String(val).toLowerCase() === 'si' || String(val).toLowerCase() === 'true';
      }

      // participante value if exists on assoc
      const participanteVal = lookup ? (lookup.participante || '') : '';

      // certificado path normalization
      let certificadoPath = lookup ? (lookup.certificadoParticipacion || null) : null;
      if (certificadoPath && !certificadoPath.startsWith('/')) {
        if (certificadoPath.startsWith('uploads/')) certificadoPath = '/' + certificadoPath;
        else certificadoPath = '/uploads/' + certificadoPath;
      }

      // if there's an existing certificado, show it and show a checkbox to "Eliminar anterior" before enabling file input
      const certExistsHtml = certificadoPath ? `<div style="margin-top:6px;"><a href="${escapeHtml(certificadoPath)}" target="_blank" rel="noopener noreferrer">Ver certificado actual</a></div>` : '';
      const deleteCheckboxHtml = certificadoPath ? `<div style="margin-top:6px;"><label><input type="checkbox" class="cert-delete" data-org="${escapeHtml(oid)}"> Borrar certificado anterior para poder subir uno nuevo</label></div>` : '';

      // file input wraps start hidden unless delete checkbox is checked (for existing cert) or cert did not exist
      const fileInputVisible = certificadoPath ? 'style="display:none;"' : '';
      const fileInputHtml = `<div ${fileInputVisible} data-file-wrap="${escapeHtml(oid)}"><label style="font-size:0.9em;">Subir certificado (PDF)</label><input type="file" accept="application/pdf" class="org-cert" data-org="${escapeHtml(oid)}" /></div>`;

      return `
        <div class="org-item" data-org-id="${escapeHtml(oid)}" style="padding:6px; border-bottom:1px solid #f0f0f0;">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="org-select" name="organizaciones[]" value="${escapeHtml(oid)}" ${checked ? 'checked' : ''} />
                <strong>${name}</strong>
                <small style="margin-left:8px; color:#666;">— ${sector}</small>
              </div>

              <div style="margin-top:6px;">
                <label style="margin-right:8px;">
                  <input type="checkbox" class="org-rep" data-org="${escapeHtml(oid)}" ${rep ? 'checked' : ''} /> Representante legal
                </label>
                <input class="input org-encargado" data-org="${escapeHtml(oid)}" placeholder="Nombre encargado" value="${escapeHtml(participanteVal)}" style="${rep ? 'display:none;' : ''}; width:60%; margin-top:6px;" />
              </div>

              <div style="margin-top:6px; display:${checked ? '' : 'none'};" data-cert-block="${escapeHtml(oid)}">
                ${certExistsHtml}
                ${deleteCheckboxHtml}
                ${fileInputHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="muted">No hay organizaciones registradas</div>';

    // show modal
    modal.style.display = 'block';
    setTimeout(() => form.querySelector('[name="nombre"]')?.focus(), 100);
  } catch (err) {
    console.error('Error cargando evento (edit modal):', err);
    toast('Error al cargar evento', 'error');
  }
}

/* ---------- submit edited event ---------- */
async function submitEditedEvent(form) {
  if (_isSubmittingEdit) { toast('Enviando... espera', 'info'); return; }
  _isSubmittingEdit = true;
  const submitBtn = document.getElementById('evtEditSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const fd = new FormData(form);
    const nombre = (fd.get('nombre') || '').toString().trim();
    const tipo = (fd.get('tipo') || '').toString().trim();
    const fecha = (fd.get('fecha') || '').toString().trim();
    const hora = (fd.get('hora') || '').toString().trim();
    const horaFin = (fd.get('horaFin') || '').toString().trim();

    if (!nombre) { toast('Nombre del evento requerido', 'error'); throw new Error('validation'); }
    if (!tipo) { toast('Tipo de evento requerido', 'error'); throw new Error('validation'); }
    if (!fecha) { toast('Fecha del evento requerida', 'error'); throw new Error('validation'); }
    if (!hora) { toast('Hora inicio del evento requerida', 'error'); throw new Error('validation'); }
    if (!horaFin) { toast('Hora fin del evento requerida', 'error'); throw new Error('validation'); }

    const instalacionCheckboxes = Array.from(form.querySelectorAll('.inst-checkbox'));
    const instalacionesIds = instalacionCheckboxes.filter(cb => cb.checked).map(cb => cb.value).filter(Boolean);
    if (!instalacionesIds.length) { toast('Seleccione al menos una instalación', 'error'); throw new Error('validation'); }

    const hasOrg = !!document.getElementById('editHasOrg')?.checked;
    const organizacionesPayload = [];
    const organizationsState = Array.isArray(getState().organizations) ? getState().organizations : [];

    if (hasOrg) {
      const selected = Array.from(form.querySelectorAll('#editOrgList input.org-select:checked'));
      if (selected.length === 0) { toast('Seleccione al menos una organización participante', 'error'); throw new Error('validation'); }

      for (const cb of selected) {
        const orgId = cb.value;
        const repEl = document.querySelector(`#editOrgList .org-rep[data-org="${orgId}"]`);
        const isRep = !!(repEl && (repEl.checked === true || String(repEl.checked) === 'true'));
        const encEl = document.querySelector(`#editOrgList .org-encargado[data-org="${orgId}"]`);
        const encargadoValRaw = encEl ? encEl.value : '';
        const encargadoVal = encargadoValRaw ? String(encargadoValRaw).trim() : '';

        // If checked as representante legal, ensure we send a non-empty participante:
        // Priority: user-provided encargadoVal > organizationsState.representanteLegal > validation error
        let participanteValue = null;
        if (isRep) {
          if (encargadoVal) participanteValue = encargadoVal;
          else {
            const orgRec = organizationsState.find(x => String(x.idOrganizacion || x.id) === String(orgId));
            const repFromOrg = orgRec ? (orgRec.representanteLegal || orgRec.representante || orgRec.representante_legal) : null;
            if (repFromOrg && String(repFromOrg).trim()) participanteValue = String(repFromOrg).trim();
            else { toast(`Falta representante legal registrado para la organización con id: ${orgId}`, 'error'); throw new Error('validation'); }
          }
        } else {
          participanteValue = encargadoVal || null;
          if (!participanteValue) { toast('Ingrese encargado para organización sin representante legal', 'error'); throw new Error('validation'); }
        }

        // Determine if user asked to delete existing cert for this org (then file input must be used to upload new one)
        const deleteCheckbox = document.querySelector(`#editOrgList .cert-delete[data-org="${orgId}"]`);
        const wantsDelete = !!(deleteCheckbox && deleteCheckbox.checked);

        organizacionesPayload.push({
          idOrganizacion: orgId,
          esRepresentanteLegal: isRep ? 'si' : 'no',
          participante: participanteValue,
          deleteCertBeforeUpload: wantsDelete // flag auxiliar para backend if needed
        });

        // Validate file input if visible (if user wants to upload new cert)
        const fileWrap = document.querySelector(`#editOrgList [data-file-wrap="${orgId}"]`);
        const certInput = fileWrap ? fileWrap.querySelector('.org-cert') : document.querySelector(`#editOrgList .org-cert[data-org="${orgId}"]`);
        const cert = certInput?.files?.[0];
        if (cert && cert.type !== 'application/pdf') { toast('Certificado debe ser PDF', 'error'); throw new Error('validation'); }
      }
    }

    const sendForm = new FormData();
    const payloadEvento = {
      idUsuario: fd.get('idUsuario') || getCurrentUser()?.id,
      instalaciones: instalacionesIds,
      estado: 'registrado',
      nombre,
      tipo,
      fecha,
      hora,
      horaFin,
      descripcion: fd.get('descripcion') || '',
      capacidad: fd.get('capacidad') ? Number(fd.get('capacidad')) : null
    };
    sendForm.append('evento', JSON.stringify(payloadEvento));
    sendForm.append('organizaciones', JSON.stringify(organizacionesPayload));
    sendForm.append('instalaciones', JSON.stringify(instalacionesIds));

    if (hasOrg) {
      for (const p of organizacionesPayload) {
        const oid = p.idOrganizacion;
        const fileWrap = document.querySelector(`#editOrgList [data-file-wrap="${oid}"]`);
        const certInput = fileWrap ? fileWrap.querySelector('.org-cert') : document.querySelector(`#editOrgList .org-cert[data-org="${oid}"]`);
        const cert = certInput?.files?.[0];
        // only append a file when user provided one (and optionally indicated deletion first)
        if (cert) sendForm.append(`certificado_org_${oid}`, cert);
        // forward delete flag so backend can remove previous file if requested
        if (p.deleteCertBeforeUpload) sendForm.append(`delete_cert_org_${oid}`, '1');
      }
    }

    console.debug('Enviar organizaciones payload:', organizacionesPayload);

    const idEvento = form.querySelector('[name="idEvento"]')?.value;
    const url = `/api/events/${encodeURIComponent(idEvento)}`;
    const res = await fetch(url, { method: 'PUT', body: sendForm });
    if (res.status === 401 || res.status === 403) { toast('Sesión expirada', 'error'); navigateTo('login'); return; }
    const data = await res.json();
    if (!res.ok) { console.error('Backend error events PUT:', data); toast(data.error || data.message || 'Error actualizando evento', 'error'); return; }

    toast('Evento actualizado correctamente', 'success');
    const st = getState();
    const evs = Array.isArray(st.events) ? st.events.slice() : [];
    const idx = evs.findIndex(ev => String(ev.idEvento || ev.id) === String(idEvento));
    if (idx >= 0) evs[idx] = data; else evs.unshift(data);
    setState({ ...st, events: evs });

    const modal = document.getElementById('eventEditModal');
    if (modal) modal.style.display = 'none';
  } catch (err) {
    if (err.message !== 'validation') console.error('Error actualizando evento:', err);
  } finally {
    _isSubmittingEdit = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}
