/**
 * auth.repository.js - Repositorio de autenticación
 *
 * Este archivo contiene funciones para interactuar con la base de datos relacionadas con usuarios y autenticación:
 * - Buscar usuario por email
 * - Validar contraseña
 * - Crear nuevo usuario y registros relacionados
 *
 * Utiliza pool de MySQL para ejecutar queries y transacciones.
 */

import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';

/**
 * Busca un usuario por email y retorna sus datos, tipo y contraseña activa
 * @param {string} email
 * @returns {object|null} Usuario o null si no existe
 */
export const findUserByEmail = async (email) => {
	const [rows] = await pool.execute(
		`SELECT u.*, c.clave, 
						CASE 
								WHEN e.idUsuario IS NOT NULL THEN 'estudiante'
								WHEN d.idUsuario IS NOT NULL THEN 'docente' 
								WHEN s.idUsuario IS NOT NULL THEN 'secretaria'
								ELSE 'usuario'
						END as tipo
		 FROM usuario u 
		 LEFT JOIN contraseña c ON u.idUsuario = c.idUsuario AND c.estado = 'activa'
		 LEFT JOIN estudiante e ON u.idUsuario = e.idUsuario
		 LEFT JOIN docente d ON u.idUsuario = d.idUsuario  
		 LEFT JOIN secretariaAcademica s ON u.idUsuario = s.idUsuario
		 WHERE u.email = ?`,
		[email]
	);
	return rows[0] || null;
};

/**
 * Valida la contraseña de un usuario (por ahora comparación simple, sin hash)
 * @param {number} userId
 * @param {string} password
 * @returns {boolean}
 */
export const validateUserPassword = async (userId, password) => {
	const [rows] = await pool.execute(
		'SELECT clave FROM `contraseña` WHERE idUsuario = ? AND estado = "activa"',
		[userId]
	);
	if (!rows[0]) return false;
	// Comparación simple por ahora (para debugging)
	return password === rows[0].clave;
};

/**
 * Crea un nuevo usuario y registros relacionados en la base de datos
 * @param {object} userData
 * @returns {object} Usuario creado
 */
export const createUser = async ({ nombre, apellidos, email, telefono, password, tipo }) => {
	// 1. Insertar en la tabla usuario
	const [userResult] = await pool.execute(
		'INSERT INTO usuario (nombre, apellidos, email, telefono) VALUES (?, ?, ?, ?)',
		[nombre, apellidos, email, telefono]
	);
	const idUsuario = userResult.insertId;

	// 2. Insertar la contraseña (sin hash, solo para ejemplo)
	await pool.execute(
		'INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES (?, NOW(), ?, "activa")',
		[idUsuario, password]
	);

	// 3. Retornar el usuario creado
	return { idUsuario, nombre, apellidos, email, telefono, tipo };
};
// ...existing code...
export const updateUserPassword = async (userId, newPassword) => {
    await pool.execute(
        'UPDATE contraseña SET clave = ?, fechaCambio = NOW(), estado = "activa" WHERE idUsuario = ?',
        [newPassword, userId]
    );
};