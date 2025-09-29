/**
 * calendar.js - Componente de Calendario
 *
 * Este componente renderiza la vista de calendario principal y el mini calendario del dashboard.
 * Permite navegar entre meses y resalta los días con eventos.
 * Utiliza el estado global para obtener los eventos y muestra la cuadrícula mensual.
 */

import { getState } from '../utils/state.js';

/**
 * Renderiza la vista principal del calendario con controles de mes.
 * @returns {string} HTML del calendario
 */
export function renderCalendar(){
  return `
    <div class="card">
      <div class="card-head">
        <div><strong>Calendario</strong></div>
        <div class="flex gap-8">
          <button class="btn small" id="cal-prev">◀</button>
          <div id="cal-title"></div>
          <button class="btn small" id="cal-next">▶</button>
        </div>
      </div>
      <div class="card-body">
        <div class="calendar" id="calendar"></div>
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
 * Renderiza la cuadrícula del mes en el contenedor dado.
 * @param {HTMLElement} container
 * @param {number} y Año
 * @param {number} m Mes
 */
function renderMonth(container, y, m){
  const { events } = getState();
  const days = buildMonth(y,m);
  container.innerHTML = `
    <div class="cal-head"><div><strong>${new Date(y,m,1).toLocaleString('es-CO',{month:'long', year:'numeric'})}</strong></div></div>
    <div class="grid" style="grid-template-columns:repeat(7,1fr); gap:6px;">
      ${['L','M','X','J','V','S','D'].map(d=>`<div class="muted" style="text-align:center">${d}</div>`).join('')}
      ${days.map(d=>{
        const iso = d.toISOString().slice(0,10);
        const has = events.some(e=>e.date===iso);
        return `<div class="day ${has?'has':''}" title="${iso}">${d.getDate()}</div>`;
      }).join('')}
    </div>`;
}

// Listeners para navegación de mes en el calendario
// (Se conectan a los botones prev/next)
document.addEventListener('click', (e) => {
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
});
