import * as usersService from './user.service.js';

export const listUsers = async (_req, res) => {
  const users = await usersService.getUsers();
  res.json({ data: users });
};

export const getUser = async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  res.json({ data: user });
};

export const createUser = async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json({ data: user });
};

export const updateUser = async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  res.json({ data: user });
};

export const deleteUser = async (req, res) => {
  await usersService.removeUser(req.params.id);
  res.status(204).send();
};
