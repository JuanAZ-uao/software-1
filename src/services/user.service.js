/**
 * user.service.js - Servicio de usuarios
 *
 * Contiene la lógica de negocio para gestión de usuarios:
 * - Obtener todos los usuarios
 * - Obtener usuario por ID
 * - Crear usuario
 * - Actualizar usuario
 * - Eliminar usuario
 *
 * Llama a funciones del repositorio y lanza errores si corresponde.
 */

import { NotFoundError, ValidationError } from '../core/errors/index.js';
import * as usersRepository from '../repositories/user.repository.js';

// Valida que el ID sea un entero positivo
const ensurePositiveInteger = (value) => {
	const numericValue = Number(value);
	if (!Number.isInteger(numericValue) || numericValue <= 0) {
		throw new ValidationError('Invalid identifier provided', {
			details: { id: 'The identifier must be a positive integer' }
		});
	}
	return numericValue;
};

/**
 * Retorna todos los usuarios
 */
export const getUsers = () => usersRepository.findAll();

/**
 * Retorna un usuario por ID, lanza error si no existe
 */
export const getUserById = async (id) => {
	const numericId = ensurePositiveInteger(id);
	const user = await usersRepository.findById(numericId);
	if (!user) {
		throw new NotFoundError(`User with id ${numericId} was not found`);
	}
	return user;
};

/**
 * Crea un nuevo usuario y retorna el usuario creado
 */
export const createUser = async (payload) => {
	const insertedId = await usersRepository.create(payload);
	return getUserById(insertedId);
};

/**
 * Actualiza un usuario existente y retorna el usuario actualizado
 */
export const updateUser = async (id, payload) => {
	const numericId = ensurePositiveInteger(id);
	const existingUser = await getUserById(numericId);
	const updatePayload = {
		name: payload.name ?? existingUser.name,
		email: payload.email ?? existingUser.email,
	};
	await usersRepository.update(numericId, updatePayload);
	return getUserById(numericId);
};

/**
 * Elimina un usuario por ID
 */
export const removeUser = async (id) => {
	const numericId = ensurePositiveInteger(id);
	await usersRepository.remove(numericId);
};