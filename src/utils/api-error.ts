export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

/** Operational error with an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'ERROR',
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', details?: ErrorDetails) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static validation(details: ErrorDetails, message = 'Validation failed') {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Resource already exists', details?: ErrorDetails) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
  static paymentRequired(message: string, details?: ErrorDetails) {
    return new ApiError(402, message, 'PAYMENT_REQUIRED', details);
  }
  static tooMany(message = 'Too many requests', details?: ErrorDetails) {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS', details);
  }
  static badGateway(message = 'Upstream error', details?: ErrorDetails) {
    return new ApiError(502, message, 'BAD_GATEWAY', details);
  }
  static internal(message = 'Something went wrong') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
