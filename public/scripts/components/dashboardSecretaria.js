import { getState, setState } from '../utils/state.js';
import { getCurrentUser } from '../auth.js';
import { qs, toast, formatDate } from '../utils/helpers.js';

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Dashboard específico para secretarias académicas
 * Permite revisar, aprobar y rechazar eventos
 */
export function renderDashboardSecretaria() {
  const st = getState();
  const user = getCurrentUser();
  const eventos = Array.isArray(st.events) ? st.events : [];
  
  // Filtrar solo eventos en estado 'registrado' (pendientes de evaluación)
  const eventosPendientes = eventos.filter(e => e.estado === 'enRevision');
  
  // Estadísticas para el dashboard
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
    const organizador = evento.organizadorNombre || 'N/A';
    const instalaciones = Array.isArray(evento.instalaciones) ? 
      evento.instalaciones.map(inst => inst.nombre || inst).join(', ') : 'N/A';

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
                <option value="registrado">Pendientes</option>
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
            
            <div id="evaluateEventInfo" class="mb-16">
              <!-- Info del evento se carga dinámicamente -->
            </div>

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

  // Limpiar filtros
  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'clearFilters') {
      document.getElementById('searchEvents').value = '';
      document.getElementById('filterTipo').value = '';
      document.getElementById('filterEstado').value = 'registrado';
      filterEvents();
      return;
    }

    // Actualizar eventos
    if (e.target?.id === 'refreshEvents') {
      await loadEventosForSecretaria();
      return;
    }

    // Revisar evento
    if (e.target?.classList.contains('review-event')) {
      const eventId = e.target.getAttribute('data-id');
      await openReviewModal(eventId);
      return;
    }

    // Aprobar evento
    if (e.target?.classList.contains('approve-event')) {
      const eventId = e.target.getAttribute('data-id');
      openEvaluateModal(eventId, 'aprobado');
      return;
    }

    // Rechazar evento
    if (e.target?.classList.contains('reject-event')) {
      const eventId = e.target.getAttribute('data-id');
      openEvaluateModal(eventId, 'rechazado');
      return;
    }

    // Cerrar modales
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
        if (actaInput) {
          actaInput.required = isApproval;
        }
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
    
    // Obtener datos del evento para filtros
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
      
      // Re-renderizar SOLO la tabla según el filtro actual
      const tbody = document.querySelector('#eventosTable tbody');
      if (tbody) {
        const estadoFilter = document.getElementById('filterEstado')?.value || 'registrado';
        const eventosFiltrados = estadoFilter 
          ? eventos.filter(e => e.estado === estadoFilter) 
          : eventos.filter(e => e.estado === 'registrado');
        
        if (eventosFiltrados.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center muted">No hay eventos con este estado</td></tr>';
        } else {
          tbody.innerHTML = eventosFiltrados.map(evento => {
            const id = evento.idEvento || evento.id || '';
            const nombre = evento.nombre || '';
            const tipo = evento.tipo || '';
            const fecha = evento.fecha || '';
            const hora = evento.hora || '';
            const organizador = evento.organizadorNombre || 'N/A';
            const instalaciones = Array.isArray(evento.instalaciones) ? 
              evento.instalaciones.map(inst => inst.nombre || inst).join(', ') : 'N/A';

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
        
        // ✅ Aplicar filtros después de recargar
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
    
    const response = await fetch(`/api/events/${eventId}`);
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
    
    // Procesar instalaciones
    let instalacionesHTML = 'No especificadas';
    if (evento.instalaciones && Array.isArray(evento.instalaciones) && evento.instalaciones.length > 0) {
      instalacionesHTML = evento.instalaciones.map(inst => 
        `<span class="badge secondary">${escapeHtml(inst.nombre || inst)}</span>`
      ).join(' ');
    } else if (evento.instalacionesNombres) {
      instalacionesHTML = evento.instalacionesNombres.split(',').map(nombre =>
        `<span class="badge secondary">${escapeHtml(nombre.trim())}</span>`
      ).join(' ');
    }
    
    // Formatear nombre del organizador
    const organizadorNombre = evento.organizadorNombre || 
      (evento.organizadorApellidos ? 
        `${evento.organizadorNombre || ''} ${evento.organizadorApellidos || ''}`.trim() : 
        'N/A');
    
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
              <p>${escapeHtml(evento.hora || 'N/A')}</p>
            </div>
            <div class="info-group">
              <label>Hora fin:</label>
              <p>${escapeHtml(evento.horaFin || 'N/A')}</p>
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
              <p><a href="mailto:${escapeHtml(evento.organizadorEmail || '')}">${escapeHtml(evento.organizadorEmail || 'N/A')}</a></p>
            </div>
            <div class="info-group">
              <label>Teléfono:</label>
              <p><a href="tel:${escapeHtml(evento.organizadorTelefono || '')}">${escapeHtml(evento.organizadorTelefono || 'N/A')}</a></p>
            </div>
          </div>
        </div>
        
        <div class="mt-16">
          <h3>📍 Ubicación e Instalaciones</h3>
          <div class="info-group">
            <label>Ubicación:</label>
            <p>${escapeHtml(evento.ubicacion || 'No especificada')}</p>
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
        
        ${evento.organizaciones && evento.organizaciones.length ? `
          <div class="mt-16">
            <h3>🏢 Organizaciones Participantes</h3>
            <div class="organizaciones-list">
              ${evento.organizaciones.map(org => `
                <div class="org-item">
                  <strong>${escapeHtml(org.nombre)}</strong>
                  <div class="muted">
                    ${org.participante ? `Participante: ${escapeHtml(org.participante)}` : 'Representante legal'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="mt-16">
          <h3>📎 Documentos Adjuntos</h3>
          ${evento.avalPdf ? `
            <div class="documento-item">
              <div>
                <strong>📄 Aval de Aprobación</strong>
                <div class="muted">Tipo: ${escapeHtml(evento.tipoAval === 'director_programa' ? 'Director de Programa' : evento.tipoAval === 'director_docencia' ? 'Director de Docencia' : evento.tipoAval || 'N/A')}</div>
              </div>
              <a href="${escapeHtml(evento.avalPdf)}" target="_blank" class="btn small primary">
                📥 Ver PDF
              </a>
            </div>
          ` : `
            <div class="info-group">
              <p class="muted">⚠️ No hay aval adjunto</p>
            </div>
          `}
          
          ${evento.certificadoParticipacion ? `
            <div class="documento-item">
              <div>
                <strong>📜 Certificado de Participación</strong>
              </div>
              <a href="${escapeHtml(evento.certificadoParticipacion)}" target="_blank" class="btn small secondary">
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
  
  // Configurar modal según la acción
  if (action === 'aprobado') {
    title.textContent = '✅ Aprobar Evento';
    submitBtn.textContent = 'Aprobar Evento';
    submitBtn.className = 'btn success';
    actaGroup.style.display = 'block';
    if (actaInput) actaInput.required = true;
  } else {
    title.textContent = '❌ Rechazar Evento';
    submitBtn.textContent = 'Rechazar Evento';
    submitBtn.className = 'btn danger';
    actaGroup.style.display = 'none';
    if (actaInput) actaInput.required = false;
  }
  
  actionInput.value = action;
  eventIdInput.value = eventId;
  
  eventInfo.innerHTML = `
    <div class="evento-info">
      <h4>${escapeHtml(evento.nombre)}</h4>
      <div class="muted">
        ${escapeHtml(evento.tipo)} • ${escapeHtml(evento.fecha)} • ${escapeHtml(evento.hora)}
      </div>
    </div>
  `;
  
  // Limpiar formulario
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
    
    // Validar acta si es aprobación
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
    
    // Agregar idSecretaria del usuario actual
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
      
      // ✅ NUEVO: Cerrar modal primero
      document.getElementById('evaluateModal').classList.remove('open');
      
      // ✅ NUEVO: Mostrar toast
      toast(mensaje, 'success');
      
      // ✅ NUEVO: Recargar eventos automáticamente
      console.log('🔄 Recargando eventos después de evaluación...');
      await loadEventosForSecretaria();
      
      // ✅ NUEVO: Actualizar estadísticas en tiempo real
      const st = getState();
      const eventos = Array.isArray(st.events) ? st.events : [];
      const pendientes = eventos.filter(e => e.estado === 'registrado').length;
      const aprobados = eventos.filter(e => e.estado === 'aprobado').length;
      const rechazados = eventos.filter(e => e.estado === 'rechazado').length;
      
      // ✅ Actualizar contadores en las cards de estadísticas
      const statsCards = document.querySelectorAll('.secretaria-dashboard .stat .kpi');
      if (statsCards.length === 4) {
        statsCards[0].textContent = eventos.length; // Total
        statsCards[1].textContent = pendientes;     // Pendientes
        statsCards[2].textContent = aprobados;      // Aprobados
        statsCards[3].textContent = rechazados;     // Rechazados
      }
      
      console.log('✅ Vista actualizada automáticamente');
      console.log('📊 Estadísticas:', { total: eventos.length, pendientes, aprobados, rechazados });
      
    } else {
      const error = await response.json();
      toast(error.error || error.message || 'Error al evaluar evento', 'error');
    }
  } catch (error) {
    console.error('❌ Error submitting evaluation:', error);
    toast('Error al evaluar evento', 'error');
  } finally {
    const submitBtn = document.getElementById('submitEvaluate');
    submitBtn.disabled = false;
    const action = document.getElementById('evaluateAction').value;
    submitBtn.textContent = action === 'aprobado' ? 'Aprobar Evento' : 'Rechazar Evento';
  }
}