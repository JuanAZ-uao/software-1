import * as programaRepo from '../repositories/programa.repository.js';

export const listProgramas = async () => {
  return programaRepo.getAllProgramas();
};

export const getPrograma = async (id) => {
  const p = await programaRepo.getProgramaById(id);
  if (!p) {
    const err = new Error('Programa no encontrado');
    err.status = 404;
    throw err;
  }
  return p;
};

export const listProgramasByFacultad = async (idFacultad) => {
  return programaRepo.getProgramasByFacultad(idFacultad);
};
