// src/components/myEvents.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { toast } from '../utils/helpers.js';
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

/* ---------- util: normalizar usuarios, estilos y debounce ---------- */

function normalizeUsers(rawUsers = []) {
  return (rawUsers || []).map(u => {
    const id = u?.id ?? u?.idUsuario ?? u?.idUser ?? u?.userId ?? null;
    return {
      id: id != null ? String(id) : '',
      nombre: u?.nombre ?? u?.firstName ?? '',
      apellidos: u?.apellidos ?? u?.lastName ?? '',
      email: u?.email ?? '',
      isSecretaria: Boolean(u?.isSecretaria === 1 || u?.isSecretaria === true || u?.is_secretaria === 1 || u?.is_secretaria === true)
    };
  }).filter(x => x.id);
}

function ensureParticipantStyles() {
  if (document.getElementById('participants-list-styles')) return;
  const css = `
    #editParticipantsList .participant-item { display:flex; align-items:center; gap:8px; padding:6px 8px; border-bottom:1px solid #f3f3f3; transition: opacity .18s, height .18s, margin .18s; }
    #editParticipantsList .participant-item.hidden { opacity:0; height:0; margin:0; padding:0 8px; overflow:hidden; border:none; }
    #editParticipantsList .participant-item .participant-label { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #editParticipantFilter { margin-bottom:8px; }
  `;
  const s = document.createElement('style');
  s.id = 'participants-list-styles';
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
}

function debounce(fn, wait = 180) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

