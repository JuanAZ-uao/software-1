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

/**
 * Valida los datos para actualizar perfil
 */
export const validateUpdateProfile = (req, res, next) => {
	const { nombre, apellidos, email, telefono } = req.body;
	
	// Al menos un campo debe ser proporcionado
	if (!nombre && !apellidos && !email && !telefono) {
		throw new ValidationError('Al menos un campo debe ser proporcionado para actualizar');
	}
	
	// Validar email si se proporciona
	if (email && !isValidEmail(email)) {
		throw new ValidationError('Email inválido');
	}
	
	// Validar teléfono si se proporciona (solo números, 10 dígitos)
	if (telefono && !/^\d{10}$/.test(telefono)) {
		throw new ValidationError('Teléfono debe tener 10 dígitos');
	}
	
	// Validar nombre y apellidos si se proporcionan (no vacíos)
	if (nombre !== undefined && (!nombre || nombre.trim().length === 0)) {
		throw new ValidationError('El nombre no puede estar vacío');
	}
	
	if (apellidos !== undefined && (!apellidos || apellidos.trim().length === 0)) {
		throw new ValidationError('Los apellidos no pueden estar vacíos');
	}
	
	next();
};

/**
 * Valida los datos para cambiar contraseña
 */
export const validateChangePassword = (req, res, next) => {
	const { currentPassword, newPassword, confirmPassword } = req.body;
	
	// Campos requeridos
	if (!currentPassword || !newPassword) {
		throw new ValidationError('Contraseña actual y nueva contraseña son requeridas');
	}
	
	// Validar longitud de nueva contraseña
	if (newPassword.length < 6) {
		throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
	}
	
	// Validar confirmación de contraseña si se proporciona
	if (confirmPassword && newPassword !== confirmPassword) {
		throw new ValidationError('Las contraseñas no coinciden');
	}
	
	// No puede ser igual a la actual
	if (currentPassword === newPassword) {
		throw new ValidationError('La nueva contraseña debe ser diferente a la actual');
	}
	
	next();
};

// Función auxiliar para validar email
function isValidEmail(email) {
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}