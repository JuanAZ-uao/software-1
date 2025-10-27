// dashboardSecretaria.js
import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { qs, toast, formatDate } from '../utils/helpers.js';

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Render del dashboard de secretaria
 */
export function renderDashboardSecretaria() {
  const st = getState();
  const user = getCurrentUser();
  const eventos = Array.isArray(st.events) ? st.events : [];

  // Pendientes en obra: usamos 'enRevision' como estado de revisión
  const eventosPendientes = eventos.filter(e => e.estado === 'enRevision');

  const totalEventos = eventos.length;
  const pendientes = eventosPendientes.length;
  const aprobados = eventos.filter(e => e.estado === 'aprobado').length;
  const rechazados = eventos.filter(e => e.estado === 'rechazado').length;

  const statCard = (label, value, colorClass = '') => `
    <div class="card stat ${colorClass}">
      <div class="card-body">
        <div class="muted">${label}</div>
        <div class="kpi">${value}</div>
      </div>
    </div>`;

  const eventosTable = eventosPendientes.length ? eventosPendientes.map(evento => {
    const id = evento.idEvento || evento.id || '';
    const nombre = evento.nombre || '';
    const tipo = evento.tipo || '';
    const fecha = evento.fecha || '';
    const hora = evento.hora || '';
    // soporta objeto organizador o campos planos
    const organizador = (evento.organizador && (evento.organizador.nombre || evento.organizador.email))
      ? `${evento.organizador.nombre || ''} ${evento.organizador.apellidos || ''}`.trim()
      : (evento.organizadorNombre ? `${evento.organizadorNombre}${evento.organizadorApellidos ? ' ' + evento.organizadorApellidos : ''}`.trim() : 'N/A');
    const instalaciones = Array.isArray(evento.instalaciones)
      ? evento.instalaciones.map(inst => (typeof inst === 'object' ? (inst.nombre || inst.label || String(inst.id || '')) : String(inst))).join(', ')
      : (evento.instalacionesNombres || 'N/A');

    return `
      <tr data-evento-id="${escapeHtml(id)}" data-estado="${escapeHtml(evento.estado || '')}">
        <td>
          <strong>${escapeHtml(nombre)}</strong>
          <div class="muted">${escapeHtml(organizador)}</div>
        </td>
        <td>
          <span class="badge ${tipo === 'academico' ? 'primary' : 'secondary'}">${escapeHtml(tipo)}</span>
        </td>
        <td>
          ${escapeHtml(fecha)}<br>
          <small class="muted">${escapeHtml(hora)}</small>
        </td>
        <td>
          <small>${escapeHtml(instalaciones)}</small>
        </td>
        <td>
          <div class="btn-group">
            <button class="btn small success review-event" data-action="review" data-id="${escapeHtml(id)}">
              👁️ Revisar
            </button>
            <button class="btn small primary approve-event" data-action="approve" data-id="${escapeHtml(id)}">
              ✅ Aprobar
            </button>
            <button class="btn small danger reject-event" data-action="reject" data-id="${escapeHtml(id)}">
              ❌ Rechazar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="5" class="text-center muted">No hay eventos pendientes de evaluación</td></tr>';

  return `
    <div class="secretaria-dashboard">
      <!-- Estadísticas -->
      <section class="grid mb-24">
        <div class="col-3 col-12">${statCard('Total Eventos', totalEventos, 'info')}</div>
        <div class="col-3 col-12">${statCard('Pendientes', pendientes, 'warning')}</div>
        <div class="col-3 col-12">${statCard('Aprobados', aprobados, 'success')}</div>
        <div class="col-3 col-12">${statCard('Rechazados', rechazados, 'danger')}</div>
      </section>

      <!-- Filtros y búsqueda -->
      <div class="card mb-16">
        <div class="card-head">
          <strong>🔍 Gestión de Eventos</strong>
        </div>
        <div class="card-body">
          <div class="flex gap-12 mb-16">
            <div style="flex: 1;">
              <input 
                type="text" 
                id="searchEvents" 
                class="input" 
                placeholder="Buscar por nombre del evento o organizador..."
              >
            </div>
            <div>
              <select id="filterTipo" class="select">
                <option value="">Todos los tipos</option>
                <option value="academico">Académico</option>
                <option value="ludico">Lúdico</option>
              </select>
            </div>
            <div>
              <select id="filterEstado" class="select">
                <option value="enRevision">Pendientes</option>
                <option value="aprobado">Aprobados</option>
                <option value="rechazado">Rechazados</option>
                <option value="">Todos los estados</option>
              </select>
            </div>
            <button id="clearFilters" class="btn secondary">🗑️ Limpiar</button>
          </div>
        </div>
      </div>

      <!-- Tabla de eventos -->
      <div class="card">
        <div class="card-head">
          <strong>📋 Eventos para Evaluación</strong>
          <div class="flex gap-8">
            <button id="refreshEvents" class="btn small secondary">🔄 Actualizar</button>
          </div>
        </div>
        <div class="card-body">
          <div class="table-wrap">
            <table class="table" id="eventosTable">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Tipo</th>
                  <th>Fecha/Hora</th>
                  <th>Instalaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${eventosTable}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para revisar evento -->
    <div id="reviewModal" class="modal">
      <div class="sheet" style="max-width: 800px;">
        <div class="head">
          <strong>📋 Revisar Evento</strong>
          <button class="btn small" id="closeReviewModal">✕</button>
        </div>
        <div class="body" id="reviewModalContent">
          <!-- Contenido del evento se carga dinámicamente -->
        </div>
      </div>
    </div>

    <!-- Modal para aprobar/rechazar -->
    <div id="evaluateModal" class="modal">
      <div class="sheet" style="max-width: 600px;">
        <div class="head">
          <strong id="evaluateModalTitle">Evaluar Evento</strong>
          <button class="btn small" id="closeEvaluateModal">✕</button>
        </div>
        <div class="body">
          <form id="evaluateForm">
            <input type="hidden" id="evaluateEventId" name="idEvento">
            <input type="hidden" id="evaluateAction" name="estado">
            
            <div id="evaluateEventInfo" class="mb-16"></div>

            <div class="form-group">
              <label for="justificacion">Justificación *</label>
              <textarea 
                id="justificacion" 
                name="justificacion" 
                class="textarea" 
                required
                placeholder="Escribe la justificación para esta decisión..."
                rows="4"
              ></textarea>
            </div>

            <div class="form-group" id="actaGroup" style="display: none;">
              <label for="actaAprobacion">Acta de Aprobación (PDF) *</label>
              <input 
                type="file" 
                id="actaAprobacion" 
                name="actaAprobacion" 
                class="input" 
                accept="application/pdf"
              >
              <small class="muted">Requerido para aprobaciones</small>
            </div>

            <div class="flex gap-12 justify-end">
              <button type="button" id="cancelEvaluate" class="btn secondary">Cancelar</button>
              <button type="submit" id="submitEvaluate" class="btn primary">Confirmar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

/**
 * Bind de eventos específicos para el dashboard de secretaria
 */
export function bindDashboardSecretariaEvents() {
  // Búsqueda en tiempo real
  document.addEventListener('input', (e) => {
    if (e.target?.id === 'searchEvents') {
      filterEvents();
    }
  });

  // Filtros
  document.addEventListener('change', (e) => {
    if (e.target?.id === 'filterTipo' || e.target?.id === 'filterEstado') {
      filterEvents();
    }
  });

  // Clicks generales
  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'clearFilters') {
      document.getElementById('searchEvents').value = '';
      document.getElementById('filterTipo').value = '';
      document.getElementById('filterEstado').value = 'enRevision';
      filterEvents();
      return;
    }

    if (e.target?.id === 'refreshEvents') {
      await loadEventosForSecretaria();
      return;
    }

    if (e.target?.classList.contains('review-event')) {
      const eventId = e.target.getAttribute('data-id');
      await openReviewModal(eventId);
      return;
    }

    if (e.target?.classList.contains('approve-event')) {
      const eventId = e.target.getAttribute('data-id');
      openEvaluateModal(eventId, 'aprobado');
      return;
    }

    if (e.target?.classList.contains('reject-event')) {
      const eventId = e.target.getAttribute('data-id');
      openEvaluateModal(eventId, 'rechazado');
      return;
    }

    if (e.target?.id === 'closeReviewModal') {
      document.getElementById('reviewModal').classList.remove('open');
      return;
    }

    if (e.target?.id === 'closeEvaluateModal' || e.target?.id === 'cancelEvaluate') {
      document.getElementById('evaluateModal').classList.remove('open');
      return;
    }
  });

  // Submit del formulario de evaluación
  document.addEventListener('submit', async (e) => {
    if (e.target?.id === 'evaluateForm') {
      e.preventDefault();
      await submitEvaluation(e.target);
    }
  });

  // Mostrar/ocultar campo de acta según la acción
  document.addEventListener('change', (e) => {
    if (e.target?.id === 'evaluateAction') {
      const actaGroup = document.getElementById('actaGroup');
      const actaInput = document.getElementById('actaAprobacion');
      if (actaGroup) {
        const isApproval = e.target.value === 'aprobado';
        actaGroup.style.display = isApproval ? 'block' : 'none';
        if (actaInput) actaInput.required = isApproval;
      }
    }
  });
}

