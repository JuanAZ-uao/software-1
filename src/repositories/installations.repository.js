// repositories/installations.repository.js
import pool from '../db/pool.js';

export async function findAll() {
  const [rows] = await pool.query('SELECT idInstalacion, nombre, ubicacion, capacidad, tipo FROM instalacion ORDER BY nombre');
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM instalacion WHERE idInstalacion = ?', [id]);
  return rows[0] || null;
}
