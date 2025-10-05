/**
 * dashboard.js - Componente de Dashboard principal
 *
 * Este componente renderiza la vista principal del panel de usuario,
 * mostrando estadísticas, accesos rápidos y eventos recientes.
 * Utiliza el estado global para obtener datos de eventos, organizaciones y usuarios.
 */

import { getState } from '../utils/state.js';
import { formatDate } from '../utils/helpers.js';

/**
 * Renderiza el dashboard principal con KPIs, accesos rápidos y lista de eventos recientes.
 * @returns {string} HTML del dashboard
 */
export function renderDashboard(){
  const { events, organizations, users } = getState();
  // ID del usuario autenticado
  const meId = JSON.parse(localStorage.getItem('uc_auth')||'{}')?.id;
  // Eventos organizados por el usuario actual
  const myEvents = events.filter(e => e.organizerId === meId);
  // Últimos 6 eventos recientes
  const recent = [...events].sort((a,b)=> (b.date+a.time).localeCompare(a.date+a.time)).slice(0,6);

  // Tarjeta de estadística
  const statCard = (label, value, action) => `
    <div class="card stat">
      <div class="card-body">
        <div class="muted">${label}</div>
        <div class="kpi">${value}</div>
        ${action || ''}
      </div>
    </div>`;

  // Accesos rápidos
  const quicks = `
    <div class="flex gap-8 mt-16">
      <a href="#events" class="btn small">➕ Nuevo evento</a>
      <a href="#organizations" class="btn small">🏢 Nueva organización</a>
      <a href="#calendar" class="btn small">📅 Ver calendario</a>
    </div>`;

  // Lista de eventos recientes
  const recentList = recent.map(e => `
    <div class="list-item">
      <div>
        <strong>${e.title}</strong>
        <div class="muted">${e.category} • ${formatDate(e.date)} • ${e.time}</div>
      </div>
      <span class="badge">${e.status}</span>
    </div>
  `).join('');

  return `
    <section class="grid">
      <div class="col-3 col-12">${statCard('Total eventos', events.length, '')}</div>
      <div class="col-3 col-12">${statCard('Mis eventos', myEvents.length, '')}</div>
      <div class="col-3 col-12">${statCard('Organizaciones', organizations.length, '')}</div>
      <div class="col-3 col-12">${statCard('Usuarios', users.length, '')}</div>
    </section>

    <section class="grid mt-24">
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Eventos recientes</strong></div>
        <div class="card-body">
          <div class="list">${recentList || '<div class="muted">Sin eventos</div>'}</div>
          ${quicks}
        </div>
      </div>
      <div class="card col-4 col-12">
        <div class="card-head"><strong>Próximos (mini calendario)</strong></div>
        <div class="card-body"><div id="mini-cal"></div></div>
      </div>
    </section>
  `;
}
