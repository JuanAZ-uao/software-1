import * as unidadService from '../services/unidad.service.js';

export const getUnidades = async (_req, res) => {
  const unidades = await unidadService.listUnidades();
  res.json(unidades);
};

export const getUnidadById = async (req, res) => {
  const { id } = req.params;
  const unidad = await unidadService.getUnidad(Number(id));
  res.json(unidad);
};

export const getUnidadesByFacultad = async (req, res) => {
  const { idFacultad } = req.params;
  const unidades = await unidadService.listUnidadesByFacultad(Number(idFacultad));
  res.json(unidades);
};
