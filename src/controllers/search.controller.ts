import type { Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { sendSuccess } from '../utils/response';
import type { SearchCreatorsInput } from '../validations/search.validation';

const actorOf = (req: Request) => ({ user: req.user, guestId: req.guestId, ip: req.ip });

export const searchCreators = async (req: Request, res: Response) => {
  const result = await searchService.search(req.query as unknown as SearchCreatorsInput, actorOf(req));
  sendSuccess(res, result.items, { meta: { ...result.meta, quota: result.quota } });
};

export const getQuota = async (req: Request, res: Response) => {
  sendSuccess(res, await searchService.getQuota(actorOf(req)));
};
