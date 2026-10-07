import type { CookieOptions, Response } from 'express';
import { cookieNames } from '../configs/app.config';
import { env, isProd } from '../configs/env';
import type { UserRole } from '../types';

const base: CookieOptions = {
  sameSite: 'lax',
  secure: isProd,
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
};

/** Session hint cookie (non-httpOnly, no secrets) so the Next.js proxy can route by login state/role. */
export const SESSION_HINT_COOKIE = 'ss_session';

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string; refreshExpiresAt: Date }, role: UserRole) {
  // The cookie outlives the 15-minute JWT on purpose: an expired JWT yields 401 TOKEN_EXPIRED,
  // which tells the client to call /auth/refresh (a missing cookie would look like "logged out").
  res.cookie(cookieNames.access, tokens.accessToken, { ...base, httpOnly: true, expires: tokens.refreshExpiresAt });
  res.cookie(cookieNames.refresh, tokens.refreshToken, {
    ...base,
    httpOnly: true,
    path: `${env.API_PREFIX}/auth`, // only ever sent to the auth endpoints
    expires: tokens.refreshExpiresAt,
  });
  res.cookie(SESSION_HINT_COOKIE, role, { ...base, httpOnly: false, expires: tokens.refreshExpiresAt });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(cookieNames.access, { ...base, httpOnly: true });
  res.clearCookie(cookieNames.refresh, { ...base, httpOnly: true, path: `${env.API_PREFIX}/auth` });
  res.clearCookie(SESSION_HINT_COOKIE, { ...base });
}
