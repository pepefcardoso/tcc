import { AppError } from './errorHandler.js';

/**
 * Express middleware factory to validate requests using Zod schemas.
 *
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {'body' | 'query' | 'params'} target - Which part of the request to validate (default: 'body')
 * @returns {Function} Express middleware
 */
export function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || target,
        message: issue.message,
      }));

      const message = `Validation failed: ${fields.map((f) => `${f.field}: ${f.message}`).join('; ')}`;

      const err = new AppError(422, 'validation_error', message);
      err.fields = fields;

      return next(err);
    }

    Object.defineProperty(req, target, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return next();
  };
}
