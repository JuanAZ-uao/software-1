import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { createOrganizacion, listOrganizaciones, updateOrganizacion } from '../controllers/organizacion.controller.js';

const router = Router();

router.get('/', asyncHandler(listOrganizaciones));
router.post('/', asyncHandler(createOrganizacion));
router.put('/:id', asyncHandler(updateOrganizacion));

export default router;