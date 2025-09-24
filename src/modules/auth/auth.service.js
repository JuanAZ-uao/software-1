// src/modules/auth/auth.service.js
import { findUserByEmail, validatePassword } from './auth.repository.js';

export const authenticate = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user || !validatePassword(password, user.clave)) {
    throw new ValidationError('Credenciales inválidas');
  }
  return user;
};