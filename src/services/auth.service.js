/**
 * auth.service.js - Servicio de autenticación
 *
 * Este archivo contiene la lógica de negocio para autenticación:
 * - Autenticar usuario (login)
 * - Registrar nuevo usuario
 * - Actualizar perfil de usuario
 * - Cambiar contraseña
 * - Resetear contraseña
 *
 * Llama a funciones del repositorio y lanza errores de validación si corresponde.
 */

import bcrypt from 'bcryptjs';
import { ValidationError } from '../core/errors/validation-error.js';
import { 
    findUserByEmail, 
    createUser, 
    validateUserPassword, 
    updateUserProfile, 
    changeUserPassword, 
    updateUserPassword 
} from '../repositories/auth.repository.js';

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
 * Registra un nuevo usuario
 * @param {object} userData
 * @returns {object} Usuario creado
 * @throws {ValidationError} Si el email ya está registrado
 */
export const registerUser = async (userData) => {
    const { nombre, apellidos, email, telefono, password, tipo, programa, facultad, unidad } = userData;
    
    // Verificar si el usuario ya existe
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        throw new ValidationError('El email ya está registrado');
    }
    
    // Validar datos según tipo de usuario
    if (tipo === 'estudiante' && !programa) {
        throw new ValidationError('El programa es requerido para estudiantes');
    }
    
    if (tipo === 'docente' && !unidad) {
        throw new ValidationError('La unidad académica es requerida para docentes');
    }
    
    if (tipo === 'secretaria' && !facultad) {
        throw new ValidationError('La facultad es requerida para secretarías académicas');
    }
    
    // Crear usuario (el repositorio maneja el hashing si es necesario)
    const newUser = await createUser({
        nombre,
        apellidos,
        email,
        telefono,
        password,
        tipo,
        programa,
        facultad,
        unidad
    });
    
    return newUser;
};

/**
 * Actualiza el perfil de un usuario autenticado
 * @param {number} userId - ID del usuario
 * @param {object} profileData - Datos del perfil a actualizar
 * @returns {object} Usuario actualizado
 */
export const updateProfile = async (userId, profileData) => {
    const { nombre, apellidos, email, telefono } = profileData;
    
    // Verificar si el nuevo email ya está siendo usado por otro usuario
    if (email) {
        const existingUser = await findUserByEmail(email);
        if (existingUser && existingUser.idUsuario !== parseInt(userId)) {
            throw new ValidationError('El email ya está siendo usado por otro usuario');
        }
    }
    
    // Validar que al menos un campo esté presente
    if (!nombre && !apellidos && !email && !telefono) {
        throw new ValidationError('Al menos un campo debe ser proporcionado para actualizar');
    }
    
    const updatedUser = await updateUserProfile(userId, {
        nombre,
        apellidos,
        email,
        telefono
    });
    
    return updatedUser;
};

/**
 * Cambia la contraseña de un usuario autenticado
 * @param {number} userId - ID del usuario
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {boolean} true si se cambió exitosamente
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
    // Validaciones básicas
    if (!currentPassword || !newPassword) {
        throw new ValidationError('Se requiere la contraseña actual y la nueva contraseña');
    }
    
    if (newPassword.length < 6) {
        throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
    }
    
    if (currentPassword === newPassword) {
        throw new ValidationError('La nueva contraseña debe ser diferente a la actual');
    }
    
    // Llamar directamente a changeUserPassword que ya valida la contraseña actual
    // No necesitamos verificar el usuario por email aquí
    const result = await changeUserPassword(userId, currentPassword, newPassword);
    return result;
};

/**
 * Cambia la contraseña de un usuario por recuperación (sin requerir la contraseña actual)
 * @param {number} userId - ID del usuario
 * @param {string} newPassword - Nueva contraseña
 * @returns {boolean} true si se cambió exitosamente
 */
export const resetUserPassword = async (userId, newPassword) => {
    // Validaciones básicas
    if (!newPassword) {
        throw new ValidationError('La nueva contraseña es requerida');
    }
    
    if (newPassword.length < 6) {
        throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
    }
    
    // Para recuperación de contraseña, usar directamente updateUserPassword
    const result = await updateUserPassword(userId, newPassword);
    return result;
};

/**
 * Valida si una contraseña es correcta para un usuario
 * @param {number} userId - ID del usuario
 * @param {string} password - Contraseña a validar
 * @returns {boolean} true si la contraseña es correcta
 */
export const validatePassword = async (userId, password) => {
    return await validateUserPassword(userId, password);
};

/**
 * Obtiene un usuario por email (sin datos sensibles)
 * @param {string} email - Email del usuario
 * @returns {object|null} Usuario sin contraseña
 */
export const getUserByEmail = async (email) => {
    const user = await findUserByEmail(email);
    if (!user) {
        return null;
    }
    
    // Remover datos sensibles
    const { clave, ...safeUserData } = user;
    return safeUserData;
};

/**
 * Verifica si un email ya está registrado
 * @param {string} email - Email a verificar
 * @returns {boolean} true si el email ya existe
 */
export const emailExists = async (email) => {
    const user = await findUserByEmail(email);
    return !!user;
};