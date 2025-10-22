import { google } from 'googleapis';

// Configurar Gmail API usando las credenciales del .env
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
 * Envía un correo de bienvenida al usuario recién registrado
 * @param {object} user - Datos del usuario registrado
 */
export const sendWelcomeEmail = async (user) => {
    try {
        const emailSubject = '🎉 ¡Bienvenido a Universidad Connect!';
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #4f46e5; margin: 0;">🎓 Universidad Connect</h1>
                        <p style="color: #666; margin: 5px 0;">Sistema de Gestión de Eventos</p>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 20px;">¡Bienvenido a nuestra plataforma!</h2>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        Hola <strong>${user.nombre} ${user.apellidos}</strong>,
                    </p>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        ¡Tu registro en Universidad Connect ha sido realizado exitosamente! 🎉
                    </p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
                        <h3 style="color: #4f46e5; margin: 0 0 10px 0;">📋 Detalles de tu cuenta:</h3>
                        <ul style="color: #555; margin: 0; padding-left: 20px;">
                            <li><strong>Email:</strong> ${user.email}</li>
                            <li><strong>Documento:</strong> ${user.documento}</li>
                            <li><strong>Tipo de usuario:</strong> ${user.tipo === 'estudiante' ? 'Estudiante' : user.tipo === 'docente' ? 'Docente' : 'Secretaría Académica'}</li>
                            <li><strong>Teléfono:</strong> ${user.telefono}</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                            ✅ <strong>¡Ya puedes iniciar sesión!</strong> Usa tu email y contraseña para acceder a la plataforma.
                        </p>
                    </div>
                    
                    <h3 style="color: #333; margin-top: 30px;">🚀 ¿Qué puedes hacer ahora?</h3>
                    <ul style="color: #555; line-height: 1.6;">
                        <li>📅 Crear y gestionar eventos académicos y lúdicos</li>
                        <li>🏢 Registrar organizaciones participantes</li>
                        <li>📊 Consultar tu calendario de eventos</li>
                        <li>📋 Gestionar tu perfil y configuración</li>
                        <li>🔔 Recibir notificaciones importantes</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000" 
                           style="background-color: #4f46e5; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;
                                  display: inline-block;">
                            🚀 Acceder a Universidad Connect
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            💡 <strong>Tip:</strong> Completa tu perfil y explora todas las funcionalidades disponibles.
                            Si necesitas ayuda, no dudes en contactar al equipo de soporte.
                        </p>
                    </div>
                    
                    <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                        Gracias por unirte a Universidad Connect. ¡Esperamos que tengas una excelente experiencia! 🎓
                    </p>
                    
                    <p style="color: #888; font-size: 12px; margin-top: 15px;">
                        Este email fue enviado automáticamente desde Universidad Connect. Por favor no respondas a este mensaje.
                    </p>
                </div>
            </div>
        `;

        // Preparar el email para Gmail API
        const message = [
            `To: ${user.email}`,
            `Subject: ${emailSubject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            emailBody
        ].join('\n');

        const encodedMessage = Buffer.from(message).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Enviar email usando Gmail API
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });

        console.log(`✅ Email de bienvenida enviado a: ${user.email}`);
        return true;

    } catch (error) {
        console.error('❌ Error enviando email de bienvenida:', error);
        // No lanzar error para no interrumpir el registro
        return false;
    }
};

/**
 * Envía un correo de notificación a administradores sobre nuevo registro
 * @param {object} user - Datos del usuario registrado
 */
export const sendNewUserNotificationToAdmin = async (user) => {
    try {
        const adminEmail = process.env.GMAIL_USER_EMAIL; // Email del admin desde .env
        
        const emailSubject = `📋 Nuevo Usuario Registrado - ${user.nombre} ${user.apellidos}`;
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4f46e5;">🆕 Nuevo Usuario Registrado</h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <p><strong>Nombre:</strong> ${user.nombre} ${user.apellidos}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Documento:</strong> ${user.documento}</p>
                    <p><strong>Tipo:</strong> ${user.tipo}</p>
                    <p><strong>Teléfono:</strong> ${user.telefono}</p>
                    <p><strong>Fecha de registro:</strong> ${new Date().toLocaleString('es-CO')}</p>
                </div>
            </div>
        `;

        const message = [
            `To: ${adminEmail}`,
            `Subject: ${emailSubject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            emailBody
        ].join('\n');

        const encodedMessage = Buffer.from(message).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });

        console.log(`✅ Notificación de admin enviada para nuevo usuario: ${user.email}`);
        return true;

    } catch (error) {
        console.error('❌ Error enviando notificación de admin:', error);
        return false;
    }
};