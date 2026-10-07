import rateLimit from 'express-rate-limit';
import { isTest } from '../configs/env';

const handler = (_req: unknown, res: import('express').Response) =>
  res.status(429).json({ success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please slow down and try again shortly.' } });

export const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => isTest, handler });

/** Brute-force protection for login/register. */
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => isTest, handler });
