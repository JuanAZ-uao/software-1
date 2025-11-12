// src/routes/events.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import * as eventInstCtrl from '../controllers/eventInstallation.controller.js';
import { uploadAny } from '../core/middlewares/upload.js';

const router = Router();

router.get('/approved', ctrl.getApprovedEvents);
router.get('/', ctrl.getAll);
router.get('/for-secretaria', ctrl.getEventsForSecretaria);
router.get('/:id/details', ctrl.getByIdDetailed);
router.get('/:id', ctrl.getById);
router.get('/:id/instalaciones', eventInstCtrl.getByEvent);

// multer aplicado también en PUT para que req.files y req.body estén disponibles
router.post('/', uploadAny, (req, res, next) => { next(); }, ctrl.create);
router.put('/:id', uploadAny, (req, res, next) => { next(); }, ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/send', ctrl.sendEvent);

export { router as eventsRouter };
