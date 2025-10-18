import { AppError } from './app-error.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', options = {}) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', ...options });
  }
}
