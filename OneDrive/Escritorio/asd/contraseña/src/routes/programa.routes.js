import { Router } from 'express';
import pool from '../db/pool.js';
import * as programaRepo from '../repositories/programa.repository.js';

const programas = [
  { id: 1, nombre: 'Ingeniería de Sistemas' },
  { id: 2, nombre: 'Administración' },
  { id: 3, nombre: 'Derecho' }
];

const router = Router();

import { asyncHandler } from '../core/middlewares/async-handler.js';
import { getProgramas, getProgramaById, getProgramasByFacultad } from '../controllers/programa.controller.js';

router.get('/', asyncHandler(getProgramas));
router.get('/:id', asyncHandler(getProgramaById));
router.get('/by-facultad/:idFacultad', asyncHandler(getProgramasByFacultad));

export default router;