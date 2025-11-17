// src/routes/usuario.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/usuario.controller.js';
import { requireAuth } from '../core/middlewares/auth.middleware.js';

const router = Router();

// GET /api/usuarios?q=&page=&limit=
router.get('/', ctrl.listar);

// GET /api/usuarios/:id
router.get('/:id', ctrl.obtenerPorId);

// GET /api/usuarios/me - obtener datos del usuario autenticado
router.get('/me', requireAuth, ctrl.obtenerMe);

// PUT /api/usuarios/me - actualizar datos del usuario autenticado
router.put('/me', requireAuth, ctrl.actualizarMe);

export { router as usuarioRouter };
