// components/MyEvents.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { toast, todayISO } from '../utils/helpers.js';
import { navigateTo } from '../utils/router.js';

let _isSubmittingEdit = false;

function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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

/* ---------- Trace wrappers to find who changes hash (installed on import) ---------- */
(function installTraceHashWriters() {
  try {
    function wrap(obj, name) {
      const orig = obj[name];
      if (!orig || orig._isTraced) return;
      obj[name] = function(...args) {
        try {
          console.groupCollapsed('[TRACE-HASH] ' + name + ' called');
          console.log('args:', args);
          console.trace();
          console.groupEnd();
        } catch (e) { console.warn('[TRACE-HASH] trace failed', e); }
        return orig.apply(this, args);
      };
      obj[name]._isTraced = true;
      obj[name]._orig = orig;
    }

    if (history && history.pushState) wrap(history, 'pushState');
    if (history && history.replaceState) wrap(history, 'replaceState');

    const loc = window.location;
    if (loc && !loc._assign_traced) {
      loc._assign_traced = true;
      loc._assign_orig = loc.assign;
      loc.assign = function(url) {
        try {
          console.groupCollapsed('[TRACE-HASH] location.assign');
          console.log('url:', url);
          console.trace();
          console.groupEnd();
        } catch (e) { /* noop */ }
        return loc._assign_orig.call(loc, url);
      };
    }
    if (loc && !loc._replace_traced) {
      loc._replace_traced = true;
      loc._replace_orig = loc.replace;
      loc.replace = function(url) {
        try {
          console.groupCollapsed('[TRACE-HASH] location.replace');
          console.log('url:', url);
          console.trace();
          console.groupEnd();
        } catch (e) { /* noop */ }
        return loc._replace_orig.call(loc, url);
      };
    }

    // also watch direct hash writes
    let lastHash = location.hash;
    setInterval(() => {
      if (location.hash !== lastHash) {
        try {
          console.groupCollapsed('[TRACE-HASH] direct hash change detected ->', location.hash);
          console.trace();
          console.groupEnd();
        } catch (e) { /* noop */ }
        lastHash = location.hash;
      }
    }, 100);

    // log hashchange events with stack
    window.addEventListener('hashchange', () => {
      try {
        console.log('[TRACE] hash changed ->', location.hash);
        console.trace();
      } catch (e) { /* noop */ }
    });

    // trace clicks on data-edit (capturing)
    document.addEventListener('click', (e) => {
      try {
        const b = e.target.closest && e.target.closest('[data-edit]');
        if (b) {
          console.log('[TRACE] data-edit click target=', b);
          console.trace();
        }
      } catch (err) { /* noop */ }
    }, true);

    // helper to inspect modal state from console
    window.__traceCheckModal = function () {
      const m = document.getElementById('eventEditModal');
      console.log('[TRACE] modal present=', !!m, 'parent=', m?.parentElement?.id || m?.parentElement?.tagName || null);
      return !!m;
    };

    console.log('[TRACE-HASH] installed wrappers and watchers');
  } catch (e) {
    console.warn('[TRACE-HASH] install failed', e);
  }
})();

/* ---------- render ---------- */
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
      const ubicacion = ev.ubicacion || '';
      const editable = estado === 'registrado';
      return `
          <tr data-id="${escapeHtml(id)}">
            <td>${escapeHtml(nombre)}</td>
            <td>${escapeHtml(tipo)}</td>
            <td>${escapeHtml(fecha)} ${escapeHtml(hora)}</td>
            <td>${escapeHtml(ubicacion)}</td>
            <td>
              ${editable
          ? `<button type="button" class="btn small" data-edit="${escapeHtml(id)}">Editar</button>
             <button type="button" class="btn small danger" data-delete="${escapeHtml(id)}">Eliminar</button>`
          : `<span class="muted">No editable</span>`}
            </td>
          </tr>
        `;
    }).join('')
    : '<tr><td colspan="6">No has creado eventos aún</td></tr>';

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
              <th>Ubicación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div id="eventEditModal" class="modal" aria-hidden="true" style="display:none;">
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

            <div id="editAvalBlock" style="margin-top:12px; border-top:1px dashed #eee; padding-top:12px;">
              <label class="label">Aval del evento</label>
              <div id="avalExistingWrap" style="margin-bottom:8px;"></div>
              <div id="avalDeleteWrap" style="margin-bottom:8px;"></div>

              <div style="margin-top:8px;">
                <label class="label">Tipo de aval</label>
                <select id="tipoAvalSelect" name="tipoAval" class="select">
                  <option value="">-- seleccionar --</option>
                  <option value="director_programa">Director de Programa</option>
                  <option value="director_docencia">Director de Docencia</option>
                </select>
              </div>

              <div id="avalFileWrap" style="margin-top:8px;">
                <label style="font-size:0.9em;">Subir aval (PDF)</label>
                <input type="file" accept="application/pdf" id="avalFileInput" name="avalPdf" />
              </div>
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

