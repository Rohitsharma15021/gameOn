import { ApiError } from '../lib/errors.js';

/**
 * Validates req[source] against a zod schema and replaces it with the parsed
 * value, so handlers always see coerced types.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Invalid request', details));
    }
    // req.query is a getter in Express 5; assign to a shadow property instead.
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };

/** Convenience accessor that works for both Express 4 and 5. */
export const q = (req) => req.validatedQuery ?? req.query;
