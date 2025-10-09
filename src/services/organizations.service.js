import * as orgRepo from '../repositories/organizations.repository.js';

export async function getAllOrganizations() {
  return await orgRepo.findAll();
}

export async function createOrganization(data) {
  if (!data.nombre || !data.representanteLegal) {
    const err = new Error('Nombre y representante legal son requeridos');
    err.status = 400;
    throw err;
  }
  return await orgRepo.insert(data);
}

export async function updateOrganization(id, data) {
  if (!id) {
    const err = new Error('Id de organización requerido');
    err.status = 400;
    throw err;
  }
  if (!data.nombre || !data.representanteLegal) {
    const err = new Error('Nombre y representante legal son requeridos');
    err.status = 400;
    throw err;
  }
  return await orgRepo.updateById(id, data);
}

export async function deleteOrganization(id) {
  if (!id) {
    const err = new Error('Id de organización requerido');
    err.status = 400;
    throw err;
  }
  const ok = await orgRepo.deleteById(id);
  if (!ok) {
    const err = new Error('Organización no encontrada');
    err.status = 404;
    throw err;
  }
  return true;
}
