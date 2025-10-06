import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import { createOrganizacion, listOrganizaciones } from '../controllers/organizacion.controller.js';

const router = Router();

router.get('/', asyncHandler(listOrganizaciones));
router.post('/', asyncHandler(createOrganizacion));

export default router;