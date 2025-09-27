/**
 * user.routes.js - Rutas de usuarios
 *
 * Define los endpoints HTTP para gestión de usuarios:
 * - GET /: Listar usuarios
 * - GET /:id: Obtener usuario por ID
 * - POST /: Crear usuario
 * - PUT /:id: Actualizar usuario
 * - DELETE /:id: Eliminar usuario
 *
 * Incluye validaciones y manejo de errores asíncronos.
 */

import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/async-handler.js';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser
} from './user.controller.js';
import { validateCreateUser, validateUpdateUser } from './user.validation.js';
import { loginUser, getCurrentUser } from '../auth/auth.controller.js';

const router = Router();

// Listar usuarios
router.get('/', asyncHandler(listUsers));
// Obtener usuario por ID
router.get('/:id', asyncHandler(getUser));
// Crear usuario
router.post('/', validateCreateUser, asyncHandler(createUser));
// Actualizar usuario
router.put('/:id', validateUpdateUser, asyncHandler(updateUser));
// Eliminar usuario
router.delete('/:id', asyncHandler(deleteUser));
// Login de usuario (delegado a auth)
router.post('/login', asyncHandler(loginUser));
// Obtener usuario actual (delegado a auth)
router.get('/me', asyncHandler(getCurrentUser));

export const usersRouter = router;
