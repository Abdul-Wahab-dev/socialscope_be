import type { NextFunction, Request, Response } from 'express';
import { z, type ZodType } from 'zod';
import { ApiError } from '../utils/api-error';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function formatZodError(error: z.ZodError) {
  return error.issues.map((i) => ({ field: i.path.join('.') || '_root', message: i.message }));
}

/**
 * Validates & coerces request parts. Parsed values replace the originals, so controllers
 * always receive clean, typed data. (Express 5 makes req.query a getter, hence defineProperty.)
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string; location: string }> = [];

    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(location === 'body' ? (req.body ?? {}) : req[location]);
      if (!result.success) {
        errors.push(...formatZodError(result.error).map((e) => ({ ...e, location })));
        continue;
      }
      if (location === 'body') req.body = result.data;
      else Object.defineProperty(req, location, { value: result.data, writable: true, configurable: true, enumerable: true });
    }

    if (errors.length) return next(ApiError.validation(errors));
    return next();
  };
}
