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
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email es requerido' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
        return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
    }
    const record = passwordResetTokens[email];
    if (!record || record.token !== token || Date.now() > record.expires) {
        return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUserPassword(user.idUsuario, password);
    // Elimina el token después de usarlo
    delete passwordResetTokens[email];
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
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
export const validateToken = async (req, res) => {
  const { email, token } = req.body;
  const record = passwordResetTokens[email];
  if (!record || record.token !== token || Date.now() > record.expires) {
    return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
  }
  res.json({ success: true });
};