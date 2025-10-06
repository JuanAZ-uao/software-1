// src/routes/events.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import { uploadFields } from '../core/middlewares/upload.js';
const router = Router();

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// uso de uploadFields y manejo de errores multer
router.post('/', (req, res, next) => uploadFields(req, res, (err) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
}), ctrl.create);

router.put('/:id', (req, res, next) => uploadFields(req, res, (err) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
}), ctrl.update);

router.delete('/:id', ctrl.remove);

export { router as eventsRouter };
