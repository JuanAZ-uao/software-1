// src/controllers/organizationEvent.controller.js
import * as svc from '../services/organizationEvent.service.js';

export async function getByEvent(req, res) {
  try {
    const eventId = req.params.eventId;
    const list = await svc.findByEvent(eventId);
    res.json(list);
  } catch (err) {
    console.error('organizationEvent.getByEvent error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error obteniendo relaciones organización-evento' });
  }
}

export async function createLink(req, res) {
  try {
    // Si usas multer para archivos, certificado posiblemente esté en req.file o req.files
    // Controller normaliza payload y pasa certificadoFile si existe
    const payload = { ...req.body };
    // si multer colocó archivo en req.file con campo nombre 'certificado', úsalo:
    if (req.file) payload.certificadoFile = req.file;
    // en algunos flujos certificados por org vienen con nombre certificado_org_<id>, y están en req.files
    // controller simple: si req.files existe y tiene keys, se delega al service y repo desde el frontend (ya se adjunta por sendForm)
    const created = await svc.linkOrganizationToEvent(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error('createLink error:', err);
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
