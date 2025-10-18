// src/routes/organizationEvent.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/organizationEvent.controller.js';
const router = Router();

// listar relaciones de una evento
router.get('/event/:eventId', ctrl.getByEvent);

// crear vínculo (body JSON)
router.post('/', ctrl.createLink);

// eliminar todos vínculos por evento
router.delete('/event/:eventId', ctrl.deleteByEvent);

export { router as organizationEventRouter };
