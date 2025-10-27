// src/routes/events.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/events.controller.js';
import * as eventInstCtrl from '../controllers/eventInstallation.controller.js';
import { uploadAny } from '../core/middlewares/upload.js';

const router = Router();

// Rutas existentes
router.get('/', ctrl.getAll);

// Endpoint específico para secretarias (debe ir ANTES de '/:id' para evitar conflictos)
router.get('/for-secretaria', ctrl.getEventsForSecretaria);

// Endpoint detallado para revisar un evento (no reemplaza el getById)
router.get('/:id/details', ctrl.getByIdDetailed);

// Rutas por id (mantener después de las rutas específicas)
router.get('/:id', ctrl.getById);
router.get('/:id/instalaciones', eventInstCtrl.getByEvent); // opcional

router.post('/', (req, res, next) => {
  uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, ctrl.create);

// Endpoint para evaluar eventos (aprobar/rechazar)
router.post('/evaluate', (req, res, next) => {
  uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, ctrl.evaluateEvent);

router.put('/:id', (req, res, next) => {
  uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, ctrl.update);

router.delete('/:id', ctrl.remove);

// Endpoint para enviar evento a revision (actualiza estado de registrado a enRevision)
router.post('/:id/send', ctrl.sendEvent);

export { router as eventsRouter };
