/**
 * user.repository.js - Repositorio de usuarios
 *
 * Contiene funciones para interactuar con la base de datos relacionadas con usuarios:
 * - Buscar todos los usuarios
 * - Buscar usuario por ID
 * - Crear usuario
 * - Actualizar usuario
 * - Eliminar usuario
 *
 * Utiliza pool de MySQL para ejecutar queries.
 */

import { getPool } from '../../db/pool.js';

const USER_COLUMNS = 'id, name, email, created_at AS createdAt, updated_at AS updatedAt';

/**
 * Retorna todos los usuarios ordenados por ID descendente
 */
export const findAll = async () => {
  const pool = await getPool();
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users ORDER BY id DESC`);
  return rows;
};

/**
 * Busca un usuario por ID
 */
export const findById = async (id) => {
  const pool = await getPool();
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
  return rows[0] ?? null;
};

/**
 * Crea un nuevo usuario y retorna su ID
 */
export const create = async ({ name, email }) => {
  const pool = await getPool();
  const [result] = await pool.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
  return result.insertId;
};

/**
 * Actualiza los datos de un usuario existente
 */
export const update = async (id, { name, email }) => {
  const pool = await getPool();
  const [result] = await pool.query(
    'UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, id]
  );
  return result.affectedRows > 0;
};

/**
 * Elimina un usuario por ID
 */
export const remove = async (id) => {
  const pool = await getPool();
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
