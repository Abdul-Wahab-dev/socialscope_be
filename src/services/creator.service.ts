import { Op } from 'sequelize';
import { sequelize } from '../configs/database';
import { Category, CreatorProfile, PortfolioItem, RateCard, SocialAccount, SocialStatSnapshot } from '../models';
import { ApiError } from '../utils/api-error';
import { round2 } from '../utils/helpers';
import type { UpdateCreatorProfileInput } from '../validations/creator.validation';

const PUBLIC_PROFILE_ATTRIBUTES = [
  'id',
  'username',
  'displayName',
  'bio',
  'avatarUrl',
  'categories',
  'languages',
  'country',
  'city',
  'isAvailable',
  'isListed',
  'isFounding',
  'totalFollowers',
  'avgEngagementRate',
  'minPriceCents',
  'createdAt',
] as const;

export class CreatorService {
  async getByUserId(userId: string): Promise<CreatorProfile> {
    const profile = await CreatorProfile.findOne({ where: { userId } });
    if (!profile) throw ApiError.notFound('Creator profile not found');
    return profile;
  }

  async getMyProfile(userId: string) {
    const profile = await CreatorProfile.findOne({
      where: { userId },
      include: [
        { model: SocialAccount, as: 'socialAccounts' },
        { model: RateCard, as: 'rateCards' },
        { model: PortfolioItem, as: 'portfolioItems' },
      ],
      order: [
        [{ model: RateCard, as: 'rateCards' }, 'priceCents', 'ASC'],
        [{ model: PortfolioItem, as: 'portfolioItems' }, 'createdAt', 'DESC'],
      ],
    });
    if (!profile) throw ApiError.notFound('Creator profile not found');
    return { ...profile.toJSON(), listingChecklist: this.listingChecklist(profile) };
  }

  async updateMyProfile(userId: string, input: UpdateCreatorProfileInput) {
    const profile = await this.getByUserId(userId);

    if (input.username && input.username !== profile.username) {
      const taken = await CreatorProfile.findOne({ where: { username: input.username, id: { [Op.ne]: profile.id } } });
      if (taken) throw ApiError.conflict('This username is already taken', { field: 'username' });
    }
    if (input.categories?.length) {
      const valid = await Category.count({ where: { slug: input.categories } });
      if (valid !== new Set(input.categories).size) {
        throw ApiError.validation([{ field: 'categories', message: 'One or more categories are invalid' }]);
      }
      input.categories = [...new Set(input.categories)];
    }
    if (input.languages) input.languages = [...new Set(input.languages.map((l) => l.toLowerCase()))];

    await profile.update(input);
    return this.getMyProfile(userId);
  }

  async isUsernameAvailable(username: string, userId?: string) {
    const existing = await CreatorProfile.findOne({ where: { username }, attributes: ['id', 'userId'] });
    return { username, available: !existing || existing.userId === userId };
  }

  /** Public media kit. Unlisted profiles are only visible to their owner. */
  async getPublicProfile(username: string, viewerUserId?: string) {
    const profile = await CreatorProfile.findOne({
      where: { username },
      attributes: [...PUBLIC_PROFILE_ATTRIBUTES, 'userId'],
      include: [
        {
          model: SocialAccount,
          as: 'socialAccounts',
          attributes: ['id', 'platform', 'handle', 'profileUrl', 'avatarUrl', 'followers', 'postsCount', 'avgViews', 'avgLikes', 'avgComments', 'engagementRate', 'lastSyncedAt'],
        },
        { model: RateCard, as: 'rateCards', attributes: ['id', 'platform', 'deliverable', 'title', 'description', 'priceCents', 'currency'] },
        { model: PortfolioItem, as: 'portfolioItems', attributes: ['id', 'title', 'brandName', 'url', 'description'] },
      ],
      order: [[{ model: RateCard, as: 'rateCards' }, 'priceCents', 'ASC']],
    });

    const isOwner = profile && viewerUserId === profile.userId;
    if (!profile || (!profile.isListed && !isOwner)) throw ApiError.notFound('Creator not found');

    if (!isOwner) await profile.increment('profileViews');

    const { userId: _u, ...data } = profile.toJSON();
    return { ...data, isOwnerPreview: Boolean(isOwner) };
  }

