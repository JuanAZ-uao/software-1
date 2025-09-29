/**
 * auth.service.js - Servicio de autenticación
 *
 * Este archivo contiene la lógica de negocio para autenticación:
 * - Autenticar usuario (login)
 * - Registrar nuevo usuario
 *
 * Llama a funciones del repositorio y lanza errores de validación si corresponde.
 */

import bcrypt from 'bcryptjs';
import { ValidationError } from '../core/errors/validation-error.js';
import { findUserByEmail, createUser, validateUserPassword } from '../repositories/auth.repository.js';

/**
 * Autentica un usuario existente por email y contraseña
 * @param {string} email
 * @param {string} password
 * @returns {object} Usuario autenticado
 * @throws {ValidationError} Si las credenciales son inválidas
 */
export const authenticate = async (email, password) => {
	const user = await findUserByEmail(email);
	if (!user) {
		throw new ValidationError('Credenciales inválidas');
	}
	const isValidPassword = await validateUserPassword(user.idUsuario, password);
	if (!isValidPassword) {
		throw new ValidationError('Credenciales inválidas');
	}
	// Remover datos sensibles
	const { clave, ...userData } = user;
	return userData;
};

/**
 * Registra un nuevo usuario (sin hash temporalmente)
 * @param {object} userData
 * @returns {object} Usuario creado
 * @throws {ValidationError} Si el email ya está registrado
 */
export const registerUser = async (userData) => {
	const { nombre, apellidos, email, telefono, password, tipo } = userData;
	// Verificar si el usuario ya existe
	const existingUser = await findUserByEmail(email);
	if (existingUser) {
		throw new ValidationError('El email ya está registrado');
	}
	// Crear usuario sin hash por ahora
	const newUser = await createUser({
		nombre,
		apellidos,
		email,
		telefono,
		password, // Sin hash
		tipo
	});
	return newUser;
};