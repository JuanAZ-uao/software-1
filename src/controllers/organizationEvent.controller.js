// src/controllers/organizationEvent.controller.js
import * as svc from '../services/organizationEvent.service.js';

export async function getByEvent(req, res) {
  try {
    const eventId = req.params.eventId;
    const list = await svc.findByEvent(eventId);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo relaciones organización-evento' });
  }
}

export async function createLink(req, res) {
  try {
    const payload = req.body;
    // payload: { idOrganizacion, idEvento, participante, esRepresentanteLegal, certificadoParticipacion }
    const created = await svc.linkOrganizationToEvent(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error creando vínculo' });
  }
}

export async function deleteByEvent(req, res) {
  try {
    const eventId = req.params.eventId;
    const affected = await svc.unlinkByEvent(eventId);
    res.json({ deleted: affected });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando vínculos' });
  }
}
