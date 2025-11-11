// src/controllers/events.controller.js
import * as svc from '../services/events.service.js';
import * as avalSvc from '../services/aval.service.js';
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
    console.error('events.controller.getAll error:', err);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
}

export async function getEventsForSecretaria(req, res) {
  try {
    const list = await svc.getEventsForSecretaria();
    res.json(list);
  } catch (err) {
    console.error('events.controller.getEventsForSecretaria error:', err);
    res.status(500).json({ error: 'Error obteniendo eventos para secretaria' });
  }
}

export async function evaluateEvent(req, res) {
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);
    const { idEvento, estado, justificacion } = req.body;
    const actaFile = filesDict['actaAprobacion'] ? filesDict['actaAprobacion'][0] : null;
    const idSecretaria = req.user?.id || req.body.idSecretaria;

    if (!idSecretaria) return res.status(401).json({ error: 'Secretaria no identificada' });

    const result = await svc.evaluateEvent({
      idEvento,
      estado,
      justificacion,
      actaFile,
      idSecretaria
    });

    res.json(result);
  } catch (err) {
    console.error('events.controller.evaluateEvent error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error evaluando evento' });
  }
}

export async function getById(req, res) {
  try {
    const ev = await svc.getEventById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

    try {
      const avales = await avalSvc.findByEvent(req.params.id);
      ev.avales = (avales || []).map(a => ({
        idUsuario: a.idUsuario,
        avalPdf: a.avalPdf,
        tipoAval: a.tipoAval,
        principal: a.principal
      }));
    } catch (e) {
      console.warn('No se pudieron cargar avales para evento', req.params.id, e);
      ev.avales = [];
    }

    res.json(ev);
  } catch (err) {
    console.error('events.controller.getById error:', err);
    res.status(500).json({ error: 'Error obteniendo evento' });
  }
}

export async function create(req, res) {
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);
    const eventoRaw = req.body.evento;
    if (!eventoRaw) return res.status(400).json({ error: 'Evento no enviado' });

    let payloadEvento;
    try {
      payloadEvento = JSON.parse(eventoRaw);
    } catch (e) {
      console.error('events.controller.create: Evento JSON inválido', e);
      return res.status(400).json({ error: 'Evento JSON inválido' });
    }

    const tipoAval = req.body.tipoAval;
    if (!tipoAval) return res.status(400).json({ error: 'tipoAval requerido' });

    let organizaciones = [];
    if (req.body.organizaciones) {
      try { organizaciones = JSON.parse(req.body.organizaciones); } catch (e) {
        console.error('events.controller.create: organizaciones JSON inválido', e);
        return res.status(400).json({ error: 'organizaciones JSON inválido' });
      }
    }

    let avales = [];
    if (req.body.avales) {
      try {
        const parsed = JSON.parse(req.body.avales);
        if (Array.isArray(parsed)) {
          avales = parsed
            .map(a => ({ userId: Number(a.userId) }))
            .filter(a => Number.isFinite(a.userId));
        } else {
          console.warn('events.controller.create: avales no es array', parsed);
        }
      } catch (e) {
        console.error('events.controller.create: avales JSON inválido', e);
        return res.status(400).json({ error: 'avales JSON inválido' });
      }
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

    const avalFiles = {};
    for (const key of Object.keys(filesDict)) {
      const m = key.match(/^aval_user_(.+)$/);
      if (m) avalFiles[m[1]] = filesDict[key][0];
    }

    const uploaderId = req.user?.id || payloadEvento.idUsuario || null;

    console.log('events.controller.create payloadEvento:', payloadEvento);
    console.log('events.controller.create tipoAval:', tipoAval);
    console.log('events.controller.create uploaderId:', uploaderId);
    console.log('events.controller.create organizaciones:', organizaciones);
    console.log('events.controller.create avales parsed:', avales);
    console.log('events.controller.create files present:', {
      avalFile: !!avalFile,
      certGeneral: !!certGeneral,
      orgFilesCount: Object.keys(orgFiles).length,
      avalFilesCount: Object.keys(avalFiles).length
    });

    const created = await svc.createEventWithOrgs({
      evento: payloadEvento,
      tipoAval,
      uploaderId,
      organizaciones,
      avales,
      files: { avalFile, certGeneral, orgFiles, avalFiles }
    });

    try {
      const eventId = created?.idEvento || created?.id || created?.insertId;
      if (eventId) {
        const avalesList = await avalSvc.findByEvent(eventId);
        created.avales = (avalesList || []).map(a => ({
          idUsuario: a.idUsuario,
          avalPdf: a.avalPdf,
          tipoAval: a.tipoAval,
          principal: a.principal
        }));
      } else {
        created.avales = [];
      }
    } catch (e) {
      console.warn('No se pudieron cargar avales tras crear evento', e);
      created.avales = [];
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('events.controller.create error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error creando evento' });
  }
}