/* ---------- render / modal ---------- */

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
            <td>${escapeHtml(estado)}</td>
            <td>
              ${editable
          ? `<button class="btn small" data-edit="${escapeHtml(id)}">Editar</button>
             <button class="btn small danger" data-delete="${escapeHtml(id)}">Eliminar</button>
             <button class="btn small secondary" data-send="${escapeHtml(id)}">Enviar</button>`
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
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div id="eventEditModal" class="modal">
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
              <label class="label">Capacidad</label>
              <input class="input" name="capacidad" type="number" min="1" required />
              <div id="instCapacitySummary" style="font-size:0.9em; margin-top:6px; color:#555;"></div>
            </div>

            <div>
              <label class="label">Instalaciones</label>
              <div id="editInstList" style="border:1px solid #ddd; padding:8px; max-height:160px; overflow:auto;"></div>
              <div style="margin-top:8px;">
                <label style="cursor:pointer;"><input type="checkbox" id="editInstSelectAll" /> Seleccionar/Deseleccionar todas</label>
              </div>
            </div>

            <!-- Organizadores adicionales -->
            <div>
              <label class="label">Organizadores adicionales</label>
              <input id="editParticipantFilter" class="input" placeholder="Buscar por nombre o email" style="margin-bottom:6px;" />
              <div id="editParticipantsList" style="max-height:160px; overflow:auto; border:1px solid #ddd; padding:6px;"></div>
              <small class="muted">No seleccione usuarias marcadas como "Secretaría"</small>
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

/* ---------- listeners ---------- */
export function bindMyEventsListeners() {
  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'closeEditModal' || e.target?.id === 'evtEditCancelBtn') {
      const modal = document.getElementById('eventEditModal');
      if (modal) modal.classList.remove('open');
      return;
    }

    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-delete');
      if (!confirm('¿Eliminar este evento?')) return;
      try {
        const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) { toast(body.error || 'Error eliminando evento', 'error'); return; }
        toast('Evento eliminado', 'success');
        const updatedEvents = getState().events.filter(ev => String(ev.idEvento || ev.id) !== String(id));
        setState({ ...getState(), events: updatedEvents });
      } catch (err) {
        console.error(err); toast('Error eliminando evento', 'error');
      }
      return;
    }

    const sendBtn = e.target.closest('[data-send]');
    if (sendBtn) {
      const id = sendBtn.getAttribute('data-send');
      if (!confirm('Enviar evento para revisión? Esto cambiará el estado a enRevision')) return;
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(id)}/send`, { method: 'POST' });
        if (res.status === 401 || res.status === 403) { toast('No autorizado', 'error'); return; }
        if (!res.ok) {
          const b = await res.json().catch(()=>({}));
          toast(b.error || b.message || 'No se pudo enviar el evento', 'error');
          return;
        }
        const updated = await res.json().catch(()=>null);
        const st = getState();
        const evs = Array.isArray(st.events) ? st.events.slice() : [];
        const idx = evs.findIndex(ev => String(ev.idEvento || ev.id) === String(id));
        if (updated && idx >= 0) evs[idx] = updated;
        else if (idx >= 0) evs[idx].estado = 'enRevision';
        setState({ ...st, events: evs });
        toast('Evento enviado para revisión', 'success');
      } catch (err) {
        console.error('Error enviando evento:', err);
        toast('Error enviando evento', 'error');
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
      updateInstCapacitySummary();
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

  document.addEventListener('change', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('inst-checkbox')) {
      setSelectAllCheckbox();
      updateInstCapacitySummary();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target?.id === 'editOrgFilter') {
      const q = (e.target.value || '').toLowerCase().trim();
      document.querySelectorAll('#editOrgList .org-item').forEach(div => {
        const textMatch = div.textContent.toLowerCase().includes(q);
        const nitAttr = (div.getAttribute('data-nit') || '').toLowerCase();
        const nitMatch = nitAttr && nitAttr.includes(q);
        div.style.display = (q === '' || textMatch || nitMatch) ? '' : 'none';
      });
      return;
    }
    if (e.target?.id === 'editParticipantFilter') {
      // debounce + attribute-based filtering to preserve layout
      if (!window.__editParticipantFilterDebounced) {
        window.__editParticipantFilterDebounced = debounce((q) => {
          const ql = (q || '').toLowerCase().trim();
          document.querySelectorAll('#editParticipantsList .participant-item').forEach(lbl => {
            const name = lbl.getAttribute('data-name') || '';
            const email = lbl.getAttribute('data-email') || '';
            const match = !ql || name.includes(ql) || email.includes(ql);
            if (match) lbl.classList.remove('hidden'); else lbl.classList.add('hidden');
          });
        }, 160);
      }
      window.__editParticipantFilterDebounced(e.target.value || '');
      return;
    }
  });

  document.addEventListener('submit', async (e) => {
    if (e.target?.id !== 'eventEditForm') return;
    e.preventDefault();
    await submitEditedEvent(e.target);
  });
}

/* ---------- helper UI functions ---------- */

function buildInstListHtml(installations, selectedIds) {
  return (installations || []).map(i => {
    const iid = i.idInstalacion || i.id;
    const label = escapeHtml(i.nombre || i.ubicacion || `Instalación ${iid}`);
    const checked = (selectedIds || []).some(x => String(x) === String(iid));
    const cap = i.capacidad != null ? i.capacidad : 0;
    return `<div style="padding:4px 0;"><label><input type="checkbox" class="inst-checkbox" name="instalaciones" value="${escapeHtml(iid)}" ${checked ? 'checked' : ''}> ${label} — cap: ${escapeHtml(cap)}</label></div>`;
  }).join('');
}

function buildParticipantsListHtml(users, selectedIds = [], creatorId) {
  const selectedSet = new Set((selectedIds || []).map(String));
  ensureParticipantStyles();
  return (users || []).filter(u => String(u.id ?? u.idUsuario ?? '') !== String(creatorId)).map(u => {
    const id = String(u.id ?? u.idUsuario ?? '');
    const name = `${u.nombre || ''} ${u.apellidos || ''}`.trim();
    const email = u.email || '';
    const isSec = u.isSecretaria === true || u.isSecretaria === 1;
    const checked = selectedSet.has(String(id));
    const dataName = escapeHtml((name || '').toLowerCase());
    const dataEmail = escapeHtml((email || '').toLowerCase());
    return `<label class="participant-item" data-name="${dataName}" data-email="${dataEmail}">
      <input type="checkbox" class="participant-checkbox" value="${escapeHtml(id)}" ${checked ? 'checked' : ''} ${isSec ? 'disabled' : ''} />
      <span class="participant-label">${escapeHtml(name)}${email ? ` — ${escapeHtml(email)}` : ''}${isSec ? ' (Secretaria)' : ''}</span>
    </label>`;
  }).join('');
}

function getSelectedInstalacionesFromModal() {
  const checkboxes = Array.from(document.querySelectorAll('#editInstList .inst-checkbox'));
  return checkboxes.filter(cb => cb.checked).map(cb => cb.value);
}

function setSelectAllCheckbox() {
  const all = Array.from(document.querySelectorAll('#editInstList .inst-checkbox'));
  const chk = document.getElementById('editInstSelectAll');
  if (!all.length) { if (chk) chk.checked = false; return; }
  const checked = all.filter(cb => cb.checked).length === all.length;
  if (chk) chk.checked = checked;
}

function updateInstCapacitySummary() {
  const selectedIds = getSelectedInstalacionesFromModal().map(String);
  const list = Array.isArray(getState().installations) ? getState().installations : [];
  const total = list.filter(i => selectedIds.includes(String(i.idInstalacion || i.id))).reduce((s, r) => s + Number(r.capacidad || 0), 0);
  const el = document.getElementById('instCapacitySummary');
  if (el) el.textContent = `Capacidad total disponible según instalaciones seleccionadas: ${total}`;
}

/* ---------- open modal and preload data ---------- */

async function openEventEditModal(id) {
  try {
    const rEvt = await fetch(`/api/events/${id}`);
    if (rEvt.status === 401 || rEvt.status === 403) { toast('No autorizado', 'error'); return; }
    const evento = await rEvt.json();
    if (!rEvt.ok || !evento) { toast('No se pudo cargar el evento', 'error'); return; }

    // Solo el organizador principal puede editar
    const currentUser = getCurrentUser();
    if (!currentUser || String(currentUser.id) !== String(evento.idUsuario)) {
      toast('No autorizado para editar este evento', 'error');
      return;
    }

    // ensure installations in state
    try {
      const rInst = await fetch('/api/installations');
      const instList = await rInst.json();
      setState({ ...getState(), installations: instList || [] });
    } catch (e) { /* noop */ }

    // ensure organizations in state
    const st = getState();
    if (!Array.isArray(st.organizations) || st.organizations.length === 0) {
      try { const rOrg = await fetch('/api/organizations'); setState({ ...getState(), organizations: await rOrg.json() || [] }); } catch { /* noop */ }
    }

    // ensure users in state for participants list (normalize)
    const stUsers = Array.isArray(getState().users) ? getState().users : [];
    if (!stUsers.length) {
      try {
        const ru = await fetch('/api/usuarios?q=&page=1&limit=1000');
        const usersRaw = await ru.json();
        const normalized = normalizeUsers(Array.isArray(usersRaw) ? usersRaw : (usersRaw.usuarios || usersRaw.users || usersRaw.data || []));
        setState({ ...getState(), users: normalized });
      } catch (e) { /* noop */ }
    }

    const rAssoc = await fetch(`/api/organization-event/event/${id}`);
    const assocList = rAssoc.ok ? await rAssoc.json() : [];

    const modal = document.getElementById('eventEditModal');
    const form = document.getElementById('eventEditForm');
    const instList = document.getElementById('editInstList');
    const orgList = document.getElementById('editOrgList');
    const participantsListEl = document.getElementById('editParticipantsList');
    if (!modal || !form || !instList || !orgList || !participantsListEl) { toast('Modal o formulario no está disponible', 'error'); return; }

    const setIf = (selector, value) => { const el = form.querySelector(selector); if (el) el.value = value ?? ''; };
    setIf('[name="idEvento"]', evento.idEvento || evento.id || '');
    setIf('[name="idUsuario"]', evento.idUsuario || '');
    setIf('[name="nombre"]', evento.nombre || '');
    setIf('[name="tipo"]', evento.tipo || 'academico');
    setIf('[name="fecha"]', toDateInputValue(evento.fecha || evento.fechaEvento || evento.fecha_inicio || ''));
    setIf('[name="hora"]', evento.hora || '');
    setIf('[name="horaFin"]', evento.horaFin || '');
    setIf('[name="capacidad"]', evento.capacidad != null ? String(evento.capacidad) : '');

    // instalaciones
    const instalacionIds = Array.isArray(evento.instalacionesIds) && evento.instalacionesIds.length
      ? evento.instalacionesIds.map(String)
      : (Array.isArray(evento.instalaciones) ? evento.instalaciones.map(i => String(i.idInstalacion || i)) : []);

    const installations = Array.isArray(getState().installations) ? getState().installations : [];
    instList.innerHTML = buildInstListHtml(installations, instalacionIds);

    setSelectAllCheckbox();
    updateInstCapacitySummary();

    // map associations
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
      const nitVal = escapeHtml(o.nit || '');
      const sector = escapeHtml(o.sectorEconomico || o.sector || '');
      const lookup = assocMap[String(oid)];
      const checked = !!lookup;

      let rep = false;
      if (lookup) {
        const val = lookup.esRepresentanteLegal ?? lookup.representanteLegal ?? (lookup.org && lookup.org.representanteLegal);
        rep = (val === true) || String(val).toLowerCase() === 'si' || String(val).toLowerCase() === 'true';
      }

      const participanteVal = lookup ? (lookup.participante || '') : '';

      let certificadoPath = lookup ? (lookup.certificadoParticipacion || null) : null;
      if (certificadoPath && !certificadoPath.startsWith('/')) {
        if (certificadoPath.startsWith('uploads/')) certificadoPath = '/' + certificadoPath;
        else certificadoPath = '/uploads/' + certificadoPath;
      }

      const certLinkHtml = certificadoPath ? `<div style="margin-top:6px;"><a href="${escapeHtml(certificadoPath)}" target="_blank" rel="noopener noreferrer">Ver certificado actual</a></div>` : '';
      const fileInputHtml = `<div style="margin-top:6px;"><label style="font-size:0.9em;">Reemplazar certificado (PDF)</label><input type="file" accept="application/pdf" class="org-cert" data-org="${escapeHtml(oid)}" /></div>`;

      return `
        <div class="org-item" data-org-id="${escapeHtml(oid)}" data-nit="${nitVal}" style="padding:6px; border-bottom:1px solid #f0f0f0;">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="org-select" name="organizaciones[]" value="${escapeHtml(oid)}" ${checked ? 'checked' : ''} />
                <strong>${name}</strong>
                ${nitVal ? `<small style="margin-left:8px; color:#666;">NIT: ${nitVal}</small>` : ''}
                <small style="margin-left:8px; color:#666;">— ${sector}</small>
              </div>

              <div style="margin-top:6px;">
                <label style="margin-right:8px;">
                  <input type="checkbox" class="org-rep" data-org="${escapeHtml(oid)}" ${rep ? 'checked' : ''} /> Representante legal
                </label>
                <input class="input org-encargado" data-org="${escapeHtml(oid)}" placeholder="Nombre encargado" value="${escapeHtml(participanteVal)}" style="${rep ? 'display:none;' : ''}; width:60%; margin-top:6px;" />
              </div>

              <div style="margin-top:6px; display:${checked ? '' : 'none'};" data-cert-block="${escapeHtml(oid)}">
                ${certLinkHtml}
                ${fileInputHtml}
                <div style="margin-top:6px;">
                  <label><input type="checkbox" class="cert-delete" data-org="${escapeHtml(oid)}" /> Borrar certificado anterior</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="muted">No hay organizaciones registradas</div>';

    // PARTICIPANTS: preselect based on evento.avales or evento.participantes (robusto)
    let participants = [];
    if (Array.isArray(evento.avales) && evento.avales.length) {
      participants = evento.avales.map(a => String(a.idUsuario ?? a.userId ?? a.id ?? a.usuarioId ?? a));
    } else if (Array.isArray(evento.participantes) && evento.participantes.length) {
      participants = evento.participantes.map(p => String(p.idUsuario ?? p.id ?? p));
    }

    const usersList = Array.isArray(getState().users) ? getState().users : [];
    participantsListEl.innerHTML = buildParticipantsListHtml(usersList, participants, evento.idUsuario);

    // AVAL block population
    const avalWrap = document.getElementById('avalExistingWrap');
    const avalDeleteWrap = document.getElementById('avalDeleteWrap');
    const avalFileWrap = document.getElementById('avalFileWrap');
    const avalFileInput = document.getElementById('avalFileInput');

    const prevHidden = form.querySelector('input[name="delete_aval"]');
    if (prevHidden) prevHidden.remove();

    let avalPath = null;
    if (evento.avalPdf) avalPath = evento.avalPdf;
    else {
      try {
        const evAv = await fetch(`/api/aval/event/${id}`);
        if (evAv.ok) {
          const list = await evAv.json();
          if (Array.isArray(list) && list.length > 0) avalPath = list[0].avalPdf;
        }
      } catch (e) { /* noop */ }
    }

    if (avalPath && !avalPath.startsWith('/')) {
      if (avalPath.startsWith('uploads/')) avalPath = '/' + avalPath;
      else avalPath = '/uploads/' + avalPath;
    }

    if (avalWrap) {
      avalWrap.innerHTML = avalPath ? `<div>Aval actual: <a href="${escapeHtml(avalPath)}" target="_blank" rel="noopener noreferrer">Ver aval</a></div>` : `<div class="muted">No hay aval registrado</div>`;
    }

    if (avalDeleteWrap && avalFileWrap) {
      if (avalPath) {
        avalDeleteWrap.innerHTML = `<label><input type="checkbox" class="aval-delete" /> Borrar aval anterior para poder subir uno nuevo</label>`;
        avalFileWrap.style.display = 'none';
      } else {
        avalDeleteWrap.innerHTML = '';
        avalFileWrap.style.display = '';
      }
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'delete_aval';
      hidden.value = '0';
      form.appendChild(hidden);
    }

    if (avalFileInput) avalFileInput.value = '';

    modal.classList.add('open');
    setTimeout(() => form.querySelector('[name="nombre"]')?.focus(), 100);
  } catch (err) {
    console.error('Error cargando evento (edit modal):', err);
    toast('Error al cargar evento', 'error');
  }
}

