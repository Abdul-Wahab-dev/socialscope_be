import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { cookieNames } from '../configs/app.config';
import { verifyAccessToken } from '../libs/jwt';
import { ApiError } from '../utils/api-error';
import type { UserRole } from '../types';

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[cookieNames.access];
}

/** Requires a valid access token (cookie or Bearer header). */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // Frontend uses this code to transparently call /auth/refresh
      return next(new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED'));
    }
    return next(ApiError.unauthorized('Invalid access token'));
  }
}

/** Attaches req.user when a valid token is present, otherwise continues as a guest. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED'));
    return next(); // garbage token -> treat as guest
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action is only available to ${roles.join(' / ')} accounts`));
    }
    return next();
  };
}
