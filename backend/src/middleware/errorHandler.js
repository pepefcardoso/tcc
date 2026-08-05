export class AppError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = 'AppError';
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isDev = process.env.NODE_ENV !== 'production';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'file_too_large', message: 'Payload too large' });
  }

  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'bad_request', message: 'Malformed JSON body' });
  }

  // eslint-disable-next-line no-console
  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected internal server error occurred',
    ...(isDev && { stack: err.stack }),
  });
}
