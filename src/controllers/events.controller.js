// src/controllers/events.controller.js
import * as svc from '../services/events.service.js';
import fs from 'fs';

function mapFilesArrayToDict(filesArray = []) {
  const dict = {};
  for (const f of filesArray) dict[f.fieldname] = dict[f.fieldname] || [];
  for (const f of filesArray) dict[f.fieldname].push(f);
  return dict;
}

export async function getAll(req, res) {
  try {
    const list = await svc.getAllEvents();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
}

export async function getById(req, res) {
  try {
    const ev = await svc.getEventById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(ev);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo evento' });
  }
}

export async function create(req, res) {
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);
    const eventoRaw = req.body.evento;
    if (!eventoRaw) return res.status(400).json({ error: 'Evento no enviado' });
    const payloadEvento = JSON.parse(eventoRaw);
    const tipoAval = req.body.tipoAval;
    if (!tipoAval) return res.status(400).json({ error: 'tipoAval requerido' });

    // organizaciones optional (frontend sends JSON)
    let organizaciones = [];
    if (req.body.organizaciones) {
      try { organizaciones = JSON.parse(req.body.organizaciones); } catch (e) { return res.status(400).json({ error: 'organizaciones JSON inválido' }); }
    }

    // build files map
    const avalFile = (filesDict['avalPdf'] && filesDict['avalPdf'][0]) || null;
    const certGeneral = (filesDict['certificadoParticipacion'] && filesDict['certificadoParticipacion'][0]) || null;
    const orgFiles = {};
    for (const key of Object.keys(filesDict)) {
      if (key.startsWith('certificado_org_')) {
        const id = key.slice('certificado_org_'.length);
        orgFiles[id] = filesDict[key][0];
      }
    }

    const uploaderId = req.user?.id || payloadEvento.idUsuario || null;

    const created = await svc.createEventWithOrgs({
      evento: payloadEvento,
      tipoAval,
      uploaderId,
      organizaciones,
      files: { avalFile, certGeneral, orgFiles }
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('events.controller.create error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error creando evento' });
  }
}
export async function update(req, res) {
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);
    const payloadEvento = req.body.evento ? JSON.parse(req.body.evento) : {};
    const tipoAval = req.body.tipoAval || null;

    let organizaciones = [];
    if (req.body.organizaciones) {
      try { organizaciones = JSON.parse(req.body.organizaciones); } catch (e) { return res.status(400).json({ error: 'organizaciones JSON inválido' }); }
    }

    const avalFile = (filesDict['avalPdf'] && filesDict['avalPdf'][0]) || null;
    const certGeneral = (filesDict['certificadoParticipacion'] && filesDict['certificadoParticipacion'][0]) || null;
    const orgFiles = {};
    for (const key of Object.keys(filesDict)) {
      if (key.startsWith('certificado_org_')) {
        const id = key.slice('certificado_org_'.length);
        orgFiles[id] = filesDict[key][0];
      }
    }

    const uploaderId = req.user?.id || payloadEvento.idUsuario || null;

    const updated = await svc.updateEventWithOrgs({
      id: req.params.id,
      evento: payloadEvento,
      tipoAval,
      uploaderId,
      organizaciones,
      files: { avalFile, certGeneral, orgFiles }
    });

    res.json(updated);
  } catch (err) {
    console.error('events.controller.update error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error actualizando evento' });
  }
}
export async function remove(req, res) {
  try {
    const ok = await svc.deleteEvent(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando evento' });
  }
}
