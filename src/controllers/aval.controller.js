// src/controllers/aval.controller.js
import * as svc from '../services/aval.service.js';

export async function getByEvent(req, res) {
  try {
    const idEvento = req.params.eventId;
    const list = await svc.findByEvent(idEvento);
    res.json(list);
  } catch (err) {
    console.error('aval.controller.getByEvent error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error obteniendo avales' });
  }
}
