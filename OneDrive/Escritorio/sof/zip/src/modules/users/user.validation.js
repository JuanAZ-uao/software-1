import { ValidationError } from '../../core/errors/index.js';

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;

const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');

const buildValidationError = (details) =>
  new ValidationError('Invalid user payload provided', { details });

export const validateCreateUser = (req, _res, next) => {
  const { name, email } = req.body ?? {};
  const errors = {};

  if (typeof name !== 'string' || normalizeName(name).length < 3) {
    errors.name = 'Name must be a string with at least 3 characters';
  }

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.toLowerCase())) {
    errors.email = 'Email must be a valid address';
  }

  if (Object.keys(errors).length > 0) {
    return next(buildValidationError(errors));
  }

  req.body = {
    name: normalizeName(name),
    email: email.toLowerCase()
  };

  next();
};

export const validateUpdateUser = (req, _res, next) => {
  const { name, email } = req.body ?? {};
  const errors = {};
  const payload = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || normalizeName(name).length < 3) {
      errors.name = 'Name must be a string with at least 3 characters';
    } else {
      payload.name = normalizeName(name);
    }
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.toLowerCase())) {
      errors.email = 'Email must be a valid address';
    } else {
      payload.email = email.toLowerCase();
    }
  }

  if (Object.keys(errors).length > 0) {
    return next(buildValidationError(errors));
  }

  if (Object.keys(payload).length === 0) {
    return next(buildValidationError({ payload: 'At least one property (name or email) must be provided' }));
  }

  req.body = payload;
  next();
};
