// src/services/organizations.service.js
import * as orgRepo from '../repositories/organizations.repository.js';

export async function getAllOrganizations() {
  return await orgRepo.findAll();
}

export async function createOrganization(data, idUsuario) {
  // data: { nombre, representanteLegal, sectorEconomico, ... }
  if (!data || !data.nombre || !data.representanteLegal) {
    const err = new Error('Nombre y representante legal son requeridos');
    err.status = 400;
    throw err;
  }

  // preferir idUsuario; si no existe y tu DB acepta NULL, repo.insert lo permitirá
  const creatorId = idUsuario ?? null;

  const created = await orgRepo.insert(data, creatorId);
  return created;
}

export async function updateOrganization(id, data, idUsuario) {
  if (!id) {
    const err = new Error('Id de organización requerido');
    err.status = 400;
    throw err;
  }
  if (!data || !data.nombre || !data.representanteLegal) {
    const err = new Error('Nombre y representante legal son requeridos');
    err.status = 400;
    throw err;
  }

  // verificar existencia y propiedad si created_by no es null
  const org = await orgRepo.findById(id);
  if (!org) {
    const err = new Error('Organización no encontrada');
    err.status = 404;
    throw err;
  }

  const ownerId = org.created_by ? String(org.created_by) : null;
  const actingUser = idUsuario ? String(idUsuario) : null;
  if (ownerId && actingUser && ownerId !== actingUser) {
    const err = new Error('No autorizado para editar esta organización');
    err.status = 403;
    throw err;
  }

  const updated = await orgRepo.updateById(id, data);
  return updated;
}

export async function deleteOrganization(id, idUsuario) {
  if (!id) {
    const err = new Error('Id de organización requerido');
    err.status = 400;
    throw err;
  }

  const org = await orgRepo.findById(id);
  if (!org) {
    const err = new Error('Organización no encontrada');
    err.status = 404;
    throw err;
  }

  const ownerId = org.created_by ? String(org.created_by) : null;
  const actingUser = idUsuario ? String(idUsuario) : null;
  if (ownerId && actingUser && ownerId !== actingUser) {
    const err = new Error('No autorizado para eliminar esta organización');
    err.status = 403;
    throw err;
  }

  const ok = await orgRepo.deleteById(id);
  if (!ok) {
    const err = new Error('Error al eliminar organización');
    err.status = 500;
    throw err;
  }
  return true;
}
