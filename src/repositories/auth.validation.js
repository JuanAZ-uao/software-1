/**
 * auth.validation.js - Validaciones de autenticación
 *
 * Define middlewares para validar los datos de login y registro de usuario.
 * Lanza ValidationError si los datos no cumplen los requisitos.
 */

import { ValidationError } from '../core/errors/validation-error.js';

/**
 * Valida los datos de login (email y password requeridos y formato válido)
 */
export const validateLogin = (req, res, next) => {
	const { email, password } = req.body;
	if (!email || !password) {
		throw new ValidationError('Email y contraseña son requeridos');
	}
	if (!isValidEmail(email)) {
		throw new ValidationError('Email inválido');
	}
	next();
};

/**
 * Valida los datos de registro de usuario
 */
export const validateRegister = (req, res, next) => {
	const { nombre, apellidos, email, telefono, password, tipo } = req.body;
	// Campos requeridos
	if (!nombre || !apellidos || !email || !telefono || !password || !tipo) {
		throw new ValidationError('Todos los campos son requeridos');
	}
	// Validar email
	if (!isValidEmail(email)) {
		throw new ValidationError('Email inválido');
	}
	// Validar contraseña - sin restricción de longitud
	if (!password || password.trim().length === 0) {
		throw new ValidationError('La contraseña no puede estar vacía');
	}
	// Validar tipo de usuario
	const tiposValidos = ['estudiante', 'docente', 'secretaria'];
	if (!tiposValidos.includes(tipo)) {
		throw new ValidationError('Tipo de usuario inválido');
	}
	// Validar teléfono (solo números)
	if (!/^\d{10}$/.test(telefono)) {
		throw new ValidationError('Teléfono debe tener 10 dígitos');
	}
	next();
};

// Función auxiliar para validar email
function isValidEmail(email) {
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}