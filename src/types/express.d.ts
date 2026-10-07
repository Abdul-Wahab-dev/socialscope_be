import type { AuthUser } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      guestId?: string;
      requestId?: string;
    }
  }
}

export {};
