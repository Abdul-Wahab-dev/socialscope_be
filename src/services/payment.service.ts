import type Stripe from 'stripe';
import { appConfig } from '../configs/app.config';
import { env, isProd, paymentsMocked } from '../configs/env';
import { sequelize } from '../configs/database';
import { CreatorProfile, Payment, SocialAccount, User } from '../models';
import { constructWebhookEvent, createCheckoutSession } from '../integrations/stripe.integration';
import { logger } from '../libs/logger';
import { ApiError } from '../utils/api-error';
import type { AuthUser } from '../types';
import type { CheckoutInput } from '../validations/payment.validation';
import { creatorService } from './creator.service';

export class PaymentService {
  async createCheckout(authUser: AuthUser, input: CheckoutInput) {
    const user = await User.findByPk(authUser.id);
    if (!user) throw ApiError.unauthorized();

    if (input.purpose === 'creator_registration') return this.creatorRegistrationCheckout(user);

    if (user.role !== 'brand') throw ApiError.forbidden('Search packs are available to brand accounts');
    const pkg = appConfig.searchCreditPackages.find((p) => p.id === input.packageId);
    if (!pkg) throw ApiError.validation([{ field: 'packageId', message: 'Unknown package' }]);

    const payment = await Payment.create({
      userId: user.id,
      purpose: 'search_credits',
      amountCents: pkg.priceCents,
      currency: appConfig.currency,
      credits: pkg.credits,
      packageId: pkg.id,
      provider: paymentsMocked ? 'mock' : 'stripe',
    });
    return this.startCheckout(payment, user, `${pkg.name} search pack`, `${pkg.credits} creator searches`);
  }

  async listMine(userId: string) {
    return Payment.findAll({
      where: { userId },
      attributes: { exclude: ['providerSessionId', 'metadata'] },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
  }

  async getMine(userId: string, id: string) {
    const payment = await Payment.findOne({ where: { id, userId }, attributes: { exclude: ['providerSessionId', 'metadata'] } });
    if (!payment) throw ApiError.notFound('Payment not found');
    return payment;
  }

  /** Dev helper: simulates a successful checkout when Stripe is not configured. */
  async confirmMock(userId: string, id: string) {
    if (!paymentsMocked || isProd) throw ApiError.notFound();
    const payment = await Payment.findOne({ where: { id, userId } });
    if (!payment) throw ApiError.notFound('Payment not found');
    await this.fulfill(payment.id, `mock_${Date.now()}`);
    return this.getMine(userId, id);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    const event = constructWebhookEvent(rawBody, signature);
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid' && session.metadata?.paymentId) {
          const pi = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null);
          await this.fulfill(session.metadata.paymentId, pi);
        }
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const status = event.type === 'checkout.session.expired' ? 'cancelled' : 'failed';
        if (session.metadata?.paymentId) await Payment.update({ status }, { where: { id: session.metadata.paymentId, status: 'pending' } });
        break;
      }
      default:
        logger.debug(`Unhandled Stripe event ${event.type}`);
    }
    return { received: true };
  }

  /** Idempotent: safe to call multiple times for the same payment (webhook retries). */
  async fulfill(paymentId: string, providerPaymentId: string | null) {
    await sequelize.transaction(async (transaction) => {
      const payment = await Payment.findByPk(paymentId, { lock: transaction.LOCK.UPDATE, transaction });
      if (!payment) throw ApiError.notFound('Payment not found');
      if (payment.status === 'succeeded') return;

      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.providerPaymentId = providerPaymentId;
      await payment.save({ transaction });

      if (payment.purpose === 'creator_registration') {
        await CreatorProfile.update({ isListed: true, listedAt: new Date() }, { where: { userId: payment.userId }, transaction });
      } else {
        await User.increment('searchCredits', { by: payment.credits, where: { id: payment.userId }, transaction });
      }
    });
    logger.info(`Payment ${paymentId} fulfilled`);
  }

  // ---------------------------------------------------------------------------

  private async creatorRegistrationCheckout(user: User) {
    if (user.role !== 'creator') throw ApiError.forbidden('Only creators can activate a creator listing');
    const profile = await CreatorProfile.findOne({
      where: { userId: user.id },
      include: [{ model: SocialAccount, as: 'socialAccounts', attributes: ['id'] }],
    });
    if (!profile) throw ApiError.notFound('Creator profile not found');
    if (profile.isListed) throw ApiError.conflict('Your profile is already listed');

    const checklist = creatorService.listingChecklist(profile);
    if (!checklist.ready) {
      throw ApiError.validation(
        checklist.items.filter((i) => !i.done).map((i) => ({ field: i.key, message: i.label })),
        'Complete your profile before activating your listing',
      );
    }

    // Founding creators (launch promo) and a zero fee skip the checkout entirely
    const foundingUsed = appConfig.foundingCreatorFreeSlots > 0 ? await CreatorProfile.count({ where: { isFounding: true } }) : 0;
    const isFounding = foundingUsed < appConfig.foundingCreatorFreeSlots;
    if (isFounding || appConfig.creatorRegistrationFeeCents === 0) {
      await sequelize.transaction(async (transaction) => {
        await Payment.create(
          {
            userId: user.id,
            purpose: 'creator_registration',
            status: 'succeeded',
            amountCents: 0,
            currency: appConfig.currency,
            provider: 'founding',
            paidAt: new Date(),
            metadata: { reason: isFounding ? 'founding_creator' : 'free_listing' },
          },
          { transaction },
        );
        await profile.update({ isListed: true, isFounding, listedAt: new Date() }, { transaction });
      });
      return { activated: true, checkoutUrl: null, paymentId: null };
    }

    const payment = await Payment.create({
      userId: user.id,
      purpose: 'creator_registration',
      amountCents: appConfig.creatorRegistrationFeeCents,
      currency: appConfig.currency,
      provider: paymentsMocked ? 'mock' : 'stripe',
    });
    return this.startCheckout(payment, user, `${env.APP_NAME} creator listing`, 'One-time verified creator registration fee');
  }

  private async startCheckout(payment: Payment, user: User, name: string, description: string) {
    if (paymentsMocked) {
      return { activated: false, paymentId: payment.id, checkoutUrl: `${env.FRONTEND_URL}/checkout/mock?paymentId=${payment.id}` };
    }
    const session = await createCheckoutSession({
      paymentId: payment.id,
      userId: user.id,
      email: user.email,
      name,
      description,
      amountCents: payment.amountCents,
      currency: payment.currency,
      successUrl: `${env.FRONTEND_URL}/checkout/success?paymentId=${payment.id}`,
      cancelUrl: `${env.FRONTEND_URL}/checkout/cancelled?paymentId=${payment.id}`,
    });
    await payment.update({ providerSessionId: session.id });
    return { activated: false, paymentId: payment.id, checkoutUrl: session.url };
  }
}

export const paymentService = new PaymentService();
