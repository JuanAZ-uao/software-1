// src/routes/aval.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/aval.controller.js';
const router = Router();

router.get('/event/:eventId', ctrl.getByEvent);

export { router as avalRouter };
