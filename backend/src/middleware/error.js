import { Prisma } from '@prisma/client';
import { ApiError } from '../lib/errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- express identifies error middleware by arity
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      message = `${(err.meta?.target || ['value']).join(', ')} already in use`;
    } else if (err.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'Record not found';
    } else {
      status = 400;
      code = 'DB_ERROR';
    }
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (env.isProd) {
      message = 'Something went wrong';
      details = undefined;
    }
  }

  res.status(status).json({ error: { code, message, details } });
}
