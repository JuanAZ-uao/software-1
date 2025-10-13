// src/repositories/organizationEvent.repository.js
import pool from '../db/pool.js';

export async function insert(record, conn) {
  const connection = conn || pool;
  const sql = `INSERT INTO organizacion_evento (idOrganizacion, idEvento, participante, esRepresentanteLegal, certificadoParticipacion)
               VALUES (?, ?, ?, ?, ?)`;
  const params = [record.idOrganizacion, record.idEvento, record.participante, record.esRepresentanteLegal, record.certificadoParticipacion];
  const [result] = await connection.query(sql, params);
  const [rows] = await connection.query('SELECT * FROM organizacion_evento WHERE idEvento = ? AND idOrganizacion = ? LIMIT 1', [record.idEvento, record.idOrganizacion]);
  return rows[0] || null;
}

export async function deleteByEvent(idEvento, conn) {
  const connection = conn || pool;
  const [result] = await connection.query('DELETE FROM organizacion_evento WHERE idEvento = ?', [idEvento]);
  return result.affectedRows;
}

export async function findByEvent(idEvento) {
  const [rows] = await pool.query('SELECT * FROM organizacion_evento WHERE idEvento = ?', [idEvento]);
  return rows;
}
