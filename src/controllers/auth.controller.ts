import type { Request, Response } from 'express';
import { cookieNames } from '../configs/app.config';
import { authService } from '../services/auth.service';
import { clearAuthCookies, setAuthCookies } from '../utils/auth-cookies';
import { sendSuccess } from '../utils/response';

const clientInfo = (req: Request) => ({ userAgent: req.get('user-agent'), ip: req.ip });

export const register = async (req: Request, res: Response) => {
  const { user, tokens } = await authService.register(req.body, clientInfo(req));
  setAuthCookies(res, tokens, user.role);
  sendSuccess(res, { user, accessToken: tokens.accessToken }, { status: 201, message: 'Account created' });
};

export const login = async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body, clientInfo(req));
  setAuthCookies(res, tokens, user.role);
  sendSuccess(res, { user, accessToken: tokens.accessToken }, { message: 'Logged in' });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { user, tokens } = await authService.refresh(req.cookies?.[cookieNames.refresh], clientInfo(req));
    setAuthCookies(res, tokens, user.role);
    sendSuccess(res, { accessToken: tokens.accessToken });
  } catch (err) {
    clearAuthCookies(res); // stale cookies would otherwise loop the client
    throw err;
  }
};

export const logout = async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.[cookieNames.refresh]);
  clearAuthCookies(res);
  sendSuccess(res, null, { message: 'Logged out' });
};

export const me = async (req: Request, res: Response) => {
  sendSuccess(res, await authService.getMe(req.user!.id));
};

export const changePassword = async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body);
  sendSuccess(res, null, { message: 'Password updated. Other devices have been signed out.' });
};

export const deleteAccount = async (req: Request, res: Response) => {
  const confirmationCode = await authService.deleteAccount(req.user!.id, req.body.password);
  clearAuthCookies(res);
  sendSuccess(res, { confirmationCode }, { message: 'Your account and data have been deleted' });
};
