/**
 * user.controller.js - Controlador de usuarios
 *
 * Define los controladores para las rutas de usuarios:
 * - Listar usuarios
 * - Obtener usuario por ID
 * - Crear usuario
 * - Actualizar usuario
 * - Eliminar usuario
 *
 * Los controladores reciben la petición HTTP, llaman a los servicios y devuelven la respuesta.
 */

import * as usersService from './user.service.js';

/**
 * Controlador para listar todos los usuarios
 */
export const listUsers = async (_req, res) => {
  const users = await usersService.getUsers();
  res.json({ data: users });
};

/**
 * Controlador para obtener un usuario por ID
 */
export const getUser = async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  res.json({ data: user });
};

/**
 * Controlador para crear un nuevo usuario
 */
export const createUser = async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json({ data: user });
};

/**
 * Controlador para actualizar un usuario existente
 */
export const updateUser = async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  res.json({ data: user });
};

/**
 * Controlador para eliminar un usuario
 */
export const deleteUser = async (req, res) => {
  await usersService.removeUser(req.params.id);
  res.status(204).send();
};
