import { Op, type Order, type WhereOptions } from 'sequelize';
import { sequelize } from '../configs/database';
import { appConfig } from '../configs/app.config';
import { CreatorProfile, SearchLog, SocialAccount, User } from '../models';
import type { SearchChargeSource } from '../models/search-log.model';
import { ApiError } from '../utils/api-error';
import { buildMeta } from '../utils/pagination';
import { stableHash, startOfWeekUTC, addDays } from '../utils/helpers';
import type { SearchCreatorsInput } from '../validations/search.validation';
import type { AuthUser } from '../types';
import { brandService } from './brand.service';

export interface SearchActor {
  user?: AuthUser;
  guestId?: string;
  ip?: string;
}

export type SearchQuota =
  | { type: 'guest'; used: number; limit: number; remaining: number }
  | { type: 'user'; weeklyUsed: number; weeklyLimit: number; weeklyRemaining: number; credits: number; resetsAt: string };

const CARD_ATTRIBUTES = [
  'id',
  'username',
  'displayName',
  'avatarUrl',
  'bio',
  'categories',
  'languages',
  'country',
  'city',
  'isAvailable',
  'isFounding',
  'totalFollowers',
  'avgEngagementRate',
  'minPriceCents',
] as const;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export class SearchService {
  async search(input: SearchCreatorsInput, actor: SearchActor) {
    const { page, limit, sort, ...filters } = input;
    const filtersHash = stableHash(filters as Record<string, unknown>);

    // Charge quota only for *new* searches; paging / re-sorting the same filters is free for a while.
    const quota = await this.chargeIfNewSearch(filters as Record<string, unknown>, filtersHash, actor);

    const where = this.buildWhere(input);
    const { rows, count } = await CreatorProfile.findAndCountAll({
      where,
      attributes: [...CARD_ATTRIBUTES],
      include: [
        {
          model: SocialAccount,
          as: 'socialAccounts',
          attributes: ['platform', 'handle', 'followers', 'engagementRate', 'avgViews'],
          separate: true,
        },
      ],
      order: this.buildOrder(sort),
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    if (rows.length) {
      await CreatorProfile.increment('searchAppearances', { where: { id: rows.map((r) => r.id) } });
    }
    if (quota.logId) await SearchLog.update({ resultsCount: count }, { where: { id: quota.logId } });

    const saved = actor.user?.role === 'brand' ? await brandService.savedIds(actor.user.id) : new Set<string>();
    return {
      items: rows.map((r) => ({ ...r.toJSON(), isSaved: saved.has(r.id) })),
      meta: buildMeta(page, limit, count),
      quota: quota.state,
    };
  }

  async getQuota(actor: SearchActor): Promise<SearchQuota> {
    if (actor.user) {
      const user = await User.findByPk(actor.user.id, { attributes: ['id', 'searchCredits'] });
      if (!user) throw ApiError.unauthorized();
      return this.userQuota(user.id, user.searchCredits);
    }
    return this.guestQuota(actor);
  }

  // ---------------------------------------------------------------------------

  private async chargeIfNewSearch(filters: Record<string, unknown>, filtersHash: string, actor: SearchActor) {
    const reuseSince = new Date(Date.now() - appConfig.searchReuseWindowMinutes * 60_000);
    const actorWhere = actor.user ? { userId: actor.user.id } : { guestId: actor.guestId ?? null, userId: null };

    const recent = await SearchLog.findOne({ where: { ...actorWhere, filtersHash, createdAt: { [Op.gte]: reuseSince } } });
    if (recent) return { logId: null, state: await this.getQuota(actor) };

    if (!actor.user) {
      const quota = await this.guestQuota(actor);
      // Also cap per-IP per day, so clearing cookies doesn't give unlimited searches.
      const ipCount = actor.ip
        ? await SearchLog.count({ where: { ipAddress: actor.ip, userId: null, createdAt: { [Op.gte]: addDays(new Date(), -1) } } })
        : 0;
      if (quota.remaining <= 0 || ipCount >= appConfig.guestSearchLimit * 5) {
        throw new ApiError(403, `You've used your ${appConfig.guestSearchLimit} free searches. Create a free account to get ${appConfig.weeklyFreeSearchLimit} searches every week.`, 'GUEST_SEARCH_LIMIT', { quota });
      }
      const log = await SearchLog.create({ userId: null, guestId: actor.guestId ?? null, ipAddress: actor.ip ?? null, filters, filtersHash, chargedFrom: 'guest' });
      return { logId: log.id, state: { ...quota, used: quota.used + 1, remaining: quota.remaining - 1 } as SearchQuota };
    }

    const userId = actor.user.id;
    const logId = await sequelize.transaction(async (transaction) => {
      // Row lock serialises concurrent searches by the same user
      const user = await User.findByPk(userId, { lock: transaction.LOCK.UPDATE, transaction });
      if (!user) throw ApiError.unauthorized();

      const weeklyUsed = await SearchLog.count({
        where: { userId, chargedFrom: 'weekly_free', createdAt: { [Op.gte]: startOfWeekUTC() } },
        transaction,
      });

      let chargedFrom: SearchChargeSource;
      if (weeklyUsed < appConfig.weeklyFreeSearchLimit) chargedFrom = 'weekly_free';
      else if (user.searchCredits > 0) {
        chargedFrom = 'credit';
        await user.decrement('searchCredits', { by: 1, transaction });
      } else {
        throw ApiError.paymentRequired('You have used all your free searches for this week. Buy a search pack to keep searching.', {
          quota: await this.userQuota(userId, user.searchCredits),
        });
      }

      const log = await SearchLog.create({ userId, guestId: null, ipAddress: actor.ip ?? null, filters, filtersHash, chargedFrom }, { transaction });
      return log.id;
    });

    return { logId, state: await this.getQuota(actor) };
  }

  private async guestQuota(actor: SearchActor): Promise<Extract<SearchQuota, { type: 'guest' }>> {
    const used = actor.guestId ? await SearchLog.count({ where: { guestId: actor.guestId, userId: null } }) : 0;
    const limit = appConfig.guestSearchLimit;
    return { type: 'guest', used, limit, remaining: Math.max(0, limit - used) };
  }

  private async userQuota(userId: string, credits: number): Promise<SearchQuota> {
    const weekStart = startOfWeekUTC();
    const weeklyUsed = await SearchLog.count({ where: { userId, chargedFrom: 'weekly_free', createdAt: { [Op.gte]: weekStart } } });
    const weeklyLimit = appConfig.weeklyFreeSearchLimit;
    return {
      type: 'user',
      weeklyUsed,
      weeklyLimit,
      weeklyRemaining: Math.max(0, weeklyLimit - weeklyUsed),
      credits,
      resetsAt: addDays(weekStart, 7).toISOString(),
    };
  }

  private buildWhere(f: SearchCreatorsInput): WhereOptions {
    const and: WhereOptions[] = [{ isListed: true }];

    if (f.q) {
      const like = `%${escapeLike(f.q)}%`;
      and.push({
        [Op.or]: [
          { displayName: { [Op.iLike]: like } },
          { username: { [Op.iLike]: like } },
          { bio: { [Op.iLike]: like } },
          { city: { [Op.iLike]: like } },
        ],
      });
    }
    if (f.categories?.length) and.push({ categories: { [Op.overlap]: f.categories } });
    if (f.country) and.push({ country: f.country });
    if (f.city) and.push({ city: { [Op.iLike]: escapeLike(f.city) } });
    if (f.language) and.push({ languages: { [Op.contains]: [f.language.toLowerCase()] } });
    if (f.availableOnly) and.push({ isAvailable: true });
    if (f.maxPrice !== undefined) and.push({ minPriceCents: { [Op.lte]: Math.round(f.maxPrice * 100) } });

    if (f.platform) {
      // Follower / engagement filters apply to the selected platform's account
      const conds = [`sa.platform = ${sequelize.escape(f.platform)}`];
      if (f.minFollowers !== undefined) conds.push(`sa.followers >= ${Number(f.minFollowers)}`);
      if (f.maxFollowers !== undefined) conds.push(`sa.followers <= ${Number(f.maxFollowers)}`);
      if (f.minEngagement !== undefined) conds.push(`sa.engagement_rate >= ${Number(f.minEngagement)}`);
      and.push(
        sequelize.where(
          sequelize.literal(`EXISTS (SELECT 1 FROM social_accounts sa WHERE sa.creator_profile_id = "CreatorProfile"."id" AND ${conds.join(' AND ')})`),
          Op.eq,
          true,
        ),
      );
    } else {
      if (f.minFollowers !== undefined) and.push({ totalFollowers: { [Op.gte]: f.minFollowers } });
      if (f.maxFollowers !== undefined) and.push({ totalFollowers: { [Op.lte]: f.maxFollowers } });
      if (f.minEngagement !== undefined) and.push({ avgEngagementRate: { [Op.gte]: f.minEngagement } });
    }
    return { [Op.and]: and };
  }

  private buildOrder(sort: SearchCreatorsInput['sort']): Order {
    switch (sort) {
      case 'followers_desc':
        return [['totalFollowers', 'DESC'], ['id', 'ASC']];
      case 'engagement_desc':
        return [['avgEngagementRate', 'DESC'], ['id', 'ASC']];
      case 'price_asc':
        return [sequelize.literal('"CreatorProfile"."min_price_cents" ASC NULLS LAST'), ['id', 'ASC']];
      case 'newest':
        return [['listedAt', 'DESC NULLS LAST'], ['id', 'ASC']];
      case 'relevance':
      default:
        // Blend reach and engagement so neither huge-but-dead nor tiny accounts dominate
        return [[sequelize.literal('("CreatorProfile"."avg_engagement_rate" + 1) * LN("CreatorProfile"."total_followers" + 10)'), 'DESC'], ['id', 'ASC']];
    }
  }
}

export const searchService = new SearchService();
