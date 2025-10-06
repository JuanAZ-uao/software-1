import pool from '../db/pool.js';

export const getAllFacultades = async () => {
  const [rows] = await pool.execute('SELECT idFacultad AS id, nombre FROM facultad ORDER BY idFacultad');
  return rows;
};

export const getFacultadById = async (id) => {
  const [rows] = await pool.execute('SELECT idFacultad AS id, nombre FROM facultad WHERE idFacultad = ?', [id]);
  return rows[0] || null;
};

export const createFacultad = async (nombre) => {
  const [result] = await pool.execute('INSERT INTO facultad (nombre) VALUES (?)', [nombre]);
  return { id: result.insertId, nombre };
};