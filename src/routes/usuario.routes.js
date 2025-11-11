// src/routes/usuario.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/usuario.controller.js';

const router = Router();

// GET /api/usuarios?q=&page=&limit=
router.get('/', ctrl.listar);

// GET /api/usuarios/:id
router.get('/:id', ctrl.obtenerPorId);

export { router as usuarioRouter };
