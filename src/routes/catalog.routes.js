import { Router } from 'express';

const router = Router();

const programas = [
  { idPrograma: 1, nombre: 'Ingeniería de Sistemas' },
  { idPrograma: 2, nombre: 'Ingeniería Civil' },
  { idPrograma: 3, nombre: 'Matemáticas' },
  { idPrograma: 4, nombre: 'Física' },
  { idPrograma: 5, nombre: 'Administración de Empresas' },
  { idPrograma: 6, nombre: 'Psicología' }
];

const facultades = [
  { idFacultad: 1, nombre: 'Ingeniería' },
  { idFacultad: 2, nombre: 'Ciencias' },
  { idFacultad: 3, nombre: 'Administración' },
  { idFacultad: 4, nombre: 'Humanidades' }
];

const unidades = [
  { idUnidad: 1, nombre: 'Departamento de Ingeniería' },
  { idUnidad: 2, nombre: 'Departamento de Ciencias Exactas' },
  { idUnidad: 3, nombre: 'Departamento de Negocios' },
  { idUnidad: 4, nombre: 'Departamento de Comunicación Social' }
];

router.get('/programas', (req, res) => {
  res.json(programas);
});

router.get('/facultades', (req, res) => {
  res.json(facultades);
});

router.get('/unidades', (req, res) => {
  res.json(unidades);
});

export default router;