/**
 * Filtra los eventos en la tabla según búsqueda y filtros
 */
function filterEvents() {
  const search = document.getElementById('searchEvents')?.value.toLowerCase() || '';
  const tipoFilter = document.getElementById('filterTipo')?.value || '';
  const estadoFilter = document.getElementById('filterEstado')?.value || '';

  const rows = document.querySelectorAll('#eventosTable tbody tr');

  rows.forEach(row => {
    const texto = row.textContent.toLowerCase();
    const matchSearch = texto.includes(search);

    const eventId = row.getAttribute('data-evento-id');
    const st = getState();
    const evento = st.events?.find(e => String(e.idEvento || e.id) === String(eventId));

    const matchTipo = !tipoFilter || evento?.tipo === tipoFilter;
    const matchEstado = !estadoFilter || evento?.estado === estadoFilter;

    const shouldShow = matchSearch && matchTipo && matchEstado;
    row.style.display = shouldShow ? '' : 'none';
  });
}

/**
 * Carga eventos específicamente para secretarias
 */
async function loadEventosForSecretaria() {
  try {
    console.log('🔄 Recargando eventos...');

    const response = await fetch('/api/events/for-secretaria');
    if (response.ok) {
      const eventos = await response.json();
      console.log('✅ Eventos recargados:', eventos.length);

      const st = getState();
      setState({ ...st, events: eventos });

      const tbody = document.querySelector('#eventosTable tbody');
      if (tbody) {
        const estadoFilter = document.getElementById('filterEstado')?.value || 'enRevision';
        const eventosFiltrados = estadoFilter
          ? eventos.filter(e => e.estado === estadoFilter)
          : eventos.filter(e => e.estado === 'enRevision');

        if (eventosFiltrados.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center muted">No hay eventos con este estado</td></tr>';
        } else {
          tbody.innerHTML = eventosFiltrados.map(evento => {
            const id = evento.idEvento || evento.id || '';
            const nombre = evento.nombre || '';
            const tipo = evento.tipo || '';
            const fecha = evento.fecha || '';
            const hora = evento.hora || '';
            const organizador = (evento.organizador && (evento.organizador.nombre || evento.organizador.email))
              ? `${evento.organizador.nombre || ''} ${evento.organizador.apellidos || ''}`.trim()
              : (evento.organizadorNombre ? `${evento.organizadorNombre}${evento.organizadorApellidos ? ' ' + evento.organizadorApellidos : ''}`.trim() : 'N/A');
            const instalaciones = Array.isArray(evento.instalaciones)
              ? evento.instalaciones.map(inst => (typeof inst === 'object' ? (inst.nombre || inst.label || String(inst.id || '')) : String(inst))).join(', ')
              : (evento.instalacionesNombres || 'N/A');

            return `
              <tr data-evento-id="${escapeHtml(id)}" data-estado="${escapeHtml(evento.estado || '')}">
                <td>
                  <strong>${escapeHtml(nombre)}</strong>
                  <div class="muted">${escapeHtml(organizador)}</div>
                </td>
                <td>
                  <span class="badge ${tipo === 'academico' ? 'primary' : 'secondary'}">${escapeHtml(tipo)}</span>
                </td>
                <td>
                  ${escapeHtml(fecha)}<br>
                  <small class="muted">${escapeHtml(hora)}</small>
                </td>
                <td>
                  <small>${escapeHtml(instalaciones)}</small>
                </td>
                <td>
                  <div class="btn-group">
                    <button class="btn small success review-event" data-action="review" data-id="${escapeHtml(id)}">
                      👁️ Revisar
                    </button>
                    <button class="btn small primary approve-event" data-action="approve" data-id="${escapeHtml(id)}">
                      ✅ Aprobar
                    </button>
                    <button class="btn small danger reject-event" data-action="reject" data-id="${escapeHtml(id)}">
                      ❌ Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }

        filterEvents();
      }

      console.log('✅ Tabla actualizada');
      toast('Eventos actualizados', 'success');
    } else {
      console.error('❌ Error al cargar eventos:', response.status);
      toast('Error al actualizar eventos', 'error');
    }
  } catch (error) {
    console.error('❌ Error loading events:', error);
    toast('Error al cargar eventos', 'error');
  }
}

/**
 * Abre el modal para revisar un evento
 */
async function openReviewModal(eventId) {
  try {
    console.log('🔍 Cargando evento:', eventId);

    // intentar endpoint detallado y fallback al básico
    let response = await fetch(`/api/events/${eventId}/details`);
    if (!response.ok) {
      console.warn(`/details no disponible (${response.status}), intentando /api/events/${eventId}`);
      response = await fetch(`/api/events/${eventId}`);
    }

    if (!response.ok) {
      console.error('❌ Error en respuesta:', response.status);
      toast('Error al cargar evento', 'error');
      return;
    }

    const evento = await response.json();
    console.log('✅ Evento cargado completo:', evento);

    const modal = document.getElementById('reviewModal');
    const content = document.getElementById('reviewModalContent');

    if (!modal || !content) {
      console.error('❌ Modal o contenido no encontrado');
      return;
    }

    // Procesar instalaciones (normaliza varios formatos)
    let instalacionesHTML = 'No especificadas';
    if (evento.instalaciones && Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      instalacionesHTML = evento.instalaciones.map(inst => {
        const name = (typeof inst === 'object') ? (inst.nombre || inst.label || inst.nombreInstalacion || inst.name) : inst;
        return `<span class="badge secondary">${escapeHtml(name || String(inst))}</span>`;
      }).join(' ');
    } else if (evento.instalacionesNombres) {
      instalacionesHTML = evento.instalacionesNombres.split(',').map(nombre =>
        `<span class="badge secondary">${escapeHtml(nombre.trim())}</span>`
      ).join(' ');
    } else if (evento.instalacionesIds && Array.isArray(evento.instalacionesIds) && evento.instalacionesIds.length) {
      instalacionesHTML = evento.instalacionesIds.map(id => `<span class="badge secondary">${escapeHtml(String(id))}</span>`).join(' ');
    }

    // Formatear nombre del organizador (soporta objeto o campos planos)
    let organizadorNombre = null;
    let organizadorEmail = '';
    let organizadorTelefono = '';

    if (evento.organizador && typeof evento.organizador === 'object') {
      organizadorNombre = evento.organizador.nombre || evento.organizadorNombre || null;
      organizadorEmail = evento.organizador.email || evento.organizadorEmail || '';
      organizadorTelefono = evento.organizador.telefono || evento.organizadorTelefono || '';
      if (!organizadorNombre && (evento.organizador.apellidos || evento.organizador.apellido)) {
        organizadorNombre = `${evento.organizador.nombre || ''} ${evento.organizador.apellidos || evento.organizador.apellido || ''}`.trim();
      }
    } else {
      const nombrePlano = evento.organizadorNombre || null;
      const apellidosPlano = evento.organizadorApellidos || null;
      if (nombrePlano || apellidosPlano) {
        organizadorNombre = `${nombrePlano || ''} ${apellidosPlano || ''}`.trim();
      } else if (evento.idUsuario && (evento.organizadorEmail || evento.organizadorTelefono || evento.organizador)) {
        organizadorNombre = evento.organizadorNombre || evento.organizador || 'N/A';
        organizadorEmail = evento.organizadorEmail || '';
        organizadorTelefono = evento.organizadorTelefono || '';
      } else {
        // último recurso: intentar leer desde evento.organizador.* si vino con otro shape
        organizadorNombre = evento.organizadorNombre || evento.organizador || 'N/A';
        organizadorEmail = evento.organizadorEmail || '';
        organizadorTelefono = evento.organizadorTelefono || '';
      }
    }

    if (!organizadorNombre) organizadorNombre = 'N/A';
    if (!organizadorEmail) organizadorEmail = '';
    if (!organizadorTelefono) organizadorTelefono = '';

    // Normalizar organizaciones (puede venir como array de organizacion u objetos con association)
    let organizacionesHTML = '';
    if (Array.isArray(evento.organizaciones) && evento.organizaciones.length) {
      const orgItems = evento.organizaciones.map(o => {
        // organización puede venir en o.organizacion o directamente o.nombre
        const orgData = o.organizacion || o;
        const nombreOrg = orgData?.nombre || orgData?.nombreOrganizacion || o.nombre || 'Organización';
        const participante = o.participante || o.nombreEncargado || o.encargado || orgData?.contacto || null;
        return `<div class="org-item"><strong>${escapeHtml(nombreOrg)}</strong><div class="muted">${participante ? 'Participante: ' + escapeHtml(participante) : 'Representante legal'}</div></div>`;
      });
      organizacionesHTML = `<div class="organizaciones-list">${orgItems.join('')}</div>`;
    }

    // Aval y certificados (acepta varios shapes)
    const avalPdf = evento.avalPdf || (evento.aval && (evento.aval.avalPdf || evento.aval.path)) || null;
    const tipoAval = evento.tipoAval || (evento.aval && (evento.aval.tipoAval || evento.aval.tipo)) || null;
    const certificadoParticipacion = evento.certificadoParticipacion || evento.certificado || null;

    // Inject HTML
    content.innerHTML = `
      <div class="evento-review">
        <div class="grid gap-16">
          <div class="col-6 col-12">
            <h3>📅 Información General</h3>
            <div class="info-group">
              <label>Nombre:</label>
              <p><strong>${escapeHtml(evento.nombre || 'N/A')}</strong></p>
            </div>
            <div class="info-group">
              <label>Tipo:</label>
              <p><span class="badge ${evento.tipo === 'academico' ? 'primary' : 'secondary'}">${escapeHtml(evento.tipo || 'N/A')}</span></p>
            </div>
            <div class="info-group">
              <label>Fecha:</label>
              <p>${escapeHtml(evento.fecha || 'N/A')}</p>
            </div>
            <div class="info-group">
              <label>Hora inicio:</label>
              <p>${escapeHtml(evento.hora || evento.horaInicio || 'N/A')}</p>
            </div>
            <div class="info-group">
              <label>Hora fin:</label>
              <p>${escapeHtml(evento.horaFin || evento.hora_fin || 'N/A')}</p>
            </div>
            <div class="info-group">
              <label>Capacidad:</label>
              <p>${evento.capacidad ? escapeHtml(String(evento.capacidad)) + ' personas' : 'No especificada'}</p>
            </div>
          </div>
          
          <div class="col-6 col-12">
            <h3>👤 Organizador</h3>
            <div class="info-group">
              <label>Nombre:</label>
              <p>${escapeHtml(organizadorNombre)}</p>
            </div>
            <div class="info-group">
              <label>Email:</label>
              <p><a href="mailto:${escapeHtml(organizadorEmail || '')}">${escapeHtml(organizadorEmail || 'N/A')}</a></p>
            </div>
            <div class="info-group">
              <label>Teléfono:</label>
              <p><a href="tel:${escapeHtml(organizadorTelefono || '')}">${escapeHtml(organizadorTelefono || 'N/A')}</a></p>
            </div>
          </div>
        </div>
        
        <div class="mt-16">
          <h3>📍 Ubicación e Instalaciones</h3>
          <div class="info-group">
            <label>Ubicación:</label>
            <p>${escapeHtml(evento.ubicacion || evento.lugar || 'No especificada')}</p>
          </div>
          <div class="info-group">
            <label>Instalaciones reservadas:</label>
            <div class="instalaciones-list">
              ${instalacionesHTML}
            </div>
          </div>
        </div>
        
        ${evento.descripcion ? `
          <div class="mt-16">
            <h3>📝 Descripción del Evento</h3>
            <div class="info-group">
              <p style="white-space: pre-wrap;">${escapeHtml(evento.descripcion)}</p>
            </div>
          </div>
        ` : ''}
        
        ${organizacionesHTML ? `
          <div class="mt-16">
            <h3>🏢 Organizaciones Participantes</h3>
            ${organizacionesHTML}
          </div>
        ` : ''}
        
        <div class="mt-16">
          <h3>📎 Documentos Adjuntos</h3>
          ${avalPdf ? `
            <div class="documento-item">
              <div>
                <strong>📄 Aval de Aprobación</strong>
                <div class="muted">Tipo: ${escapeHtml(tipoAval === 'director_programa' ? 'Director de Programa' : tipoAval === 'director_docencia' ? 'Director de Docencia' : tipoAval || 'N/A')}</div>
              </div>
              <a href="${escapeHtml(avalPdf)}" target="_blank" class="btn small primary">
                📥 Ver PDF
              </a>
            </div>
          ` : `
            <div class="info-group">
              <p class="muted">⚠️ No hay aval adjunto</p>
            </div>
          `}
          
          ${certificadoParticipacion ? `
            <div class="documento-item">
              <div>
                <strong>📜 Certificado de Participación</strong>
              </div>
              <a href="${escapeHtml(certificadoParticipacion)}" target="_blank" class="btn small secondary">
                📥 Ver PDF
              </a>
            </div>
          ` : ''}
        </div>
        
        <div class="mt-16" style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
          <small class="muted">
            <strong>Estado actual:</strong> 
            <span class="badge ${
              evento.estado === 'aprobado' ? 'success' : 
              evento.estado === 'rechazado' ? 'danger' : 
              'warning'
            }">
              ${escapeHtml(evento.estado || 'registrado')}
            </span>
          </small>
        </div>
      </div>
    `;

    modal.classList.add('open');
    console.log('✅ Modal abierto con todos los datos');

  } catch (error) {
    console.error('❌ Error completo:', error);
    toast('Error al cargar evento', 'error');
  }
}

/**
 * Abre el modal para evaluar un evento
 */
function openEvaluateModal(eventId, action) {
  const st = getState();
  const evento = st.events?.find(e => String(e.idEvento || e.id) === String(eventId));

  if (!evento) {
    toast('Evento no encontrado', 'error');
    return;
  }

  const modal = document.getElementById('evaluateModal');
  const title = document.getElementById('evaluateModalTitle');
  const eventInfo = document.getElementById('evaluateEventInfo');
  const actionInput = document.getElementById('evaluateAction');
  const eventIdInput = document.getElementById('evaluateEventId');
  const actaGroup = document.getElementById('actaGroup');
  const actaInput = document.getElementById('actaAprobacion');
  const submitBtn = document.getElementById('submitEvaluate');

  if (action === 'aprobado') {
    title.textContent = '✅ Aprobar Evento';
    submitBtn.textContent = 'Aprobar Evento';
    submitBtn.className = 'btn success';
    if (actaGroup) actaGroup.style.display = 'block';
    if (actaInput) actaInput.required = true;
  } else {
    title.textContent = '❌ Rechazar Evento';
    submitBtn.textContent = 'Rechazar Evento';
    submitBtn.className = 'btn danger';
    if (actaGroup) actaGroup.style.display = 'none';
    if (actaInput) actaInput.required = false;
  }

  actionInput.value = action;
  eventIdInput.value = eventId;

  eventInfo.innerHTML = `
    <div class="evento-info">
      <h4>${escapeHtml(evento.nombre || '')}</h4>
      <div class="muted">
        ${escapeHtml(evento.tipo || '')} • ${escapeHtml(evento.fecha || '')} • ${escapeHtml(evento.hora || '')}
      </div>
    </div>
  `;

  document.getElementById('justificacion').value = '';
  if (actaInput) actaInput.value = '';

  modal.classList.add('open');
}

/**
 * Envía la evaluación del evento
 */
async function submitEvaluation(form) {
  try {
    const submitBtn = document.getElementById('submitEvaluate');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';

    const formData = new FormData(form);
    const action = formData.get('estado');

    if (action === 'aprobado') {
      const actaFile = formData.get('actaAprobacion');
      if (!actaFile || actaFile.size === 0) {
        toast('Debe adjuntar el acta de aprobación (PDF)', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Aprobar Evento';
        return;
      }

      if (actaFile.type !== 'application/pdf') {
        toast('El acta debe ser un archivo PDF', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Aprobar Evento';
        return;
      }
    }

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id) {
      formData.append('idSecretaria', currentUser.id);
    }

    console.log('📤 Enviando evaluación:', {
      idEvento: formData.get('idEvento'),
      estado: action,
      justificacion: formData.get('justificacion'),
      tieneActa: formData.get('actaAprobacion')?.name || 'No'
    });

    const response = await fetch('/api/events/evaluate', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      const mensaje = action === 'aprobado' ? 'Evento aprobado exitosamente' : 'Evento rechazado';

      document.getElementById('evaluateModal').classList.remove('open');
      toast(mensaje, 'success');

      console.log('🔄 Recargando eventos después de evaluación...');
      await loadEventosForSecretaria();

      const st = getState();
      const eventos = Array.isArray(st.events) ? st.events : [];
      const pendientes = eventos.filter(e => e.estado === 'enRevision').length;
      const aprobados = eventos.filter(e => e.estado === 'aprobado').length;
      const rechazados = eventos.filter(e => e.estado === 'rechazado').length;

      const statsCards = document.querySelectorAll('.secretaria-dashboard .stat .kpi');
      if (statsCards.length === 4) {
        statsCards[0].textContent = eventos.length;
        statsCards[1].textContent = pendientes;
        statsCards[2].textContent = aprobados;
        statsCards[3].textContent = rechazados;
      }

      console.log('✅ Vista actualizada automáticamente');
      console.log('📊 Estadísticas:', { total: eventos.length, pendientes, aprobados, rechazados });

    } else {
      const error = await response.json().catch(() => ({}));
      toast(error.error || error.message || 'Error al evaluar evento', 'error');
    }
  } catch (error) {
    console.error('❌ Error submitting evaluation:', error);
    toast('Error al evaluar evento', 'error');
  } finally {
    const submitBtn = document.getElementById('submitEvaluate');
    if (submitBtn) {
      submitBtn.disabled = false;
      const action = document.getElementById('evaluateAction')?.value;
      submitBtn.textContent = action === 'aprobado' ? 'Aprobar Evento' : 'Rechazar Evento';
    }
  }
}

// Export helpers for other modules if needed
export {
  loadEventosForSecretaria,
  openReviewModal,
  openEvaluateModal,
  submitEvaluation,
  filterEvents
};
