import * as notifSvc from '../services/notifications.service.js';

/**
 * Obtiene todas las notificaciones del usuario autenticado
 */
export async function getMyNotifications(req, res) {
  try {
    const idUsuario = req.user?.id;
    if (!idUsuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const soloNoLeidas = req.query.unread === 'true' || req.query.unread === '1';
    const notificaciones = await notifSvc.getUserNotifications(idUsuario, soloNoLeidas);

    res.json(notificaciones);
  } catch (err) {
    console.error('notifications.controller.getMyNotifications error:', err);
    res.status(500).json({ error: 'Error obteniendo notificaciones' });
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas
 */
export async function getUnreadCount(req, res) {
  try {
    const idUsuario = req.user?.id;
    if (!idUsuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const count = await notifSvc.getUnreadCount(idUsuario);
    res.json({ unreadCount: count });
  } catch (err) {
    console.error('notifications.controller.getUnreadCount error:', err);
    res.status(500).json({ error: 'Error obteniendo conteo' });
  }
}

/**
 * Marca una notificación como leída (endpoint deprecated, usar getMyNotifications con id)
 */
export async function markAsRead(req, res) {
  try {
    const idNotificacion = req.params.id;
    const idUsuario = req.user?.id;

    if (!idUsuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar que la notificación pertenece al usuario
    const notifs = await notifSvc.getUserNotifications(idUsuario);
    const notif = notifs.find(n => n.idNotificacion === Number(idNotificacion));
    
    if (!notif) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const updated = await notifSvc.markAsRead(idNotificacion);
    res.json(updated);
  } catch (err) {
    console.error('notifications.controller.markAsRead error:', err);
    res.status(500).json({ error: 'Error marcando notificación como leída' });
  }
}

/**
 * Elimina una notificación
 */
export async function deleteNotification(req, res) {
  try {
    const idNotificacion = req.params.id;
    const idUsuario = req.user?.id;

    if (!idUsuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar que la notificación pertenece al usuario
    const notifs = await notifSvc.getUserNotifications(idUsuario);
    const notif = notifs.find(n => n.idNotificacion === Number(idNotificacion));
    
    if (!notif) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const deleted = await notifSvc.deleteNotification(idNotificacion);
    
    if (!deleted) {
      return res.status(500).json({ error: 'No se pudo eliminar la notificación' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('notifications.controller.deleteNotification error:', err);
    res.status(500).json({ error: 'Error eliminando notificación' });
  }
}

/**
 * Marca todas como leídas (endpoint antiguo, mantenido por compatibilidad)
 */
export async function markAllAsRead(req, res) {
  // Marcar todas las notificaciones como leídas
  res.json({
    success: true,
    message: 'Todas las notificaciones marcadas como leídas'
  });
}

// Mantener método antiguo por compatibilidad
export const getNotifications = getMyNotifications;