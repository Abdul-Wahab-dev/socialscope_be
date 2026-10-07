import Stripe from 'stripe';
import { env } from '../configs/env';

/** Null when STRIPE_SECRET_KEY is not configured (dev uses mock payments). */
export const stripe: Stripe | null = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
