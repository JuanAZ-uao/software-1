// src/modules/auth/auth.service.js
import bcrypt from 'bcryptjs';
import { ValidationError } from '../../core/errors/validation-error.js';
import { findUserByEmail, createUser, validateUserPassword } from './auth.repository.js';

// Autenticar usuario existente
export const authenticate = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ValidationError('Credenciales inválidas');
  }
  
  const isValidPassword = await validateUserPassword(user.idUsuario, password);
  if (!isValidPassword) {
    throw new ValidationError('Credenciales inválidas');
  }
  
  // Remover datos sensibles
  const { clave, ...userData } = user;
  return userData;
};

// Registrar nuevo usuario (sin hash temporalmente)
export const registerUser = async (userData) => {
  const { nombre, apellidos, email, telefono, password, tipo } = userData;
  
  // Verificar si el usuario ya existe
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ValidationError('El email ya está registrado');
  }
  
  // Crear usuario sin hash por ahora
  const newUser = await createUser({
    nombre,
    apellidos, 
    email,
    telefono,
    password, // Sin hash
    tipo
  });
  
  return newUser;
};