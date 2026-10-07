import type { Request, Response } from 'express';
import { creatorService } from '../services/creator.service';
import { rateCardService } from '../services/rate-card.service';
import { portfolioService } from '../services/portfolio.service';
import { sendSuccess } from '../utils/response';

// ---- Profile ----
export const getMyProfile = async (req: Request, res: Response) => {
  sendSuccess(res, await creatorService.getMyProfile(req.user!.id));
};

export const updateMyProfile = async (req: Request, res: Response) => {
  sendSuccess(res, await creatorService.updateMyProfile(req.user!.id, req.body), { message: 'Profile updated' });
};

export const checkUsername = async (req: Request, res: Response) => {
  sendSuccess(res, await creatorService.isUsernameAvailable(String(req.query.username), req.user?.id));
};

export const getInsights = async (req: Request, res: Response) => {
  sendSuccess(res, await creatorService.getInsights(req.user!.id));
};

export const getFeatured = async (req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=300');
  sendSuccess(res, await creatorService.getFeatured(Number(req.query.limit) || 8));
};

export const getPublicProfile = async (req: Request, res: Response) => {
  sendSuccess(res, await creatorService.getPublicProfile(String(req.params.username).toLowerCase(), req.user?.id));
};

// ---- Rate cards ----
export const listRateCards = async (req: Request, res: Response) => {
  sendSuccess(res, await rateCardService.list(req.user!.id));
};

export const createRateCard = async (req: Request, res: Response) => {
  sendSuccess(res, await rateCardService.create(req.user!.id, req.body), { status: 201, message: 'Rate added' });
};

export const updateRateCard = async (req: Request, res: Response) => {
  sendSuccess(res, await rateCardService.update(req.user!.id, String(req.params.id), req.body), { message: 'Rate updated' });
};

export const deleteRateCard = async (req: Request, res: Response) => {
  await rateCardService.remove(req.user!.id, String(req.params.id));
  sendSuccess(res, null, { message: 'Rate removed' });
};

// ---- Portfolio ----
export const listPortfolio = async (req: Request, res: Response) => {
  sendSuccess(res, await portfolioService.list(req.user!.id));
};

export const createPortfolioItem = async (req: Request, res: Response) => {
  sendSuccess(res, await portfolioService.create(req.user!.id, req.body), { status: 201, message: 'Portfolio item added' });
};

export const updatePortfolioItem = async (req: Request, res: Response) => {
  sendSuccess(res, await portfolioService.update(req.user!.id, String(req.params.id), req.body), { message: 'Portfolio item updated' });
};

export const deletePortfolioItem = async (req: Request, res: Response) => {
  await portfolioService.remove(req.user!.id, String(req.params.id));
  sendSuccess(res, null, { message: 'Portfolio item removed' });
};