/* ---------- helpers ---------- */
function waitForElement(selector, timeout = 1500, pollInterval = 50) {
  const start = Date.now();
  return new Promise((resolve) => {
    (function poll() {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(poll, pollInterval);
    })();
  });
}

/* ---------- open edit modal (no hash changes here) ---------- */
export async function openEventEditModal(id) {
  try {
    console.log('[openEventEditModal] called id=', id, 'modal present=', !!document.getElementById('eventEditModal'));
    if (!id) { toast('Id de evento inválido', 'error'); return; }

    const modal = document.getElementById('eventEditModal');
    if (!modal) {
      console.error('openEventEditModal: modal no encontrado');
      toast('Modal o formulario no está disponible', 'error');
      return;
    }

    const form = await waitForElement('#eventEditForm', 500);
    const instList = await waitForElement('#editInstList', 500);
    const orgList = await waitForElement('#editOrgList', 500);
    if (!form || !instList || !orgList) {
      console.error('openEventEditModal: elementos del formulario no encontrados', { form: !!form, instList: !!instList, orgList: !!orgList });
      toast('Modal o formulario no está disponible', 'error');
      return;
    }

    const opts = { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'include' };
    const user = getCurrentUser();
    if (user?.token) opts.headers.Authorization = `Bearer ${user.token}`;

    const rEvt = await fetch(`/api/events/${encodeURIComponent(id)}`, opts);
    if (rEvt.status === 401 || rEvt.status === 403) { toast('No autorizado', 'error'); return; }
    const evento = await rEvt.json().catch(() => null);
    if (!rEvt.ok || !evento) { toast('No se pudo cargar el evento', 'error'); return; }

    const setIf = (selector, value) => { const el = form.querySelector(selector); if (el) el.value = value ?? ''; };
    setIf('[name="idEvento"]', evento.idEvento || evento.id || '');
    setIf('[name="idUsuario"]', evento.idUsuario || '');
    setIf('[name="nombre"]', evento.nombre || '');
    setIf('[name="tipo"]', evento.tipo || 'academico');
    setIf('[name="fecha"]', toDateInputValue(evento.fecha || evento.fechaEvento || evento.fecha_inicio || ''));
    setIf('[name="hora"]', evento.hora || '');
    setIf('[name="horaFin"]', evento.horaFin || '');
    setIf('[name="capacidad"]', evento.capacidad || '');

    const installations = Array.isArray(getState().installations) ? getState().installations : [];
    const selectedInstIds = (evento.instalaciones && Array.isArray(evento.instalaciones) && evento.instalaciones.length>0)
      ? evento.instalaciones.map(i => String(i.idInstalacion || i.id || i))
      : (evento.instalacionesIds ? (String(evento.instalacionesIds).split(',').map(x=>x.trim())) : []);
    instList.innerHTML = installations.map(i => {
      const iid = i.idInstalacion || i.id;
      const label = escapeHtml(i.nombre || i.ubicacion || `Instalación ${iid}`);
      const checked = selectedInstIds.includes(String(iid));
      return `<div style="padding:4px 0;"><label><input type="checkbox" class="inst-checkbox" name="instalaciones" value="${escapeHtml(iid)}" ${checked ? 'checked' : ''}> ${label}</label></div>`;
    }).join('');

    // cargar asociaciones y organizaciones (best-effort)
    let assocList = [];
    try {
      const rAssoc = await fetch(`/api/organization-event/event/${encodeURIComponent(id)}`, { credentials: 'include' });
      assocList = rAssoc.ok ? await rAssoc.json().catch(()=>[]) : [];
    } catch (e) { console.warn('No se pudo cargar associations', e); }

    const assocMap = {};
    (assocList || []).forEach(a => {
      const key = String(a.idOrganizacion || (a.org && a.org.idOrganizacion) || a.org_idOrganizacion || '');
      if (!key) return;
      assocMap[key] = a;
    });

    const organizations = Array.isArray(getState().organizations) ? getState().organizations : [];
    orgList.innerHTML = organizations.length ? organizations.map(o => {
      const oid = o.idOrganizacion || o.id;
      const name = escapeHtml(o.nombre || '');
      const sector = escapeHtml(o.sectorEconomico || o.sector || '');
      const lookup = assocMap[String(oid)];
      const checked = !!lookup;
      const participanteVal = lookup ? (lookup.participante || '') : '';
      let certificadoPath = lookup ? (lookup.certificadoParticipacion || null) : null;
      if (certificadoPath && !certificadoPath.startsWith('/')) {
        if (certificadoPath.startsWith('uploads/')) certificadoPath = '/' + certificadoPath;
        else certificadoPath = '/uploads/' + certificadoPath;
      }
      const certLinkHtml = certificadoPath ? `<div style="margin-top:6px;"><a href="${escapeHtml(certificadoPath)}" target="_blank" rel="noopener noreferrer">Ver certificado actual</a></div>` : '';
      const fileInputHtml = `<div style="margin-top:6px;"><label style="font-size:0.9em;">Reemplazar certificado (PDF)</label><input type="file" accept="application/pdf" class="org-cert" data-org="${escapeHtml(oid)}" /></div>`;
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
                  <input type="checkbox" class="org-rep" data-org="${escapeHtml(oid)}" ${lookup && (lookup.esRepresentanteLegal === 'si' || String(lookup.esRepresentanteLegal).toLowerCase()==='true') ? 'checked' : ''} /> Representante legal
                </label>
                <input class="input org-encargado" data-org="${escapeHtml(oid)}" placeholder="Nombre encargado" value="${escapeHtml(participanteVal)}" style="${lookup && (lookup.esRepresentanteLegal === 'si' || String(lookup.esRepresentanteLegal).toLowerCase()==='true') ? 'display:none;' : ''}; width:60%; margin-top:6px;" />
              </div>
              <div style="margin-top:6px; display:${checked ? '' : 'none'};" data-cert-block="${escapeHtml(oid)}">
                ${certLinkHtml}
                ${fileInputHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="muted">No hay organizaciones registradas</div>';

    // mostrar modal
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => form.querySelector('[name="nombre"]')?.focus(), 120);
  } catch (err) {
    console.error('Error cargando evento (edit modal):', err);
    toast('Error al cargar evento', 'error');
  }
}

/* ---------- submit edited event (keeps previous behavior: no credentials added) ---------- */
export async function submitEditedEvent(form) {
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

        organizacionesPayload.push({
          idOrganizacion: orgId,
          esRepresentanteLegal: isRep ? 'si' : 'no',
          participante: participanteValue,
          deleteCertBeforeUpload: !!document.querySelector(`#editOrgList .cert-delete[data-org="${orgId}"]`)?.checked
        });

        const certInput = document.querySelector(`#editOrgList .org-cert[data-org="${orgId}"]`);
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

    const deleteAvalVal = fd.get('delete_aval') || '0';
    if (deleteAvalVal === '1') sendForm.append('delete_aval', '1');

    const avalFileInput = form.querySelector('#avalFileInput');
    const avalFile = avalFileInput?.files?.[0];
    if (avalFile) {
      if (avalFile.type !== 'application/pdf') { toast('Aval debe ser PDF', 'error'); throw new Error('validation'); }
      const tipoAvalSelect = form.querySelector('#tipoAvalSelect');
      const tipoAvalValue = tipoAvalSelect ? (tipoAvalSelect.value || '') : '';
      if (!tipoAvalValue) { toast('Seleccione el tipo de aval antes de subir el archivo', 'error'); throw new Error('validation'); }
      sendForm.append('tipoAval', tipoAvalValue);
      sendForm.append('avalPdf', avalFile);
    }

    if (Array.isArray(organizacionesPayload)) {
      for (const p of organizacionesPayload) {
        const oid = p.idOrganizacion;
        const certInput = document.querySelector(`#editOrgList .org-cert[data-org="${oid}"]`);
        const cert = certInput?.files?.[0];
        if (cert) sendForm.append(`certificado_org_${oid}`, cert);
        if (p.deleteCertBeforeUpload) sendForm.append(`delete_cert_org_${oid}`, '1');
      }
    }

    console.debug('Enviar organizaciones payload:', organizacionesPayload);

    const idEvento = form.querySelector('[name="idEvento"]')?.value;
    const url = `/api/events/${encodeURIComponent(idEvento)}`;

    const res = await fetch(url, { method: 'PUT', body: sendForm });
    if (res.status === 401 || res.status === 403) { toast('Sesión expirada', 'error'); navigateTo('login'); return; }
    const data = await res.json().catch(()=>null);
    if (!res.ok) { console.error('Backend error events PUT:', data); toast(data?.error || data?.message || 'Error actualizando evento', 'error'); return; }

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

/* ---------- listeners binding ---------- */
export function bindMyEventsListeners() {
  const container = document.getElementById('view') || document;

  container.addEventListener('click', async (e) => {
    // prevent default for anchors to reduce accidental hash changes
    const anchor = e.target.closest && e.target.closest('a[href]');
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
    }

    const editBtn = e.target.closest && e.target.closest('[data-edit]');
    const deleteBtn = e.target.closest && e.target.closest('[data-delete]');

    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = editBtn.getAttribute('data-edit');
      console.log('[myEvents] Edit clicked id=', id);
      await openEventEditModal(id);
      return;
    }

    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = deleteBtn.getAttribute('data-delete');
      if (!confirm('¿Eliminar este evento?')) return;
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const body = await res.json().catch(()=>null);
        if (!res.ok) { toast(body?.error || 'Error eliminando evento', 'error'); return; }
        toast('Evento eliminado', 'success');
        const updated = (getState().events || []).filter(ev => String(ev.idEvento || ev.id) !== String(id));
        setState({ ...getState(), events: updated });
      } catch (err) { console.error(err); toast('Error eliminando evento', 'error'); }
      return;
    }

    if (e.target?.id === 'closeEditModal' || e.target?.id === 'evtEditCancelBtn') {
      const modal = document.getElementById('eventEditModal');
      if (modal) modal.style.display = 'none';
      return;
    }

    if (e.target?.id === 'editInstSelectAll') {
      const checked = !!e.target.checked;
      document.querySelectorAll('#editInstList .inst-checkbox').forEach(cb => cb.checked = checked);
      return;
    }

    if (e.target?.id === 'editHasOrg') {
      const block = document.getElementById('editOrgBlock');
      if (block) block.style.display = e.target.checked ? '' : 'none';
      return;
    }

    if (e.target && e.target.classList && e.target.classList.contains('org-select')) {
      const orgId = e.target.value;
      const certBlock = document.querySelector(`#editOrgList [data-cert-block="${escapeHtml(orgId)}"]`);
      if (certBlock) certBlock.style.display = e.target.checked ? '' : 'none';
      return;
    }

    if (e.target && e.target.classList && e.target.classList.contains('org-rep')) {
      const orgId = e.target.getAttribute('data-org');
      const enc = document.querySelector(`#editOrgList .org-encargado[data-org="${escapeHtml(orgId)}"]`);
      if (!enc) return;
      if (e.target.checked) { enc.setAttribute('data-prev', enc.value || ''); enc.value = ''; enc.style.display = 'none'; }
      else { enc.value = enc.getAttribute('data-prev') || ''; enc.style.display = ''; }
      return;
    }

    if (e.target && e.target.classList && e.target.classList.contains('aval-delete')) {
      const chk = e.target.checked;
      const fileWrap = document.getElementById('avalFileWrap');
      const deleteHiddenInput = document.querySelector('input[name="delete_aval"]');
      if (fileWrap) fileWrap.style.display = chk ? '' : 'none';
      if (deleteHiddenInput) deleteHiddenInput.value = chk ? '1' : '0';
      return;
    }
  });

  container.addEventListener('input', (e) => {
    if (e.target?.id === 'editOrgFilter') {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#editOrgList .org-item').forEach(div => {
        div.style.display = div.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      return;
    }
  });

  container.addEventListener('submit', async (e) => {
    if (e.target?.id !== 'eventEditForm') return;
    e.preventDefault();
    await submitEditedEvent(e.target);
  });
}
