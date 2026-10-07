import type Stripe from 'stripe';
import { stripe } from '../libs/stripe';
import { env } from '../configs/env';
import { ApiError } from '../utils/api-error';

interface CheckoutParams {
  paymentId: string;
  userId: string;
  email: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

function client(): Stripe {
  if (!stripe) throw new ApiError(503, 'Payments are not configured', 'PAYMENTS_NOT_CONFIGURED');
  return stripe;
}

export async function createCheckoutSession(p: CheckoutParams): Promise<{ id: string; url: string }> {
  const session = await client().checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: p.email,
      client_reference_id: p.paymentId,
      metadata: { paymentId: p.paymentId, userId: p.userId },
      payment_intent_data: { metadata: { paymentId: p.paymentId } },
      line_items: [
        {
          quantity: 1,
          price_data: { currency: p.currency, unit_amount: p.amountCents, product_data: { name: p.name, description: p.description } },
        },
      ],
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
    },
    { idempotencyKey: `checkout_${p.paymentId}` },
  );
  if (!session.url) throw ApiError.badGateway('Stripe did not return a checkout URL');
  return { id: session.id, url: session.url };
}

export function constructWebhookEvent(rawBody: Buffer, signature: string | undefined): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new ApiError(503, 'Webhook secret not configured', 'PAYMENTS_NOT_CONFIGURED');
  if (!signature) throw ApiError.badRequest('Missing Stripe signature');
  try {
    return client().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw ApiError.badRequest('Invalid Stripe signature');
  }
}
