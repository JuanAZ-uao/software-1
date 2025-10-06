import pool from '../db/pool.js';

export const findAll = async () => {
  const [rows] = await pool.execute('SELECT * FROM organizacion ORDER BY idOrganizacion DESC');
  return rows;
};

export const create = async (payload) => {
  const { nombre, representanteLegal, ubicacion, direccion, ciudad, sectorEconomico, actividadPrincipal, telefono } = payload;
  const [result] = await pool.execute(
    'INSERT INTO organizacion (nombre, representanteLegal, ubicacion, direccion, ciudad, sectorEconomico, actividadPrincipal, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nombre, representanteLegal, ubicacion, direccion, ciudad, sectorEconomico, actividadPrincipal, telefono]
  );
  return { idOrganizacion: result.insertId, ...payload };
};