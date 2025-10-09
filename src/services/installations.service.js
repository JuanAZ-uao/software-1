// services/installations.service.js
import * as repo from '../repositories/installations.repository.js';

export async function getAllInstallations() {
  return await repo.findAll();
}

export async function getInstallationById(id) {
  return await repo.findById(id);
}
