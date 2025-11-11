// src/repositories/aval.repository.js
import pool from '../db/pool.js';

/**
 * Upsert aval por (idUsuario, idEvento).
 * Si existe, actualiza avalPdf, principal y tipoAval.
 * Si avalPdf o tipoAval vienen NULL, preserva el valor existente.
 */
export async function upsert(record, conn) {
  const connection = conn || pool;
  const sql = `
    INSERT INTO aval (idUsuario, idEvento, avalPdf, principal, tipoAval)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      avalPdf = COALESCE(VALUES(avalPdf), avalPdf),
      principal = VALUES(principal),
      tipoAval = COALESCE(VALUES(tipoAval), tipoAval)
  `;
  const params = [
    record.idUsuario,
    record.idEvento,
    record.avalPdf ?? null,
    record.principal ? 1 : 0,
    record.tipoAval ?? null
  ];
  await connection.query(sql, params);

  const [rows] = await connection.query('SELECT * FROM aval WHERE idUsuario = ? AND idEvento = ? LIMIT 1', [record.idUsuario, record.idEvento]);
  return rows[0] || null;
}

/**
 * Buscar aval(es) por evento
 * conn opcional para usar transacción
 */
export async function findByEvent(idEvento, conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT * FROM aval WHERE idEvento = ?', [idEvento]);
  return rows;
}

/**
 * Buscar aval por usuario+evento
 * conn opcional para usar transacción
 */
export async function findByUserEvent(idUsuario, idEvento, conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT * FROM aval WHERE idUsuario = ? AND idEvento = ? LIMIT 1', [idUsuario, idEvento]);
  return rows[0] || null;
}

/**
 * Eliminar aval por usuario+evento
 */
export async function deleteAval(idEvento, idUsuario, conn) {
  const connection = conn || pool;
  const [res] = await connection.query('DELETE FROM aval WHERE idEvento = ? AND idUsuario = ?', [idEvento, idUsuario]);
  return res.affectedRows;
}
