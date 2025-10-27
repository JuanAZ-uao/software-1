// src/repositories/installations.repository.js
import pool from '../db/pool.js';

export async function findAll(conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT idInstalacion, nombre, ubicacion, capacidad, tipo FROM instalacion ORDER BY nombre');
  return rows || [];
}

export async function findById(id, conn) {
  const connection = conn || pool;
  const [rows] = await connection.query('SELECT * FROM instalacion WHERE idInstalacion = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function findByIds(ids = [], conn) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const sql = `SELECT * FROM instalacion WHERE idInstalacion IN (${placeholders})`;
  const connection = conn || pool;
  const [rows] = await connection.query(sql, ids);
  return rows || [];
}
