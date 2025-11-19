import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { authenticate, registerUser as registerUserService } from '../services/auth.service.js';
import { findUserByEmail, updateUserPassword } from '../repositories/auth.repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Configurar Gmail API
const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

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
    
    // Generar token JWT
    const token = jwt.sign(
        { 
            id: user.idUsuario,
            email: user.email,
            tipo: user.tipo 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    res.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
            id: user.idUsuario,
            name: `${user.nombre} ${user.apellidos}`,
            email: user.email,
            nombre: user.nombre,
            apellidos: user.apellidos,
            documento: user.documento,
            telefono: user.telefono,
            tipo: user.tipo || 'usuario',
            token
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
        console.log('🔔 registerUser payload:', userData);
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
 * Endpoint para solicitar recuperación de contraseña (envía email REAL con Gmail API)
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await findUserByEmail(email);
        
        if (!user) {
            // Por seguridad, responde igual aunque no exista
            return res.json({ 
                success: true, 
                message: 'Si el email existe, recibirás un enlace de recuperación en tu bandeja de entrada.' 
            });
        }

        // Generar token JWT con expiración de 15 minutos
        const resetToken = jwt.sign({ 
            email, 
            userId: user.idUsuario,
            timestamp: Date.now()
        }, JWT_SECRET, { expiresIn: '15m' });

        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

        // Crear el mensaje de email HTML
        const emailSubject = '🔐 Recuperación de Contraseña - Universidad Connect';
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #4f46e5; margin: 0;">Universidad Connect</h1>
                        <p style="color: #666; margin: 5px 0;">Sistema de Gestión de Eventos</p>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 20px;">🔑 Recuperación de Contraseña</h2>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        Hola <strong>${user.nombre} ${user.apellidos}</strong>,
                    </p>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. 
                        Si no fuiste tú quien hizo esta solicitud, puedes ignorar este email.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #4f46e5; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;
                                  display: inline-block;">
                            🔐 Restablecer Contraseña
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⚠️ <strong>Importante:</strong> Este enlace expirará en <strong>15 minutos</strong> por seguridad.
                            Si no lo usas dentro de este tiempo, tendrás que solicitar uno nuevo.
                        </p>
                    </div>
                    
                    <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                        <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
                    </p>
                    
                    <p style="color: #888; font-size: 12px; margin-top: 15px;">
                        Este email fue enviado automáticamente desde Universidad Connect. Por favor no respondas a este mensaje.
                    </p>
                </div>
            </div>
        `;

        // Preparar el email para Gmail API
        const message = [
            `To: ${email}`,
            `Subject: ${emailSubject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            emailBody
        ].join('\n');

        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        // Enviar email usando Gmail API
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });

        console.log(`✅ Email de recuperación enviado a: ${email}`);
        console.log(`🔗 Token generado (válido por 15 min): ${resetToken}`);

        res.json({
            success: true,
            message: 'Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada y spam. El enlace expirará en 15 minutos.'
        });

    } catch (error) {
        console.error('❌ Error enviando email de recuperación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el email de recuperación. Inténtalo de nuevo.'
        });
    }
};

/**
 * Endpoint para cambiar la contraseña usando el token
 */
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    
    // Validar nueva contraseña con los requisitos de seguridad
    if (!isValidPassword(password)) {
        return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 6 caracteres, una mayúscula y un carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?")'
        });
    }
    
    try {
        // Verificar el token JWT
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await findUserByEmail(payload.email);
        
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        // Usar la función que encripta automáticamente
        await updateUserPassword(user.idUsuario, password);
        
        console.log(`✅ Contraseña actualizada para usuario: ${user.email}`);
        
        res.json({ 
            success: true, 
            message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.' 
        });
        
    } catch (err) {
        console.error('❌ Error en resetPassword:', err);
        
        if (err.name === 'TokenExpiredError') {
            res.status(400).json({ 
                success: false, 
                message: 'El enlace de recuperación ha expirado (15 minutos). Solicita uno nuevo.' 
            });
        } else if (err.name === 'JsonWebTokenError') {
            res.status(400).json({ 
                success: false, 
                message: 'Enlace de recuperación inválido.' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error al restablecer la contraseña. Inténtalo de nuevo.' 
            });
        }
    }
};

/**
 * Función auxiliar para validar contraseña con los nuevos requisitos de seguridad
 */
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