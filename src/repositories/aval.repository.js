// src/repositories/aval.repository.js
import pool from '../db/pool.js';

/**
 * Upsert aval por (idUsuario, idEvento).
 * - Para INSERT inicial: nunca enviamos NULL en avalPdf o tipoAval (usamos '' si no hay valor).
 * - Para ON DUPLICATE KEY UPDATE: usamos expresiones que preservan el valor existente
 *   cuando VALUES(...) viene como cadena vacía (''), es decir, '' significa "no cambiar".
 */
export async function upsert(record, conn) {
  const connection = conn || pool;

  const avalPdfParam = (typeof record.avalPdf !== 'undefined' && record.avalPdf !== null)
    ? record.avalPdf
    : '';

  const tipoAvalParam = (typeof record.tipoAval !== 'undefined' && record.tipoAval !== null)
    ? record.tipoAval
    : '';

  const sql = `
    INSERT INTO aval (idUsuario, idEvento, avalPdf, principal, tipoAval)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      avalPdf = IF(VALUES(avalPdf) = '', avalPdf, VALUES(avalPdf)),
      principal = VALUES(principal),
      tipoAval = IF(VALUES(tipoAval) = '', tipoAval, VALUES(tipoAval))
  `;

  const params = [
    Number(record.idUsuario),
    Number(record.idEvento),
    avalPdfParam,
    record.principal ? 1 : 0,
    tipoAvalParam
  ];

  // debug log (temporal)
  console.log('[aval.upsert] params', params);

  await connection.query(sql, params);

  const [rows] = await connection.query(
    'SELECT * FROM aval WHERE idUsuario = ? AND idEvento = ? LIMIT 1',
    [record.idUsuario, record.idEvento]
  );
  return rows[0] || null;
}

export async function findByEvent(idEvento, conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT * FROM aval WHERE idEvento = ?', [idEvento]);
  return rows;
}

export async function findByUserEvent(idUsuario, idEvento, conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT * FROM aval WHERE idUsuario = ? AND idEvento = ? LIMIT 1', [idUsuario, idEvento]);
  return rows[0] || null;
}

export async function deleteAval(idEvento, idUsuario, conn) {
  const connection = conn || pool;
  const [res] = await connection.query('DELETE FROM aval WHERE idEvento = ? AND idUsuario = ?', [idEvento, idUsuario]);
  return res.affectedRows;
}

