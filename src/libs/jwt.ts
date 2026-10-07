import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../configs/env';
import type { UserRole } from '../types';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface OAuthStatePayload {
  sub: string;
  platform: string;
  nonce: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Short-lived signed `state` param for OAuth round-trips (CSRF protection + user binding). */
export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '10m' });
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as OAuthStatePayload;
}
