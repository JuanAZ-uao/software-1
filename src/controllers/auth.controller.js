import jwt from 'jsonwebtoken';
import { authenticate, registerUser as registerUserService } from '../services/auth.service.js';
import { findUserByEmail, updateUserPassword } from '../repositories/auth.repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'; // Pon esto en tu .env

/**
 * Controlador para obtener el usuario actual (requiere autenticación)
 * Por ahora retorna error (no implementado)
 */
export const getCurrentUser = async (req, res) => {
    res.status(401).json({
        success: false,
        message: 'No autorizado'
    });
};

/**
 * Controlador para login de usuario
 * Llama al servicio authenticate y responde con los datos del usuario
 */
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await authenticate(email, password);
    res.json({
        success: true,
        message: 'Login exitoso',
        user: {
            id: user.idUsuario,
            name: `${user.nombre} ${user.apellidos}`,
            email: user.email,
            telefono: user.telefono,
            tipo: user.tipo || 'usuario'
        }
    });
};

/**
 * Controlador para registro de usuario
 * Llama al servicio registerUser y responde con los datos del nuevo usuario
 */
export const registerUser = async (req, res) => {
    const userData = req.body;
    try {
        const newUser = await registerUserService(userData);
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.idUsuario,
                name: `${newUser.nombre} ${newUser.apellidos}`,
                email: newUser.email,
                telefono: newUser.telefono,
                tipo: newUser.tipo
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Endpoint para solicitar recuperación de contraseña (muestra token en terminal)
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        // Por seguridad, responde igual aunque no exista
        return res.json({ success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' });
    }
    // Generar token JWT con expiración corta
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    // Mostrar el token y el enlace en la terminal
    console.log('\n=== TOKEN DE RECUPERACIÓN DE CONTRASEÑA ===');
    console.log('Token:', token);
    console.log('Enlace:', resetLink);
    console.log('==========================================\n');

    res.json({
        success: true,
        message: 'Token de recuperación generado. Revisa la terminal del servidor para continuar.'
    });
};

/**
 * Endpoint para cambiar la contraseña usando el token
 */
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await findUserByEmail(payload.email);
        if (!user) throw new Error('Usuario no encontrado');
        await updateUserPassword(user.idUsuario, password);
        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }
};