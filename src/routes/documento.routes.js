import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import {
  getAllDocumentos,
  validateDocumentoDisponible
} from '../controllers/documento.controller.js';

const router = Router();

/**
 * GET /api/documentos
 * Lista todos los documentos registrados
 */
router.get('/', asyncHandler(getAllDocumentos));

/**
 * GET /api/documentos/validar/:id
 * Verifica si el documento existe y no ha sido usado por otro usuario
 */
router.get('/validar/:id', asyncHandler(validateDocumentoDisponible));

export  {router as documentoRoutes };