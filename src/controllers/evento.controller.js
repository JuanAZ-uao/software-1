import * as eventoRepo from '../repositories/evento.repository.js';

export const listEventos = async (_req, res) => {
  const eventos = await eventoRepo.findAll();
  res.json({ data: eventos });
};

export const createEvento = async (req, res) => {
  const evento = await eventoRepo.create(req.body);
  res.status(201).json({ data: evento });
};