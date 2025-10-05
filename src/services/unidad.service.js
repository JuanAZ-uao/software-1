import * as unidadRepo from '../repositories/unidad.repository.js';

export const listUnidades = async () => {
  return unidadRepo.getAllUnidades();
};

export const getUnidad = async (id) => {
  const u = await unidadRepo.getUnidadById(id);
  if (!u) {
    const err = new Error('Unidad no encontrada');
    err.status = 404;
    throw err;
  }
  return u;
};

export const listUnidadesByFacultad = async (idFacultad) => {
  return unidadRepo.getUnidadesByFacultad(idFacultad);
};
