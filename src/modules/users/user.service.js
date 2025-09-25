import { NotFoundError, ValidationError } from '../../core/errors/index.js';
import * as usersRepository from './user.repository.js';

const ensurePositiveInteger = (value) => {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new ValidationError('Invalid identifier provided', {
      details: { id: 'The identifier must be a positive integer' }
    });
  }
  return numericValue;
};

export const getUsers = () => usersRepository.findAll();

export const getUserById = async (id) => {
  const numericId = ensurePositiveInteger(id);
  const user = await usersRepository.findById(numericId);
  if (!user) {
    throw new NotFoundError(`User with id ${numericId} was not found`);
  }
  return user;
};

export const createUser = async (payload) => {
  const insertedId = await usersRepository.create(payload);
  return getUserById(insertedId);
};

export const updateUser = async (id, payload) => {
  const numericId = ensurePositiveInteger(id);
  const existingUser = await getUserById(numericId);
  const updatePayload = {
    name: payload.name ?? existingUser.name,
    email: payload.email ?? existingUser.email
  };
  await usersRepository.update(numericId, updatePayload);
  return getUserById(numericId);
};

export const removeUser = async (id) => {
  const numericId = ensurePositiveInteger(id);
  await getUserById(numericId);
  const removed = await usersRepository.remove(numericId);
  if (!removed) {
    throw new NotFoundError(`User with id ${numericId} was not found`);
  }
  return true;
};
