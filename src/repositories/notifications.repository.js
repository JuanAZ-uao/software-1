import pool from '../db/pool.js';

/**
 * Crea una nueva notificación en la BD
 * @param {number} idUsuario - ID del usuario destinatario
 * @param {number} idEvento - ID del evento relacionado
 * @param {string} tipo - Tipo de notificación (enRevision, evaluado, aprobado, rechazado)
 * @param {string} titulo - Título de la notificación
 * @param {string} descripcion - Descripción detallada
 * @returns {Promise<Object>} Objeto con detalles de la notificación creada
 */
export async function createNotification(idUsuario, idEvento, tipo, titulo, descripcion) {
  try {
    const query = `
      INSERT INTO notificacion (idUsuario, idEvento, tipo, titulo, descripcion, leida)
      VALUES (?, ?, ?, ?, ?, FALSE)
    `;
    const [result] = await pool.query(query, [idUsuario, idEvento, tipo, titulo, descripcion]);
    
    // Obtener la notificación que acabamos de insertar
    const [[notificacion]] = await pool.query(
      `SELECT * FROM notificacion WHERE idNotificacion = ?`,
      [result.insertId]
    );
    
    console.log(`✅ Notificación creada en BD: ${JSON.stringify(notificacion)}`);
    return notificacion;
  } catch (err) {
    console.error('❌ Error creating notification:', err);
    throw err;
  }
}

/**
 * Obtiene todas las notificaciones de un usuario
 * @param {number} idUsuario - ID del usuario
 * @param {boolean} soloNoLeidas - Si true, solo retorna no leídas
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getUserNotifications(idUsuario, soloNoLeidas = false) {
  try {
    let query = `
      SELECT n.*, e.nombre as nombreEvento, e.fecha, e.hora
      FROM notificacion n
      LEFT JOIN evento e ON n.idEvento = e.idEvento
      WHERE n.idUsuario = ?
    `;
    const params = [idUsuario];

    if (soloNoLeidas) {
      query += ` AND n.leida = FALSE`;
    }

    query += ` ORDER BY n.fecha_creacion DESC`;

    const [rows] = await pool.query(query, params);
    return rows || [];
  } catch (err) {
    console.error('Error getting user notifications:', err);
    throw err;
  }
}

/**
 * Marca una notificación como leída
 * @param {number} idNotificacion - ID de la notificación
 * @returns {Promise<Object>} Objeto actualizado
 */
export async function markAsRead(idNotificacion) {
  try {
    const query = `
      UPDATE notificacion
      SET leida = TRUE, fecha_lectura = NOW()
      WHERE idNotificacion = ?
    `;
    const [result] = await pool.query(query, [idNotificacion]);
    if (result.affectedRows === 0) {
      throw new Error('Notificación no encontrada');
    }
    return { idNotificacion, leida: true };
  } catch (err) {
    console.error('Error marking notification as read:', err);
    throw err;
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas de un usuario
 * @param {number} idUsuario - ID del usuario
 * @returns {Promise<number>} Cantidad de notificaciones no leídas
 */
export async function getUnreadCount(idUsuario) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM notificacion
      WHERE idUsuario = ? AND leida = FALSE
    `;
    const [rows] = await pool.query(query, [idUsuario]);
    return rows[0]?.count || 0;
  } catch (err) {
    console.error('Error getting unread count:', err);
    throw err;
  }
}

/**
 * Elimina una notificación
 * @param {number} idNotificacion - ID de la notificación
 * @returns {Promise<boolean>} True si se eliminó exitosamente
 */
export async function deleteNotification(idNotificacion) {
  try {
    const query = `DELETE FROM notificacion WHERE idNotificacion = ?`;
    const [result] = await pool.query(query, [idNotificacion]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error('Error deleting notification:', err);
    throw err;
  }
}

/**
 * Obtiene todas las secretarias académicas de una facultad
 * @param {number} idFacultad - ID de la facultad
 * @returns {Promise<Array>} Lista de IDs de usuarios secretarios
 */
export async function getSecretariasByFacultad(idFacultad) {
  try {
    const query = `
      SELECT idUsuario FROM secretariaAcademica
      WHERE idFacultad = ?
    `;
    const [rows] = await pool.query(query, [idFacultad]);
    // Normalize to numbers and dedupe
    const ids = (rows || []).map(r => Number(r.idUsuario)).filter(n => Number.isFinite(n));
    return Array.from(new Set(ids));
  } catch (err) {
    console.error('Error getting secretarias by facultad:', err);
    throw err;
  }
}

/**
 * Obtiene todas las secretarias académicas registradas
 * @returns {Promise<Array>} Lista de IDs de usuario
 */
export async function getAllSecretarias() {
  try {
    const query = `SELECT idUsuario FROM secretariaAcademica`;
    const [rows] = await pool.query(query);
    return rows.map(r => r.idUsuario) || [];
  } catch (err) {
    console.error('Error getting all secretarias:', err);
    throw err;
  }
}
