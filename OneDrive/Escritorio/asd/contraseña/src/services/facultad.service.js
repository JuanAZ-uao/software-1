import * as facultadRepo from '../repositories/facultad.repository.js';

export const listFacultades = async () => {
  return facultadRepo.getAllFacultades();
};

export const getFacultad = async (id) => {
  const f = await facultadRepo.getFacultadById(id);
  if (!f) {
    const err = new Error('Facultad no encontrada');
    err.status = 404;
    throw err;
  }
  return f;
};

export const createFacultad = async (nombre) => {
  return facultadRepo.createFacultad(nombre);
};
