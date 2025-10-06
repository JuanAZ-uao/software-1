import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
    authenticate, 
    registerUser as registerUserService, 
    updateProfile as updateProfileService, 
    changePassword as changePasswordService 
} from '../services/auth.service.js';
import { findUserByEmail, updateUserPassword } from '../repositories/auth.repository.js';

// Almacén temporal de tokens (en memoria, solo para pruebas)
const passwordResetTokens = {}; // { email: { token: 'ABCD', expires: Date } }

// Función para generar token de 4 caracteres
function generate4CharToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 4; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Endpoint para solicitar recuperación de contraseña (genera token de 4 caracteres)
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        // Por seguridad, responde igual aunque no exista
        return res.json({ success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' });
    }
    // Generar token de 4 caracteres y guardar en memoria con expiración de 15 minutos
    const token = generate4CharToken();
    passwordResetTokens[email] = {
        token,
        expires: Date.now() + 15 * 60 * 1000 // 15 minutos
    };

    // Mostrar el token en la terminal (en producción deberías enviarlo por email)
    console.log('\n=== TOKEN DE RECUPERACIÓN DE CONTRASEÑA ===');
    console.log('Email:', email);
    console.log('Token:', token);
    console.log('==========================================\n');

    res.json({
        success: true,
        message: 'Token de recuperación generado. Revisa la terminal del servidor para continuar.'
    });
};

/**
 * Endpoint para cambiar la contraseña usando el token de 4 caracteres
 */
export const resetPassword = async (req, res) => {
    const { email, token, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
    }
    const record = passwordResetTokens[email];
    if (!record || record.token !== token || Date.now() > record.expires) {
        return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }
    await updateUserPassword(user.idUsuario, password); // Sin hash por consistencia
    // Elimina el token después de usarlo
    delete passwordResetTokens[email];
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
};

/**
 * Endpoint para validar token de recuperación antes de permitir cambio de contraseña
 */
export const validateToken = async (req, res) => {
    const { email, token } = req.body;
    const record = passwordResetTokens[email];
    if (!record || record.token !== token || Date.now() > record.expires) {
        return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }
    res.json({ success: true });
};

/**
 * Endpoint para login
 */
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await authenticate(email, password);
        res.json({ success: true, user });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
};

/**
 * Endpoint para registro
 */
export const registerUser = async (req, res) => {
    try {
        const user = await registerUserService(req.body);
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

/**
 * Obtiene el usuario actual (simulado por ahora)
 */
export const getCurrentUser = async (req, res) => {
    try {
        // Por ahora devolvemos un usuario simulado
        // En una implementación real, obtendrías el userId del token JWT
        const mockUser = {
            id: '1',
            idUsuario: 1, // Agregado para compatibilidad
            nombre: 'Usuario',
            apellidos: 'De Prueba',
            email: 'usuario@universidad.edu',
            telefono: '1234567890',
            tipo: 'estudiante'
        };
        
        res.json({
            success: true,
            user: mockUser
        });
    } catch (error) {
        console.error('Error en getCurrentUser:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información del usuario'
        });
    }
};

/**
 * Actualiza el perfil del usuario
 */
export const updateProfile = async (req, res) => {
    try {
        const { userId, nombre, apellidos, email, telefono } = req.body;
        
        console.log('🔄 Recibiendo actualización de perfil:', { userId, nombre, apellidos, email, telefono });
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario es requerido'
            });
        }

        const updatedUser = await updateProfileService(userId, {
            nombre,
            apellidos,
            email,
            telefono
        });
        
        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error en updateProfile:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cambia la contraseña del usuario
 */
export const changePassword = async (req, res) => {
    try {
        const { userId, currentPassword, newPassword, confirmPassword } = req.body;
        
        console.log('🔄 Recibiendo cambio de contraseña para usuario:', userId);
        
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Validar confirmación de contraseña si se proporciona
        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Las contraseñas no coinciden'
            });
        }

        await changePasswordService(userId, currentPassword, newPassword);
        
        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error en changePassword:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};