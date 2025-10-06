// Si usas un array en memoria:
import pool from '../db/pool.js';

export const getAllProgramas = async () => {
  const [rows] = await pool.execute('SELECT idPrograma AS id, nombre, idFacultad FROM programa ORDER BY idPrograma');
  return rows;
};

export const getProgramasByFacultad = async (idFacultad) => {
  const [rows] = await pool.execute('SELECT idPrograma AS id, nombre, idFacultad FROM programa WHERE idFacultad = ? ORDER BY idPrograma', [idFacultad]);
  return rows;
};

export const getProgramaById = async (id) => {
  const [rows] = await pool.execute('SELECT idPrograma AS id, nombre, idFacultad FROM programa WHERE idPrograma = ?', [id]);
  return rows[0] || null;
};