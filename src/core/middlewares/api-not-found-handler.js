import { NotFoundError } from '../errors/not-found-error.js';

export const apiNotFoundHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} was not found`, {
    details: {
      method: req.method,
      path: req.originalUrl
    }
  }));
};
