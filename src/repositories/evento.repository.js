import pool from '../db/pool.js';

export const findAll = async () => {
  const [rows] = await pool.execute('SELECT * FROM evento ORDER BY idEvento DESC');
  return rows;
};

export const create = async (payload) => {
  const { idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin } = payload;
  const [result] = await pool.execute(
    'INSERT INTO evento (idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin]
  );
  return { idEvento: result.insertId, ...payload };
};