// src/modules/auth/auth.routes.js
import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import { loginUser, registerUser, getCurrentUser } from './auth.controller.js';
import { validateLogin, validateRegister } from './auth.validation.js';

const router = Router();

router.post('/login', validateLogin, asyncHandler(loginUser));
router.post('/register', validateRegister, asyncHandler(registerUser));
router.get('/me', asyncHandler(getCurrentUser));

// <-- Mueve este bloque arriba
router.post('/recover-password', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email y nueva contraseña requeridos' });
  }
  const pool = (await import('../../db/pool.js')).default;
  // Buscar el usuario
  const [users] = await pool.execute('SELECT idUsuario FROM usuario WHERE email = ?', [email]);
  if (!users[0]) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  const userId = users[0].idUsuario;
  // Inactivar contraseñas anteriores
  await pool.execute('UPDATE contraseña SET estado = "inactiva" WHERE idUsuario = ?', [userId]);
  // Insertar nueva contraseña como activa
  await pool.execute(
    'INSERT INTO contraseña (idUsuario, fechaCambio, clave, estado) VALUES (?, CURDATE(), ?, "activa")',
    [userId, password]
  );
  res.json({ success: true, message: 'Contraseña actualizada' });
}));

export const authRouter = router;