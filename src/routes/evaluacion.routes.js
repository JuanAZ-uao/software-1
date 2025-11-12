// src/routes/evaluacion.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/evaluacion.controller.js';
import { uploadAny } from '../core/middlewares/upload.js';

const router = Router();

// Crear evaluación (multipart para acta)
router.post('/', uploadAny, ctrl.crearEvaluacion);

// Exportar router
export { router as evaluacionRouter };