export async function update(req, res) {
  const id = req.params.id;
  try {
    const filesDict = mapFilesArrayToDict(req.files || []);

    let evento = {};
    try { evento = req.body.evento ? JSON.parse(req.body.evento) : {}; } catch (e) { return res.status(400).json({ error: 'evento JSON inválido' }); }
    let organizaciones = [];
    try { organizaciones = req.body.organizaciones ? JSON.parse(req.body.organizaciones) : []; } catch (e) { return res.status(400).json({ error: 'organizaciones JSON inválido' }); }
    let instalaciones = [];
    try { instalaciones = req.body.instalaciones ? JSON.parse(req.body.instalaciones) : []; } catch (e) { return res.status(400).json({ error: 'instalaciones JSON inválido' }); }
    let avales = [];
    try { avales = req.body.avales ? JSON.parse(req.body.avales) : []; } catch (e) { avales = []; }

    const tipoAval = req.body.tipoAval || evento.tipoAval || null;

    const files = {};
    if (filesDict['avalPdf'] && filesDict['avalPdf'][0]) files.avalFile = filesDict['avalPdf'][0];

    files.avalFiles = {};
    for (const key of Object.keys(filesDict)) {
      const m = key.match(/^aval_user_(.+)$/);
      if (m) files.avalFiles[m[1]] = filesDict[key][0];
    }

    files.orgFiles = {};
    for (const key of Object.keys(filesDict)) {
      const m = key.match(/^certificado_org_(.+)$/);
      if (m) files.orgFiles[m[1]] = filesDict[key][0];
    }

    files.deleteCerts = {};
    for (const key of Object.keys(req.body || {})) {
      const m = key.match(/^delete_cert_org_(.+)$/);
      if (m && (req.body[key] === '1' || req.body[key] === 1 || req.body[key] === true || req.body[key] === 'true')) {
        files.deleteCerts[m[1]] = true;
      }
    }

    files.deleteAvalFlags = {};
    for (const key of Object.keys(req.body || {})) {
      const m = key.match(/^delete_aval_user_(.+)$/);
      if (m && (req.body[key] === '1' || req.body[key] === 1 || req.body[key] === true || req.body[key] === 'true')) {
        files.deleteAvalFlags[m[1]] = true;
      }
    }

    if (req.body.delete_aval) files.deleteAval = String(req.body.delete_aval) === '1' || req.body.delete_aval === 1;

    const uploaderId = req.user?.id;

    const updated = await svc.updateEventWithOrgs({
      id,
      evento: { ...evento, instalaciones },
      tipoAval,
      uploaderId,
      organizaciones,
      files,
      avales
    });

    try {
      const avalesList = await avalSvc.findByEvent(id);
      updated.avales = (avalesList || []).map(a => ({
        idUsuario: a.idUsuario,
        avalPdf: a.avalPdf,
        tipoAval: a.tipoAval,
        principal: a.principal
      }));
    } catch (e) {
      console.warn('No se pudieron cargar avales tras actualizar evento', e);
      updated.avales = [];
    }

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
    console.error('events.controller.remove error:', err);
    res.status(500).json({ error: 'Error eliminando evento' });
  }
}

export async function sendEvent(req, res) {
  try {
    const id = req.params.id;
    const updated = await svc.sendEventForReview({ idEvento: id });
    if (!updated) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(updated);
  } catch (err) {
    console.error('events.controller.sendEvent error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error enviando evento' });
  }
}

export async function getByIdDetailed(req, res) {
  try {
    const id = req.params.id;
    const evento = await svc.getEventWithDetails(id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    try {
      const avales = await avalSvc.findByEvent(id);
      evento.avales = (avales || []).map(a => ({
        idUsuario: a.idUsuario,
        avalPdf: a.avalPdf,
        tipoAval: a.tipoAval,
        principal: a.principal
      }));
    } catch (e) {
      console.warn('No se pudieron cargar avales para evento (detailed)', id, e);
      evento.avales = [];
    }

    res.json(evento);
  } catch (err) {
    console.error('events.detail.controller.getByIdDetailed error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Error obteniendo evento con detalles' });
  }
}
