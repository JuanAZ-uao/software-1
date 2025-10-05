import * as facultadService from '../services/facultad.service.js';

export const getFacultades = async (_req, res) => {
  const facultades = await facultadService.listFacultades();
  res.json(facultades);
};

export const getFacultadById = async (req, res) => {
  const { id } = req.params;
  const facultad = await facultadService.getFacultad(Number(id));
  res.json(facultad);
};

export const postFacultad = async (req, res) => {
  const { nombre } = req.body;
  const created = await facultadService.createFacultad(nombre);
  res.status(201).json(created);
};
