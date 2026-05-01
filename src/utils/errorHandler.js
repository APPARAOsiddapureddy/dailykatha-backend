export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toHttpError(err) {
  if (err instanceof HttpError) return err;
  return new HttpError(500, 'INTERNAL_ERROR', 'Internal server error');
}

