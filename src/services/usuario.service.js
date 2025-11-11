// src/services/usuario.service.js
import * as repo from '../repositories/usuario.repository.js';

export async function listarUsuarios({ q = '', page = 1, limit = 20 }, conn) {
  const offset = Math.max(0, (page - 1) * limit);
  const usuarios = await repo.buscarUsuarios({ q, limit, offset }, conn);
  const total = await repo.contarUsuarios({ q }, conn);
  return { usuarios, meta: { page, limit, total } };
}

export async function obtenerUsuarioPorId(id, conn) {
  return await repo.obtenerPorId(id, conn);
}

export async function esSecretaria(idUsuario, conn) {
  return await repo.esSecretariaPorId(idUsuario, conn);
}

/**
 * Lanza error si el usuario es secretaria academica
 * Usar dentro de transacciones pasando conn cuando corresponda
 */
export async function validarNoSecretaria(idUsuario, conn) {
  const es = await esSecretaria(idUsuario, conn);
  if (es) {
    const err = new Error('El usuario es secretaria académica y no puede participar en eventos');
    err.status = 400;
    throw err;
  }
  return true;
}
