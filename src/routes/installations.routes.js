// routes/installations.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/installations.controller.js';
const router = Router();

router.get('/', ctrl.getAll);

export { router as installationsRouter };
