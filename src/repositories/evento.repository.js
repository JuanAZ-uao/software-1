import pool from '../db/pool.js';

export const findAll = async () => {
  const [rows] = await pool.execute('SELECT * FROM evento ORDER BY idEvento DESC');
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM evento WHERE idEvento = ?', [id]);
  return rows[0] || null;
};

export const create = async (payload) => {
  const { idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin } = payload;
  const [result] = await pool.execute(
    'INSERT INTO evento (idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin]
  );
  return { idEvento: result.insertId, ...payload };
};

export const update = async (id, payload) => {
  const { idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin } = payload;
  await pool.execute(
    'UPDATE evento SET idUsuario=?, idInstalacion=?, estado=?, nombre=?, tipo=?, fecha=?, hora=?, horaFin=? WHERE idEvento=?',
    [idUsuario, idInstalacion, estado, nombre, tipo, fecha, hora, horaFin, id]
  );
  const [rows] = await pool.execute('SELECT * FROM evento WHERE idEvento=?', [id]);
  return rows[0];
};

export const remove = async (id) => {
  await pool.execute('DELETE FROM evento WHERE idEvento=?', [id]);
};