/* ---------- submit edited event ---------- */

async function submitEditedEvent(form) {
  const submitBtn = document.getElementById('evtEditSubmitBtn');
  if (_isSubmittingEdit) { toast('Enviando... espera', 'info'); return; }
  _isSubmittingEdit = true;
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

    // client-side capacity validation
    const capacidadRaw = fd.get('capacidad');
    const capacidadNum = capacidadRaw ? Number(capacidadRaw) : null;
    if (!Number.isFinite(capacidadNum) || capacidadNum <= 0) { toast('Capacidad debe ser número > 0', 'error'); throw new Error('validation'); }
    const selectedSet = new Set((instalacionesIds || []).map(String));
    const totalInstCap = (Array.isArray(getState().installations) ? getState().installations : []).filter(i => selectedSet.has(String(i.idInstalacion || i.id))).reduce((s,i) => s + Number(i.capacidad || 0), 0);
    if (capacidadNum > totalInstCap) { toast(`Capacidad (${capacidadNum}) excede la suma de capacidades (${totalInstCap})`, 'error'); throw new Error('validation'); }

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

    // PARTICIPANTS: recoger organizadores adicionales seleccionados (excluir creador)
    const selectedParticipants = Array.from(form.querySelectorAll('#editParticipantsList input.participant-checkbox:checked'))
      .map(cb => Number(cb.value))
      .filter(Boolean);

    // construir FormData para PUT
    const sendForm = new FormData();
    const payloadEvento = {
      idUsuario: fd.get('idUsuario') || getCurrentUser()?.id,
      instalaciones: instalacionesIds.map(id => Number(id)),
      nombre,
      tipo,
      fecha,
      hora,
      horaFin,
      descripcion: fd.get('descripcion') || '',
      capacidad: capacidadNum
    };
    sendForm.append('evento', JSON.stringify(payloadEvento));
    sendForm.append('organizaciones', JSON.stringify(organizacionesPayload));
    sendForm.append('instalaciones', JSON.stringify(payloadEvento.instalaciones));

    // adjuntar avales (organizadores adicionales)
    if (Array.isArray(selectedParticipants) && selectedParticipants.length > 0) {
      const avalesPayload = selectedParticipants.map(id => ({ userId: Number(id) }));
      sendForm.append('avales', JSON.stringify(avalesPayload));
    } else {
      sendForm.append('avales', JSON.stringify([]));
    }

    const deleteAvalVal = fd.get('delete_aval') || '0';
    if (deleteAvalVal === '1') sendForm.append('delete_aval', '1');

    const tipoAvalSelect = form.querySelector('#tipoAvalSelect');
    const tipoAvalValue = tipoAvalSelect ? (tipoAvalSelect.value || '') : '';
    if (tipoAvalValue) sendForm.append('tipoAval', tipoAvalValue);

    const avalFileInputNode = form.querySelector('#avalFileInput');
    const avalFile = avalFileInputNode?.files?.[0];
    if (avalFile) {
      if (avalFile.type !== 'application/pdf') { toast('Aval debe ser PDF', 'error'); throw new Error('validation'); }
      if (!tipoAvalValue) { toast('Seleccione el tipo de aval antes de subir el archivo', 'error'); throw new Error('validation'); }
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
    if (modal) modal.classList.remove('open');
  } catch (err) {
    if (err.message !== 'validation') console.error('submitEditedEvent error:', err);
    toast(err.message || 'Error actualizando evento', 'error');
  } finally {
    _isSubmittingEdit = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}
