import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { cookieNames } from '../configs/app.config';
import { env, isProd } from '../configs/env';

/** Assigns an anonymous id cookie so guest search quota can be tracked. */
export function ensureGuestId(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  let guestId: string | undefined = req.cookies?.[cookieNames.guest];
  if (!guestId || !/^[a-f0-9-]{36}$/.test(guestId)) {
    guestId = crypto.randomUUID();
    res.cookie(cookieNames.guest, guestId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      domain: env.COOKIE_DOMAIN || undefined,
      maxAge: 365 * 86_400_000,
    });
  }
  req.guestId = guestId;
  return next();
}
