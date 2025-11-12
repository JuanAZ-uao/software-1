/**
 * calendar.js - Componente de Calendario
 *
 * Este componente renderiza la vista de calendario principal y el mini calendario del dashboard.
 * Permite navegar entre meses y resalta los días con eventos.
 * Utiliza el estado global para obtener los eventos y muestra la cuadrícula mensual.
 * Permite ver detalles del evento cuando se hace clic en un día con eventos.
 */

import { getState } from '../utils/state.js';
import { navigateTo } from '../utils/router.js';

/**
 * Renderiza la vista principal del calendario con controles de mes.
 * @returns {string} HTML del calendario
 */
export function renderCalendar(){
  return `
    <div class="calendar-container">
      <div class="card">
        <div class="card-head">
          <div><strong>Calendario de Eventos</strong></div>
          <div class="flex gap-8">
            <button class="btn small" id="cal-prev">◀ Anterior</button>
            <div id="cal-title" style="min-width:180px; text-align:center; font-weight:600;"></div>
            <button class="btn small" id="cal-next">Siguiente ▶</button>
          </div>
        </div>
        <div class="card-body">
          <div class="calendar" id="calendar"></div>
        </div>
      </div>
      
      <!-- Modal para mostrar eventos del día -->
      <div id="dayEventsModal" class="modal" style="display:none;">
        <div class="sheet" style="max-width:600px;">
          <div class="head">
            <strong id="modalDayTitle">Eventos del día</strong>
            <button class="btn small" id="closeDayEventsModal">✕</button>
          </div>
          <div class="body">
            <div id="dayEventsList"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Construye un arreglo de fechas para el mes mostrado en el calendario.
 * @param {number} year
 * @param {number} month
 * @returns {Date[]}
 */
function buildMonth(year, month){
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay()+6)%7)); // Lunes como inicio
  const days = [];
  for (let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i); days.push(d);
  }
  return days;
}

/**
 * Obtiene eventos para una fecha específica
 */
function getEventsForDate(events, dateStr) {
  return events.filter(e => {
    const eDate = e.fecha || e.date;
    return eDate === dateStr;
  });
}

/**
 * Renderiza la cuadrícula del mes en el contenedor dado.
 * @param {HTMLElement} container
 * @param {number} y Año
 * @param {number} m Mes
 */
function renderMonth(container, y, m){
  const { events } = getState();
  const days = buildMonth(y,m);
  const monthName = new Date(y,m,1).toLocaleString('es-CO',{month:'long', year:'numeric'});
  
  const dayElements = days.map(d=>{
    const iso = d.toISOString().slice(0,10);
    const dayEvents = getEventsForDate(events, iso);
    const hasEvents = dayEvents.length > 0;
    const dayNum = d.getDate();
    const isCurrentMonth = d.getMonth() === m;
    
    return `
      <div class="day ${hasEvents?'has-events':''} ${!isCurrentMonth?'other-month':''}" 
           data-date="${iso}" 
           title="${hasEvents ? dayEvents.length + ' evento(s)' : ''}">
        <div class="day-number">${dayNum}</div>
        ${hasEvents ? `<div class="event-badge">${dayEvents.length}</div>` : ''}
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="cal-head" style="margin-bottom:20px;">
      <div><strong>${monthName}</strong></div>
    </div>
    <div class="cal-grid">
      ${['L','M','X','J','V','S','D'].map(d=>`<div class="day-header">${d}</div>`).join('')}
      ${dayElements}
    </div>`;
}

/**
 * Abre el modal con eventos del día seleccionado
 */
function openDayEventsModal(dateStr) {
  const { events } = getState();
  const dayEvents = getEventsForDate(events, dateStr);
  const date = new Date(dateStr);
  const dayName = date.toLocaleString('es-CO', {weekday: 'long', month: 'long', day: 'numeric'});
  
  const modal = document.getElementById('dayEventsModal');
  const title = document.getElementById('modalDayTitle');
  const list = document.getElementById('dayEventsList');
  
  title.textContent = `Eventos del ${dayName}`;
  
  if (dayEvents.length === 0) {
    list.innerHTML = '<div class="muted" style="padding:20px; text-align:center;">No hay eventos para este día</div>';
  } else {
    list.innerHTML = dayEvents.map(ev => `
      <div class="event-item-modal" style="padding:16px; border:1px solid var(--border); border-radius:8px; margin-bottom:12px; cursor:pointer;" data-event-id="${ev.idEvento || ev.id}">
        <div style="display:flex; justify-content:space-between; align-items:start; gap:12px;">
          <div style="flex:1;">
            <strong style="font-size:1.05rem;">${escapeHtml(ev.nombre || 'Sin nombre')}</strong>
            <div style="margin-top:8px; color:var(--muted-foreground); font-size:0.95rem;">
              <div>📍 ${escapeHtml(ev.ubicacion || 'Sin ubicación')}</div>
              <div>🕐 ${escapeHtml(ev.hora || '')} - ${escapeHtml(ev.horaFin || '')}</div>
              <div>📁 ${escapeHtml(ev.tipo || 'N/A')}</div>
            </div>
          </div>
          <div style="flex-shrink:0;">
            <span class="badge" style="background:${ev.estado === 'aprobado' ? '#10b981' : ev.estado === 'rechazado' ? '#ef4444' : '#f59e0b'}; color:white; padding:6px 12px; border-radius:4px; font-size:0.85rem;">
              ${escapeHtml(ev.estado || 'registrado')}
            </span>
          </div>
        </div>
        ${ev.descripcion ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); color:var(--muted-foreground); font-size:0.9rem;">${escapeHtml(ev.descripcion)}</div>` : ''}
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button class="btn small primary view-event-btn" data-event-id="${ev.idEvento || ev.id}">Ver detalles</button>
        </div>
      </div>
    `).join('');
  }
  
  modal.style.display = 'flex';
}

/**
 * Escapa HTML para evitar XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listeners para navegación de mes en el calendario
document.addEventListener('click', (e) => {
  // Cerrar modal
  if (e.target?.id === 'closeDayEventsModal') {
    const modal = document.getElementById('dayEventsModal');
    if (modal) modal.style.display = 'none';
    return;
  }
  
  // Ver detalles de evento
  if (e.target?.closest('.view-event-btn')) {
    const eventId = e.target.closest('.view-event-btn').getAttribute('data-event-id');
    document.getElementById('dayEventsModal').style.display = 'none';
    navigateTo('events');
  }
  
  // Hacer clic en un día con eventos
  if (e.target?.closest('.day.has-events')) {
    const dateStr = e.target.closest('.day').getAttribute('data-date');
    openDayEventsModal(dateStr);
    return;
  }
  
  // Navegación de meses
  if (e.target?.id === 'cal-prev' || e.target?.id === 'cal-next'){
    const title = document.getElementById('cal-title');
    const cal = document.getElementById('calendar');
    if (!title || !cal) return;
    const cur = new Date(title.dataset.y, title.dataset.m, 1);
    const next = new Date(cur);
    next.setMonth(cur.getMonth() + (e.target.id==='cal-next'?1:-1));
    title.dataset.y = next.getFullYear();
    title.dataset.m = next.getMonth();
    renderMonth(cal, next.getFullYear(), next.getMonth());
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const title = document.getElementById('cal-title');
  const cal = document.getElementById('calendar');
  if (title && cal){
    const n = new Date();
    title.dataset.y = n.getFullYear();
    title.dataset.m = n.getMonth();
    renderMonth(cal, n.getFullYear(), n.getMonth());
  }
  
  // Listener para cerrar modal al hacer clic fuera
  const modal = document.getElementById('dayEventsModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
});
