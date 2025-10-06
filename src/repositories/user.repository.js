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

import { getPool } from '../db/pool.js';

const USER_COLUMNS = 'idUsuario AS id, nombre AS name, apellidos, email, telefono';

/**
 * Retorna todos los usuarios ordenados por ID descendente
 */
export const findAll = async () => {
	const pool = await getPool();
	const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM usuario ORDER BY idUsuario DESC`);
	return rows;
};

/**
 * Busca un usuario por ID
 */
export const findById = async (id) => {
	const pool = await getPool();
	const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM usuario WHERE idUsuario = ?`, [id]);
	return rows[0] ?? null;
};

/**
 * Crea un nuevo usuario y retorna su ID
 */
export const create = async ({ name, email }) => {
	const pool = await getPool();
	const [result] = await pool.query(
		'INSERT INTO usuario (nombre, apellidos, email, telefono) VALUES (?, "", ?, "")',
		[name, email]
	);
	return result.insertId;
};

/**
 * Actualiza los datos de un usuario existente
 */
export const update = async (id, { name, email }) => {
	const pool = await getPool();
	const [result] = await pool.query(
		'UPDATE usuario SET nombre = ?, email = ? WHERE idUsuario = ?',
		[name, email, id]
	);
	return result.affectedRows > 0;
};

/**
 * Elimina un usuario por ID
 */
export const remove = async (id) => {
	const pool = await getPool();
	const [result] = await pool.query('DELETE FROM usuario WHERE idUsuario = ?', [id]);
	return result.affectedRows > 0;
};