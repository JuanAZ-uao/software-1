// src/repositories/eventInstallation.repository.js
import pool from '../db/pool.js';

export async function insert(record, conn) {
  const connection = conn || pool;
  const sql = `INSERT INTO evento_instalacion (idEvento, idInstalacion) VALUES (?, ?)`;
  const params = [record.idEvento, record.idInstalacion];
  const [result] = await connection.query(sql, params);
  const [rows] = await connection.query('SELECT * FROM evento_instalacion WHERE idEvento = ? AND idInstalacion = ? LIMIT 1', [record.idEvento, record.idInstalacion]);
  return rows[0] || null;
}

export async function deleteByEvent(idEvento, conn) {
  const connection = conn || pool;
  const [result] = await connection.query('DELETE FROM evento_instalacion WHERE idEvento = ?', [idEvento]);
  return result.affectedRows;
}

export async function findByEvent(idEvento) {
  const [rows] = await pool.query('SELECT * FROM evento_instalacion WHERE idEvento = ?', [idEvento]);
  return rows;
}
