// src/repositories/aval.repository.js
import pool from '../db/pool.js';

export async function insert(record, conn) {
  const connection = conn || pool;
  const [result] = await connection.query(
    'INSERT INTO aval (idUsuario, idEvento, avalPdf, principal, tipoAval) VALUES (?,?,?,?,?)',
    [record.idUsuario, record.idEvento, record.avalPdf, record.principal ? 1 : 0, record.tipoAval]
  );
  return { insertedId: result.insertId };
}

export async function findByEvent(idEvento) {
  const [rows] = await pool.query('SELECT * FROM aval WHERE idEvento = ?', [idEvento]);
  return rows;
}
