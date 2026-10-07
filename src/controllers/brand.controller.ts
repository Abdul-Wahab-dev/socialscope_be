import type { Request, Response } from 'express';
import { brandService } from '../services/brand.service';
import { sendSuccess } from '../utils/response';

export const getMyProfile = async (req: Request, res: Response) => {
  sendSuccess(res, await brandService.getMyProfile(req.user!.id));
};

export const updateMyProfile = async (req: Request, res: Response) => {
  sendSuccess(res, await brandService.updateMyProfile(req.user!.id, req.body), { message: 'Profile updated' });
};

export const listSaved = async (req: Request, res: Response) => {
  sendSuccess(res, await brandService.listSaved(req.user!.id));
};

export const saveCreator = async (req: Request, res: Response) => {
  sendSuccess(res, await brandService.saveCreator(req.user!.id, req.body), { status: 201, message: 'Creator saved' });
};

export const unsaveCreator = async (req: Request, res: Response) => {
  await brandService.unsaveCreator(req.user!.id, String(req.params.creatorProfileId));
  sendSuccess(res, null, { message: 'Creator removed from saved list' });
};
