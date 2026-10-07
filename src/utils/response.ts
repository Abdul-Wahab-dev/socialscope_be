import type { Response } from 'express';
import type { PaginationMeta } from '../types';

/** Consistent success envelope: { success, message?, data, meta? } */
export function sendSuccess<T>(res: Response, data: T, opts: { status?: number; message?: string; meta?: PaginationMeta | Record<string, unknown> } = {}) {
  return res.status(opts.status ?? 200).json({
    success: true,
    ...(opts.message ? { message: opts.message } : {}),
    data,
    ...(opts.meta ? { meta: opts.meta } : {}),
  });
}
