import { AppError } from '../errors/app-error.js';
import { env } from '../../config/index.js';

export const errorHandler = (error, _req, res, _next) => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';
  const responseBody = {
    message: error.message || 'Internal server error',
    code
  };

  if (error.details) {
    responseBody.details = error.details;
  }

  if (env.nodeEnv !== 'production') {
    responseBody.stack = error.stack;
    console.error(error);
  }

  res.status(statusCode).json(responseBody);
};
