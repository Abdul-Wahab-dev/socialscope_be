import type { Request, Response } from 'express';
import { metaService } from '../services/meta.service';
import { sendSuccess } from '../utils/response';

export const getCategories = async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=300');
  sendSuccess(res, await metaService.getCategories());
};

export const getConfig = async (_req: Request, res: Response) => {
  sendSuccess(res, await metaService.getPublicConfig());
};

export const getStats = async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=300');
  sendSuccess(res, await metaService.getPublicStats());
};
