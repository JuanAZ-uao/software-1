import * as eventoRepo from '../repositories/evento.repository.js';

export const listEventos = async (_req, res) => {
  const eventos = await eventoRepo.findAll();
  res.json({ data: eventos });
};

export const getEvento = async (req, res) => {
  const evento = await eventoRepo.findById(req.params.id);
  if (!evento) {
    return res.status(404).json({ message: 'Evento no encontrado' });
  }
  res.json({ data: evento });
};

export const createEvento = async (req, res) => {
  const evento = await eventoRepo.create(req.body);
  res.status(201).json({ data: evento });
};

export const updateEvento = async (req, res) => {
  const evento = await eventoRepo.update(req.params.id, req.body);
  res.json({ data: evento });
};

export const deleteEvento = async (req, res) => {
  await eventoRepo.remove(req.params.id);
  res.status(204).send();
};