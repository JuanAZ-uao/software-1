// src/modules/auth/index.js
export { authRouter } from './auth.routes.js';
export { authenticate, registerUser } from './auth.service.js';
export { findUserByEmail, createUser } from './auth.repository.js';