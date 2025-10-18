// src/controllers/eventInstallation.controller.js
import * as svc from '../services/eventInstallation.service.js';

export async function getByEvent(req, res) {
  try {
    const eventId = req.params.eventId;
    const rows = await svc.findByEvent(eventId);
    res.json(rows);
  } catch (err) {
    console.error('eventInstallation.getByEvent error:', err);
    res.status(500).json({ error: 'Error obteniendo instalaciones del evento' });
  }
}
