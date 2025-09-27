// src/modules/auth/index.js
/**
 * index.js - Punto de entrada del módulo de autenticación
 *
 * Reexporta las rutas, servicios y repositorios de autenticación para facilitar su importación.
 */

export { authRouter } from './auth.routes.js';
export { authenticate, registerUser } from './auth.service.js';
export { findUserByEmail, createUser } from './auth.repository.js';