import type { Request, Response } from 'express';
import { collabService } from '../services/collab.service';
import { sendSuccess } from '../utils/response';
import type { ListCollabsQuery } from '../validations/collab.validation';

export const createCollab = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.create(req.user!.id, req.body), { status: 201, message: 'Request sent' });
};

export const listCollabs = async (req: Request, res: Response) => {
  const result = await collabService.list(req.user!, req.query as unknown as ListCollabsQuery);
  sendSuccess(res, result.items, { meta: result.meta });
};

export const getCollab = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.getForUser(req.user!, String(req.params.id)));
};

export const respondCollab = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.respond(req.user!, String(req.params.id), req.body), { message: 'Response sent' });
};

export const respondToCounter = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.respondToCounter(req.user!, String(req.params.id), req.body.action), { message: 'Response sent' });
};

export const cancelCollab = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.cancel(req.user!, String(req.params.id)), { message: 'Request cancelled' });
};

export const completeCollab = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.complete(req.user!, String(req.params.id)), { message: 'Marked as completed' });
};

export const listMessages = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.listMessages(req.user!, String(req.params.id)));
};

export const sendMessage = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.sendMessage(req.user!, String(req.params.id), req.body.body), { status: 201 });
};

export const unreadCount = async (req: Request, res: Response) => {
  sendSuccess(res, await collabService.unreadCount(req.user!));
};
