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
    const { nombre, apellidos, documento, email, telefono, password, tipo } = req.body;
    // Campos requeridos
    if (!nombre || !apellidos || !documento || !email || !telefono || !password || !tipo) {
        throw new ValidationError('Todos los campos son requeridos');
    }
    // Validar email
    if (!isValidEmail(email)) {
        throw new ValidationError('Email inválido');
    }
    // Validar contraseña con nuevos requisitos
    if (!isValidPassword(password)) {
        throw new ValidationError('La contraseña debe tener al menos 6 caracteres, una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")');
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

// Función auxiliar para validar contraseña
function isValidPassword(password) {
    if (!password || password.length < 6) {
        return false;
    }
    
    // Verificar que tenga al menos una mayúscula
    const hasUpperCase = /[A-Z]/.test(password);
    
    // Verificar que tenga al menos un carácter especial
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?"]/.test(password);
    
    return hasUpperCase && hasSpecialChar;
}