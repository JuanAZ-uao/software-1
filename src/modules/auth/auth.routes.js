// src/modules/auth/auth.routes.js
/**
 * auth.routes.js - Rutas de autenticación
 *
 * Define los endpoints HTTP para autenticación:
 * - POST /login: Login de usuario
 * - POST /register: Registro de usuario
 * - GET /me: Obtener usuario actual (requiere autenticación)
 *
 * Usa middlewares de validación y manejo de errores asíncronos.
 */

import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import { loginUser, registerUser, getCurrentUser } from './auth.controller.js';
import { validateLogin, validateRegister } from './auth.validation.js';

const router = Router();

// Endpoint para login
router.post('/login', validateLogin, asyncHandler(loginUser));
// Endpoint para registro
router.post('/register', validateRegister, asyncHandler(registerUser));
// Endpoint para obtener usuario actual
router.get('/me', asyncHandler(getCurrentUser));

export const authRouter = router;