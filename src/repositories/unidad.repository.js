import pool from '../db/pool.js';

export const getAllUnidades = async () => {
  const [rows] = await pool.execute('SELECT idUnidadAcademica AS id, nombre, idFacultad FROM unidadAcademica ORDER BY idUnidadAcademica');
  return rows;
};

export const getUnidadesByFacultad = async (idFacultad) => {
  const [rows] = await pool.execute('SELECT idUnidadAcademica AS id, nombre, idFacultad FROM unidadAcademica WHERE idFacultad = ? ORDER BY idUnidadAcademica', [idFacultad]);
  return rows;
};

export const getUnidadById = async (id) => {
  const [rows] = await pool.execute('SELECT idUnidadAcademica AS id, nombre, idFacultad FROM unidadAcademica WHERE idUnidadAcademica = ?', [id]);
  return rows[0] || null;
};
