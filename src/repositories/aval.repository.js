// src/repositories/aval.repository.js
import pool from '../db/pool.js';

/**
 * Upsert aval por (idUsuario, idEvento).
 * Si existe, actualiza avalPdf, principal y tipoAval.
 */
export async function upsert(record, conn) {
  const connection = conn || pool;
  const sql = `
    INSERT INTO aval (idUsuario, idEvento, avalPdf, principal, tipoAval)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      avalPdf = VALUES(avalPdf),
      principal = VALUES(principal),
      tipoAval = VALUES(tipoAval)
  `;
  const params = [
    record.idUsuario,
    record.idEvento,
    record.avalPdf,
    record.principal ? 1 : 0,
    record.tipoAval
  ];
  await connection.query(sql, params);

  // devolver la fila resultante
  const [rows] = await connection.query('SELECT * FROM aval WHERE idUsuario = ? AND idEvento = ? LIMIT 1', [record.idUsuario, record.idEvento]);
  return rows[0] || null;
}

/**
 * Buscar aval(s) por evento
 */
export async function findByEvent(idEvento) {
  const [rows] = await pool.query('SELECT * FROM aval WHERE idEvento = ?', [idEvento]);
  return rows;
}

/**
 * Buscar aval por usuario+evento
 */
export async function findByUserEvent(idUsuario, idEvento) {
  const [rows] = await pool.query('SELECT * FROM aval WHERE idUsuario = ? AND idEvento = ? LIMIT 1', [idUsuario, idEvento]);
  return rows[0] || null;
}
