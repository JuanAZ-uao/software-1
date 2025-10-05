import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { getUnidades, getUnidadById, getUnidadesByFacultad } from '../controllers/unidad.controller.js';

const router = Router();

router.get('/', asyncHandler(getUnidades));
router.get('/:id', asyncHandler(getUnidadById));
router.get('/by-facultad/:idFacultad', asyncHandler(getUnidadesByFacultad));

export default router;
