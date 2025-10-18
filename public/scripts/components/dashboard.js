// src/components/dashboard.js
import { getState } from '../utils/state.js';
import { formatDate } from '../utils/helpers.js';

/**
 * Convierte un evento a Date seguro usando múltiples nombres posibles de campo.
 * Soporta: date | fecha | fechaEvento (YYYY-MM-DD) y time | hora (HH:mm)
 * Devuelve null si no puede parsear.
 */
function toDateTime(evt) {
  try {
    if (!evt) return null;
    const dateRaw = evt.date ?? evt.fecha ?? evt.fechaEvento ?? '';
    const timeRaw = evt.time ?? evt.hora ?? '';
    const dateStr = typeof dateRaw === 'string' ? dateRaw.trim() : (dateRaw instanceof Date ? dateRaw.toISOString().slice(0,10) : '');
    const timeStr = typeof timeRaw === 'string' ? timeRaw.trim() : '';

    if (!dateStr) return null;
    // Normalizar hora; si no hay hora tomamos inicio del día
    const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch (err) {
    return null;
  }
}

/**
 * Normaliza campos para render: title/nombre, category/tipo, status/estado, organizerId/idUsuario.
 */
function normalizeEventForView(e) {
  return {
    id: e.id ?? e.idEvento ?? null,
    title: e.title ?? e.nombre ?? e.name ?? '',
    category: e.category ?? e.tipo ?? '',
    date: e.date ?? e.fecha ?? '',
    time: e.time ?? e.hora ?? '',
    status: e.status ?? e.estado ?? '',
    organizerId: e.organizerId ?? e.idUsuario ?? e.userId ?? null,
    ubicacion: e.ubicacion ?? e.location ?? ''
  };
}

/**
 * Renderiza el dashboard principal con KPIs, accesos rápidos y lista de eventos recientes.
 */
export function renderDashboard(){
  const { events = [], organizations = [], users = [] } = getState() || {};
  // ID del usuario autenticado
  const meId = JSON.parse(localStorage.getItem('uc_auth')||'{}')?.id;

  const normalized = Array.isArray(events) ? events.map(normalizeEventForView) : [];

  // Eventos organizados por el usuario actual
  const myEvents = normalized.filter(e => String(e.organizerId) === String(meId));

  // Ordenar por fecha+hora descendente de forma segura
  const recent = normalized
    .slice()
    .sort((a, b) => {
      const da = toDateTime(a);
      const db = toDateTime(b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return db.getTime() - da.getTime();
    })
    .slice(0, 6);

  const statCard = (label, value, action) => `
    <div class="card stat">
      <div class="card-body">
        <div class="muted">${label}</div>
        <div class="kpi">${value}</div>
        ${action || ''}
      </div>
    </div>`;

  const quicks = `
    <div class="flex gap-8 mt-16">
      <a href="#events" class="btn small">➕ Nuevo evento</a>
      <a href="#calendar" class="btn small">📅 Ver calendario</a>
    </div>`;

  const recentList = recent.length ? recent.map(e => `
    <div class="list-item">
      <div>
        <strong>${escapeHtml(e.title)}</strong>
        <div class="muted">${escapeHtml(e.category)} • ${formatDate(e.date)} • ${escapeHtml(e.time)}</div>
      </div>
      <span class="badge">${escapeHtml(e.status)}</span>
    </div>
  `).join('') : '<div class="muted">Sin eventos</div>';

  return `
    <section class="grid">
      <div class="col-3 col-12">${statCard('Total eventos', normalized.length, '')}</div>
      <div class="col-3 col-12">${statCard('Mis eventos', myEvents.length, '')}</div>
      <div class="col-3 col-12">${statCard('Organizaciones', organizations?.length || 0, '')}</div>
<<<<<<< HEAD
=======
      <div class="col-3 col-12">${statCard('Usuarios', users?.length || 0, '')}</div>
>>>>>>> 3d88b9bc7ac5bc53c9cc7c12bedb8e14b112d16f
    </section>

    <section class="grid mt-24">
      <div class="card col-8 col-12">
        <div class="card-head"><strong>Eventos recientes</strong></div>
        <div class="card-body">
          <div class="list">${recentList}</div>
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

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
