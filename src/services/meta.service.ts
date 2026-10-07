import { appConfig } from '../configs/app.config';
import { paymentsMocked, env } from '../configs/env';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../configs/database';
import { Category, CreatorProfile, SocialAccount } from '../models';
import { DELIVERABLE_TYPES, SOCIAL_PLATFORMS } from '../types';

export class MetaService {
  async getCategories() {
    return Category.findAll({ order: [['sortOrder', 'ASC']] });
  }

  async getPublicConfig() {
    const foundingUsed = appConfig.foundingCreatorFreeSlots > 0 ? await CreatorProfile.count({ where: { isFounding: true } }) : 0;
    return {
      currency: appConfig.currency,
      creatorRegistrationFeeCents: appConfig.creatorRegistrationFeeCents,
      foundingSlotsRemaining: Math.max(0, appConfig.foundingCreatorFreeSlots - foundingUsed),
      guestSearchLimit: appConfig.guestSearchLimit,
      weeklyFreeSearchLimit: appConfig.weeklyFreeSearchLimit,
      searchCreditPackages: appConfig.searchCreditPackages,
      platforms: SOCIAL_PLATFORMS,
      deliverableTypes: DELIVERABLE_TYPES,
      paymentsMode: paymentsMocked ? 'mock' : 'stripe',
      socialMode: env.SOCIAL_OAUTH_MOCK ? 'mock' : 'live',
    };
  }

  /** Public marketplace numbers for the landing page (cache for a few minutes at the edge). */
  async getPublicStats() {
    const [row] = await sequelize.query<{ creators: number; reach: number; countries: number }>(
      `SELECT COUNT(*)::int AS creators,
              COALESCE(SUM(total_followers), 0)::bigint AS reach,
              COUNT(DISTINCT country)::int AS countries
         FROM creator_profiles WHERE is_listed = true`,
      { type: QueryTypes.SELECT },
    );
    const categoryRows = await sequelize.query<{ slug: string; count: number }>(
      `SELECT unnest(categories) AS slug, COUNT(*)::int AS count
         FROM creator_profiles WHERE is_listed = true GROUP BY 1`,
      { type: QueryTypes.SELECT },
    );
    const platformRows = await SocialAccount.findAll({
      attributes: ['platform', [sequelize.fn('COUNT', sequelize.col('SocialAccount.id')), 'count']],
      include: [{ model: CreatorProfile, as: 'creatorProfile', attributes: [], where: { isListed: true } }],
      group: ['platform'],
      raw: true,
    });
    return {
      listedCreators: Number(row?.creators ?? 0),
      totalReach: Number(row?.reach ?? 0),
      countries: Number(row?.countries ?? 0),
      categoryCounts: Object.fromEntries(categoryRows.map((r) => [r.slug, Number(r.count)])),
      platformCounts: Object.fromEntries((platformRows as unknown as Array<{ platform: string; count: string }>).map((r) => [r.platform, Number(r.count)])),
    };
  }
}

export const metaService = new MetaService();
