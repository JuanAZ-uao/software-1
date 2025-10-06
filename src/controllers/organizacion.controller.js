import * as organizacionRepo from '../repositories/organizacion.repository.js';

export const listOrganizaciones = async (_req, res) => {
  const orgs = await organizacionRepo.findAll();
  res.json({ data: orgs });
};

export const createOrganizacion = async (req, res) => {
  const org = await organizacionRepo.create(req.body);
  res.status(201).json({ data: org });
};