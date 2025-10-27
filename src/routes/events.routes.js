// src/routes/events.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import * as eventInstCtrl from '../controllers/eventInstallation.controller.js';
import { uploadAny } from '../core/middlewares/upload.js';

const router = Router();

function handleUpload(req, res, next) {
  uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.get('/', ctrl.getAll);
router.get('/for-secretaria', ctrl.getEventsForSecretaria);

// multipart endpoints (create, evaluate)
router.post('/', handleUpload, ctrl.create);
router.post('/evaluate', handleUpload, ctrl.evaluateEvent);

// resource-specific endpoints (after explicit paths)
router.get('/:id', ctrl.getById);
router.get('/:id/instalaciones', eventInstCtrl.getByEvent);

router.put('/:id', handleUpload, ctrl.update);
router.delete('/:id', ctrl.remove);

export { router as eventsRouter };
