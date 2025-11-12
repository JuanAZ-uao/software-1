import { isAuthenticated, getCurrentUser, logout } from '../auth.js';
import { navigateTo } from '../utils/router.js';

/**
 * Imágenes predeterminadas por tipo de evento
 */
const EVENT_IMAGES = {
  academico: [
    'public/statics/imgEventoAcademico1.jpeg',
    'public/statics/imgEventoAcademico2.jpeg',
    'public/statics/imgEventoAcademico3.jpeg'
  ],
  ludico: [
    'public/statics/imgEventoLudico1.jpeg',
    'public/statics/imgEventoLudico2.jpeg',
    'public/statics/imgEventoLudico3.jpeg'
  ]
};

/**
 * Obtener imagen para evento (rotativa según ID)
 */
function getEventImage(evento) {
  const type = evento.tipo || 'academico';
  const images = EVENT_IMAGES[type] || EVENT_IMAGES.academico;
  const index = (evento.idEvento || 0) % images.length;
  return images[index];
}

/**
 * Formatear fecha
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Formatear hora
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

/**
 * Renderizar página de inicio pública
 */
export function renderHome() {
  const isAuth = isAuthenticated();
  const user = getCurrentUser();

  return `
    <div class="home-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">🎓 Universidad Connect</h1>
          <p class="hero-subtitle">Plataforma de Gestión de Eventos Académicos</p>
          <div class="hero-cta">
            ${isAuth 
              ? `
                <button class="btn primary" onclick="window.location.hash='#dashboard'">
                  📊 Ir al Dashboard
                </button>
                <button class="btn secondary" onclick="handleLogout()">
                  🚪 Cerrar Sesión
                </button>
              `
              : `
                <button class="btn primary" onclick="window.location.hash='#login'">
                  🔐 Iniciar Sesión
                </button>
                <button class="btn secondary" onclick="window.location.hash='#login'">
                  ✍️ Registrarse
                </button>
              `
            }
          </div>
        </div>
      </section>

      <!-- Eventos Aprobados Section -->
      <section class="events-section">
        <div class="section-header">
          <h2>📅 Eventos Próximos</h2>
          <p>Descubre los eventos académicos y lúdicos aprobados</p>
        </div>

        <div id="events-grid" class="events-grid">
          <div class="loading-spinner">
            <p>⏳ Cargando eventos...</p>
          </div>
        </div>
      </section>

      <!-- About Section -->
      <section class="about-section">
        <div class="about-content">
          <h2>¿Qué es Universidad Connect?</h2>
          <div class="about-grid">
            <div class="about-card">
              <div class="about-icon">📚</div>
              <h3>Eventos Académicos</h3>
              <p>Organiza y gestiona conferencias, seminarios y talleres educativos.</p>
            </div>
            <div class="about-card">
              <div class="about-icon">🎉</div>
              <h3>Eventos Lúdicos</h3>
              <p>Coordina actividades recreativas, competencias y celebraciones.</p>
            </div>
            <div class="about-card">
              <div class="about-icon">👥</div>
              <h3>Colaboración</h3>
              <p>Involucra a múltiples organizaciones en la ejecución de eventos.</p>
            </div>
            <div class="about-card">
              <div class="about-icon">📊</div>
              <h3>Gestión Integral</h3>
              <p>Control completo desde la creación hasta la evaluación de eventos.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Footer -->
      <section class="cta-footer">
        ${!isAuth 
          ? `
            <h2>¿Listo para participar?</h2>
            <p>Únete a Universidad Connect y sé parte de nuestros eventos</p>
            <button class="btn primary large" onclick="window.location.hash='#login'">
              Comenzar Ahora 🚀
            </button>
          `
          : `
            <h2>¡Bienvenido, ${user?.nombre || 'Usuario'}!</h2>
            <p>Explora más funcionalidades en tu dashboard</p>
            <button class="btn primary large" onclick="window.location.hash='#dashboard'">
              Ver Dashboard 📊
            </button>
          `
        }
      </section>
    </div>
  `;
}

/**
 * Renderizar tarjeta de evento
 */
function renderEventCard(evento) {
  const image = getEventImage(evento);
  const typeLabel = evento.tipo === 'academico' ? '📚 Académico' : '🎉 Lúdico';
  const date = formatDate(evento.fecha);
  const time = formatTime(evento.hora);

  return `
    <div class="event-card">
      <div class="event-image-container">
        <img src="${image}" alt="${evento.nombre}" class="event-image" onerror="this.style.background='#e0e0e0'">
        <span class="event-type-badge">${typeLabel}</span>
      </div>
      <div class="event-card-body">
        <h3 class="event-title">${evento.nombre || 'Evento sin nombre'}</h3>
        <div class="event-meta">
          <div class="event-meta-item">
            <span class="icon">📅</span>
            <span>${date}</span>
          </div>
          <div class="event-meta-item">
            <span class="icon">🕐</span>
            <span>${time}</span>
          </div>
          ${evento.capacidad ? `
            <div class="event-meta-item">
              <span class="icon">👥</span>
              <span>Capacidad: ${evento.capacidad}</span>
            </div>
          ` : ''}
        </div>
        <p class="event-description">${evento.descripcion || 'Evento sin descripción'}</p>
        <div class="event-footer">
          ${isAuthenticated() 
            ? `
              <button class="btn small primary" onclick="viewEventDetails(${evento.idEvento})">
                Ver Detalles →
              </button>
            `
            : `
              <button class="btn small secondary" onclick="window.location.hash='#login'">
                Inicia sesión para ver más
              </button>
            `
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * Vincular eventos de home
 */
export function bindHomeEvents() {
  loadApprovedEvents();
}

/**
 * Cargar y renderizar eventos aprobados
 */
async function loadApprovedEvents() {
  try {
    const response = await fetch('/api/events/approved');
    
    if (!response.ok) {
      throw new Error('Error cargando eventos');
    }

    const eventos = await response.json();
    const gridContainer = document.getElementById('events-grid');

    if (!eventos || eventos.length === 0) {
      gridContainer.innerHTML = `
        <div class="no-events">
          <p>📭 No hay eventos aprobados en este momento</p>
        </div>
      `;
      return;
    }

    // Renderizar tarjetas de eventos
    gridContainer.innerHTML = eventos
      .map(evento => renderEventCard(evento))
      .join('');

  } catch (error) {
    console.error('Error cargando eventos:', error);
    const gridContainer = document.getElementById('events-grid');
    gridContainer.innerHTML = `
      <div class="error-message">
        <p>❌ Error cargando eventos: ${error.message}</p>
      </div>
    `;
  }
}

/**
 * Ver detalles de un evento (redirigir a componente de eventos)
 */
window.viewEventDetails = function(idEvento) {
  navigateTo(`events?id=${idEvento}`);
};

/**
 * Manejar logout - usar la función de auth.js para consistencia
 */
window.handleLogout = function() {
  logout();
};
