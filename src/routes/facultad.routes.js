import { Router } from 'express';

const router = Router();

const facultades = [
  { id: 1, nombre: 'Facultad de Ingeniería' },
  { id: 2, nombre: 'Facultad de Ciencias' },
  { id: 3, nombre: 'Facultad de Derecho' }
];

router.get('/', (req, res) => {
  res.json(facultades);
});

export default router;
