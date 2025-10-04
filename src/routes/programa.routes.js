import { Router } from 'express';

const router = Router();

const programas = [
  { id: 1, nombre: 'Ingeniería de Sistemas' },
  { id: 2, nombre: 'Administración' },
  { id: 3, nombre: 'Derecho' }
];

router.get('/', (req, res) => {
  res.json(programas);
});

export default router;