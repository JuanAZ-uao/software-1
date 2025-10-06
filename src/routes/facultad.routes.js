import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { getFacultades, getFacultadById, postFacultad } from '../controllers/facultad.controller.js';

const router = Router();

router.get('/', asyncHandler(getFacultades));
router.get('/:id', asyncHandler(getFacultadById));
router.post('/', asyncHandler(postFacultad));

export default router;
