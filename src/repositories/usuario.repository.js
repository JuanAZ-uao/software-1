// src/repositories/usuario.repository.js
import pool from '../db/pool.js';

/**
 * Buscar usuarios con indicador si son secretaria academica
 * q: texto de búsqueda (nombre, apellidos, email)
 * limit, offset para paginación
 * conn opcional para transacciones
 */
export async function buscarUsuarios({ q = '', limit = 20, offset = 0 }, conn) {
  const connection = conn || pool;
  const like = `%${String(q).replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  const sql = `
    SELECT u.idUsuario AS id, u.nombre, u.apellidos, u.email, u.telefono, u.documento,
           CASE WHEN sa.idUsuario IS NOT NULL THEN 1 ELSE 0 END AS isSecretaria
    FROM usuario u
    LEFT JOIN secretariaAcademica sa ON sa.idUsuario = u.idUsuario
    WHERE (u.nombre LIKE ? OR u.apellidos LIKE ? OR u.email LIKE ?)
    ORDER BY u.nombre ASC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await connection.query(sql, [like, like, like, limit, offset]);
  return rows;
}

export async function contarUsuarios({ q = '' }, conn) {
  const connection = conn || pool;
  const like = `%${String(q).replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
  const sql = `
    SELECT COUNT(*) AS total
    FROM usuario u
    LEFT JOIN secretariaAcademica sa ON sa.idUsuario = u.idUsuario
    WHERE (u.nombre LIKE ? OR u.apellidos LIKE ? OR u.email LIKE ?)
  `;
  const [rows] = await connection.query(sql, [like, like, like]);
  return rows[0]?.total || 0;
}

export async function obtenerPorId(id, conn) {
  const connection = conn || pool;
  const sql = `
    SELECT u.idUsuario AS id, u.nombre, u.apellidos, u.email, u.telefono, u.documento,
           CASE WHEN sa.idUsuario IS NOT NULL THEN 1 ELSE 0 END AS isSecretaria
    FROM usuario u
    LEFT JOIN secretariaAcademica sa ON sa.idUsuario = u.idUsuario
    WHERE u.idUsuario = ? LIMIT 1
  `;
  const [rows] = await connection.query(sql, [id]);
  return rows[0] || null;
}

export async function updateUsuario(idUsuario, payload, conn) {
  const connection = conn || pool;
  const fields = [];
  const params = [];

  if (typeof payload.nombre !== 'undefined') { fields.push('nombre = ?'); params.push(payload.nombre); }
  if (typeof payload.apellidos !== 'undefined') { fields.push('apellidos = ?'); params.push(payload.apellidos); }
  if (typeof payload.email !== 'undefined') { fields.push('email = ?'); params.push(payload.email); }
  if (typeof payload.telefono !== 'undefined') { fields.push('telefono = ?'); params.push(payload.telefono); }

  if (fields.length === 0) return null;

  const sql = `UPDATE usuario SET ${fields.join(', ')} WHERE idUsuario = ?`;
  params.push(idUsuario);
  const [result] = await connection.query(sql, params);

  if (result.affectedRows === 0) return null;

  return await obtenerPorId(idUsuario, connection);
}

export async function esSecretariaPorId(idUsuario, conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT 1 FROM secretariaAcademica WHERE idUsuario = ? LIMIT 1', [idUsuario]);
  return Array.isArray(rows) && rows.length > 0;
}
