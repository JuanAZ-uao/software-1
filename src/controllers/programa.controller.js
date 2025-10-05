import * as programaService from '../services/programa.service.js';

export const getProgramas = async (_req, res) => {
  const programas = await programaService.listProgramas();
  res.json(programas);
};

export const getProgramaById = async (req, res) => {
  const { id } = req.params;
  const programa = await programaService.getPrograma(Number(id));
  res.json(programa);
};

export const getProgramasByFacultad = async (req, res) => {
  const { idFacultad } = req.params;
  const programas = await programaService.listProgramasByFacultad(Number(idFacultad));
  res.json(programas);
};
