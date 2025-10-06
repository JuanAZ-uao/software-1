import { Router } from 'express';
import { asyncHandler } from '../core/middlewares/async-handler.js';
import {
  listEventos,
  getEvento,
  createEvento,
  updateEvento,
  deleteEvento
} from '../controllers/evento.controller.js';

const router = Router();

router.get('/', asyncHandler(listEventos));           // Listar todos los eventos
router.get('/:id', asyncHandler(getEvento));          // Obtener evento por ID
router.post('/', asyncHandler(createEvento));         // Crear evento
router.put('/:id', asyncHandler(updateEvento));       // Editar evento
router.delete('/:id', asyncHandler(deleteEvento));    // Eliminar evento

export default router;