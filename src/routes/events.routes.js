// src/routes/events.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import * as eventInstCtrl from '../controllers/eventInstallation.controller.js';
import { uploadAny } from '../core/middlewares/upload.js';
const router = Router();

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/instalaciones', eventInstCtrl.getByEvent); // opcional

router.post('/', (req, res, next) => {
  uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, ctrl.create);

router.put('/:id', (req, res, next) => {
  uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, ctrl.update);

router.delete('/:id', ctrl.remove);

export { router as eventsRouter };
