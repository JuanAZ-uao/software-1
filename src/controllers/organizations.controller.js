// src/controllers/organizations.controller.js
import * as orgService from '../services/organizations.service.js';

export async function getAllOrganizations(req, res) {
  try {
    const orgs = await orgService.getAllOrganizations();
    res.json(orgs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function createOrganization(req, res) {
  try {
    // permitir frontend enviar idUsuario en body (como en Aval) o usar req.user.id si existe
    const idUsuario = req.body?.idUsuario ?? req.user?.id ?? null;
    const payload = { ...req.body };
    // eliminar idUsuario del payload principal si quieres (opcional)
    delete payload.idUsuario;
    const created = await orgService.createOrganization(payload, idUsuario);
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateOrganization(req, res) {
  try {
    const id = req.params.id;
    const idUsuario = req.body?.idUsuario ?? req.user?.id ?? null;
    const payload = { ...req.body };
    delete payload.idUsuario;
    const updated = await orgService.updateOrganization(id, payload, idUsuario);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function deleteOrganization(req, res) {
  try {
    const id = req.params.id;
    const idUsuario = req.body?.idUsuario ?? req.user?.id ?? null;
    await orgService.deleteOrganization(id, idUsuario);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