  /**
   * Small public showcase for the landing page (does not consume search quota).
   * Deliberately limited so it can't replace search.
   */
  async getFeatured(limit = 8) {
    return CreatorProfile.findAll({
      where: { isListed: true, isAvailable: true, totalFollowers: { [Op.gt]: 0 } },
      attributes: ['id', 'username', 'displayName', 'avatarUrl', 'bio', 'categories', 'languages', 'country', 'city', 'isAvailable', 'isFounding', 'totalFollowers', 'avgEngagementRate', 'minPriceCents'],
      include: [{ model: SocialAccount, as: 'socialAccounts', attributes: ['platform', 'handle', 'followers', 'engagementRate', 'avgViews'], separate: true }],
      order: [[sequelize.literal('("CreatorProfile"."avg_engagement_rate" + 1) * LN("CreatorProfile"."total_followers" + 10)'), 'DESC']],
      limit: Math.min(Math.max(limit, 1), 12),
    });
  }

  /** Insights for the creator dashboard: views, search appearances and follower history. */
  async getInsights(userId: string) {
    const profile = await this.getByUserId(userId);
    const accounts = await SocialAccount.findAll({ where: { creatorProfileId: profile.id }, attributes: ['id', 'platform', 'followers'] });
    const since = new Date(Date.now() - 90 * 86_400_000);
    const snapshots = await SocialStatSnapshot.findAll({
      where: { socialAccountId: accounts.map((a) => a.id), capturedAt: { [Op.gte]: since } },
      order: [['capturedAt', 'ASC']],
    });
    const platformById = new Map(accounts.map((a) => [a.id, a.platform]));
    return {
      profileViews: profile.profileViews,
      searchAppearances: profile.searchAppearances,
      totalFollowers: profile.totalFollowers,
      avgEngagementRate: profile.avgEngagementRate,
      history: snapshots.map((s) => ({
        platform: platformById.get(s.socialAccountId),
        followers: s.followers,
        engagementRate: s.engagementRate,
        capturedAt: s.capturedAt,
      })),
    };
  }

  /** Recomputes denormalised search fields after social sync or rate card changes. */
  async recomputeAggregates(creatorProfileId: string) {
    const [accounts, cheapest] = await Promise.all([
      SocialAccount.findAll({ where: { creatorProfileId }, attributes: ['followers', 'engagementRate'] }),
      RateCard.min<number, RateCard>('priceCents', { where: { creatorProfileId } }),
    ]);
    const totalFollowers = accounts.reduce((sum, a) => sum + Number(a.followers), 0);
    const rated = accounts.filter((a) => Number(a.followers) > 0);
    // follower-weighted engagement, so a tiny account doesn't skew the headline number
    const avgEngagementRate = totalFollowers > 0 ? round2(rated.reduce((s, a) => s + Number(a.engagementRate) * Number(a.followers), 0) / totalFollowers) : 0;

    await CreatorProfile.update(
      { totalFollowers, avgEngagementRate, minPriceCents: cheapest ?? null },
      { where: { id: creatorProfileId } },
    );
  }

  listingChecklist(profile: CreatorProfile) {
    const items = [
      { key: 'displayName', label: 'Add a display name', done: Boolean(profile.displayName) },
      { key: 'categories', label: 'Pick at least one category', done: (profile.categories ?? []).length > 0 },
      { key: 'country', label: 'Set your country', done: Boolean(profile.country) },
      { key: 'social', label: 'Connect at least one social account', done: (profile.socialAccounts?.length ?? 0) > 0 },
    ];
    return { items, ready: items.every((i) => i.done) };
  }
}

export const creatorService = new CreatorService();
