import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError as SequelizeValidationError, DatabaseError } from 'sequelize';
import { ApiError } from '../utils/api-error';
import { logger } from '../libs/logger';
import { isProd } from '../configs/env';
import { formatZodError } from './validate.middleware';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

const uniqueFieldMessages: Record<string, string> = {
  email: 'An account with this email already exists',
  username: 'This username is already taken',
  platform_user_id: 'This social account is already connected to another creator',
};

/** Converts every error into the standard envelope: { success:false, error:{ code, message, details? } } */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof ZodError) {
    apiError = ApiError.validation(formatZodError(err));
  } else if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path ?? '';
    const key = Object.keys(uniqueFieldMessages).find((k) => field.includes(k) || err.message.includes(k));
    apiError = ApiError.conflict(key ? uniqueFieldMessages[key] : 'Duplicate value', { field: field || undefined });
  } else if (err instanceof SequelizeValidationError) {
    apiError = ApiError.validation(err.errors.map((e) => ({ field: e.path ?? '_root', message: e.message })));
  } else if (err instanceof ForeignKeyConstraintError) {
    apiError = ApiError.badRequest('Referenced resource does not exist');
  } else if (err instanceof DatabaseError && /invalid input (syntax|value)/i.test(err.message)) {
    apiError = ApiError.badRequest('Invalid value supplied');
  } else if (err instanceof SyntaxError && 'body' in err) {
    apiError = ApiError.badRequest('Malformed JSON body');
  } else if (typeof err === 'object' && err && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    apiError = new ApiError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');
  } else {
    apiError = ApiError.internal();
  }

  if (apiError.statusCode >= 500) {
    logger.error(`[${req.requestId}] ${req.method} ${req.originalUrl} failed`, err);
  }

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
      ...(!isProd && apiError.statusCode >= 500 && err instanceof Error ? { debug: err.message } : {}),
    },
    requestId: req.requestId,
  });
}
