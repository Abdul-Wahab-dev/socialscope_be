import type { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/response';

export const createCheckout = async (req: Request, res: Response) => {
  sendSuccess(res, await paymentService.createCheckout(req.user!, req.body), { status: 201 });
};

export const listPayments = async (req: Request, res: Response) => {
  sendSuccess(res, await paymentService.listMine(req.user!.id));
};

export const getPayment = async (req: Request, res: Response) => {
  sendSuccess(res, await paymentService.getMine(req.user!.id, String(req.params.id)));
};

export const confirmMockPayment = async (req: Request, res: Response) => {
  sendSuccess(res, await paymentService.confirmMock(req.user!.id, String(req.params.id)), { message: 'Payment confirmed (test mode)' });
};

/** Stripe webhook — body is a raw Buffer (see app.ts). */
export const stripeWebhook = async (req: Request, res: Response) => {
  const result = await paymentService.handleStripeWebhook(req.body as Buffer, req.get('stripe-signature'));
  res.json(result);
};
