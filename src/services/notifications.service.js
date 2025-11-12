import * as notifRepo from '../repositories/notifications.repository.js';
import * as eventRepo from '../repositories/events.repository.js';

/**
 * Crea notificaciones para todos los secretarios cuando un evento se envía a revisión
 * @param {number} idEvento - ID del evento
 * @param {number} idFacultad - ID de la facultad
 * @returns {Promise<Array>} Array de notificaciones creadas
 */
export async function notifySecretariasOnReview(idEvento, idFacultad) {
  try {
    // Obtener evento para detalles
    const evento = await eventRepo.findById(idEvento);
    if (!evento) throw new Error('Evento no encontrado');

    // Obtener secretarias de la facultad
    const secretariaIds = await notifRepo.getSecretariasByFacultad(idFacultad);
    
    if (secretariaIds.length === 0) {
      console.warn(`No secretarias found for facultad ${idFacultad}`);
      return [];
    }

    // Crear notificación para cada secretaria
    const notificaciones = [];
    for (const idSecretaria of secretariaIds) {
      const notif = await notifRepo.createNotification(
        idSecretaria,
        idEvento,
        'enRevision',
        `Nuevo evento en revisión: ${evento.nombre}`,
        `El evento "${evento.nombre}" programado para ${evento.fecha} a las ${evento.hora} ha sido enviado a revisión. Revisa los detalles y evalúa el evento.`
      );
      notificaciones.push(notif);
    }

    return notificaciones;
  } catch (err) {
    console.error('Error notifying secretarias on review:', err);
    throw err;
  }
}

/**
 * Crea notificación para el organizador cuando un evento es evaluado
 * @param {number} idEvento - ID del evento
 * @param {string} estado - Estado de la evaluación (aprobado/rechazado)
 * @param {string} justificacion - Justificación de la evaluación
 * @returns {Promise<Object>} Notificación creada
 */
export async function notifyOrganizerOnEvaluation(idEvento, estado, justificacion) {
  try {
    // Obtener evento para detalles
    const evento = await eventRepo.findById(idEvento);
    if (!evento) throw new Error('Evento no encontrado');

    const idOrganizador = evento.idUsuario;
    if (!idOrganizador) throw new Error('Organizador del evento no identificado');

    const tipo = estado === 'aprobado' ? 'aprobado' : 'rechazado';
    const titulo = estado === 'aprobado' 
      ? `✓ Evento aprobado: ${evento.nombre}`
      : `✗ Evento rechazado: ${evento.nombre}`;
    
    const descripcion = estado === 'aprobado'
      ? `Tu evento "${evento.nombre}" ha sido aprobado exitosamente.`
      : `Tu evento "${evento.nombre}" ha sido rechazado. Razón: ${justificacion || 'Sin especificar'}`;

    const notif = await notifRepo.createNotification(
      idOrganizador,
      idEvento,
      tipo,
      titulo,
      descripcion
    );

    return notif;
  } catch (err) {
    console.error('Error notifying organizer on evaluation:', err);
    throw err;
  }
}

/**
 * Obtiene notificaciones de un usuario
 * @param {number} idUsuario - ID del usuario
 * @param {boolean} soloNoLeidas - Si true, solo no leídas
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getUserNotifications(idUsuario, soloNoLeidas = false) {
  return await notifRepo.getUserNotifications(idUsuario, soloNoLeidas);
}

/**
 * Marca una notificación como leída
 * @param {number} idNotificacion - ID de la notificación
 * @returns {Promise<Object>} Notificación actualizada
 */
export async function markAsRead(idNotificacion) {
  return await notifRepo.markAsRead(idNotificacion);
}

/**
 * Obtiene conteo de notificaciones no leídas
 * @param {number} idUsuario - ID del usuario
 * @returns {Promise<number>} Cantidad
 */
export async function getUnreadCount(idUsuario) {
  return await notifRepo.getUnreadCount(idUsuario);
}

/**
 * Elimina una notificación
 * @param {number} idNotificacion - ID de la notificación
 * @returns {Promise<boolean>} True si se eliminó
 */
export async function deleteNotification(idNotificacion) {
  return await notifRepo.deleteNotification(idNotificacion);
}
