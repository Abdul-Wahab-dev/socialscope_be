import crypto from "crypto";
import { Op } from "sequelize";
import { appConfig } from "../configs/app.config";
import { env } from "../configs/env";
import { sequelize } from "../configs/database";
import { SocialAccount, SocialStatSnapshot } from "../models";
import { getSocialProvider } from "../integrations/social";
import { decrypt, encrypt } from "../libs/crypto";
import { signOAuthState, verifyOAuthState } from "../libs/jwt";
import { logger } from "../libs/logger";
import { ApiError } from "../utils/api-error";
import { round2 } from "../utils/helpers";
import type { SocialPlatform } from "../types";
import { creatorService } from "./creator.service";

const REFRESH_BEFORE_EXPIRY_MS = 24 * 3_600_000;

export class SocialAccountService {
  redirectUri(platform: SocialPlatform) {
    return `${env.API_URL}${env.API_PREFIX}/social/${platform}/callback`;
  }

  async list(userId: string) {
    const profile = await creatorService.getByUserId(userId);
    return SocialAccount.findAll({
      where: { creatorProfileId: profile.id },
      order: [["platform", "ASC"]],
    });
  }

  /** Step 1 of OAuth: returns the provider consent URL (state is a signed, 10-minute JWT). */
  async getConnectUrl(userId: string, platform: SocialPlatform) {
    await creatorService.getByUserId(userId); // must be a creator with a profile
    const provider = getSocialProvider(platform);
    const state = signOAuthState({
      sub: userId,
      platform,
      nonce: crypto.randomUUID(),
    });

    const url = provider.getAuthUrl({
      state,
      redirectUri: this.redirectUri(platform),
      userId,
    });
    console.log(
      "OAuth connect URL:",
      url,
      "state:",
      state,
      "redirectUri:",
      this.redirectUri(platform)
    );
    return { url };
  }

  /** Step 2 of OAuth: exchange code, pull stats, upsert the account. Returns the account. */
  async handleCallback(platform: SocialPlatform, code: string, state: string) {
    let userId: string;
    try {
      const payload = verifyOAuthState(state);
      if (payload.platform !== platform) throw new Error("platform mismatch");
      userId = payload.sub;
    } catch {
      throw ApiError.badRequest(
        "Connection link expired or invalid. Please try again."
      );
    }

    const profile = await creatorService.getByUserId(userId);
    const provider = getSocialProvider(platform);
    const tokens = await provider.exchangeCode({
      code,
      redirectUri: this.redirectUri(platform),
    });
    const stats = await provider.fetchStats(tokens.accessToken);

    const ownedByOther = await SocialAccount.findOne({
      where: {
        platform,
        platformUserId: stats.platformUserId,
        creatorProfileId: { [Op.ne]: profile.id },
      },
    });
    if (ownedByOther)
      throw ApiError.conflict(
        "This social account is already connected to another creator"
      );

    const engagementRate = this.engagementRate(
      stats.followers,
      stats.avgLikes,
      stats.avgComments
    );
    const values = {
      creatorProfileId: profile.id,
      platform,
      platformUserId: stats.platformUserId,
      handle: stats.handle,
      profileUrl: stats.profileUrl,
      avatarUrl: stats.avatarUrl,
      accessTokenEnc: encrypt(tokens.accessToken),
      refreshTokenEnc: tokens.refreshToken
        ? encrypt(tokens.refreshToken)
        : null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      followers: stats.followers,
      following: stats.following,
      postsCount: stats.postsCount,
      avgViews: stats.avgViews,
      avgLikes: stats.avgLikes,
      avgComments: stats.avgComments,
      engagementRate,
      syncStatus: "ok" as const,
      syncError: null,
      lastSyncedAt: new Date(),
    };

    const account = await sequelize.transaction(async (transaction) => {
      const existing = await SocialAccount.findOne({
        where: { creatorProfileId: profile.id, platform },
        transaction,
      });
      const saved = existing
        ? await existing.update(values, { transaction })
        : await SocialAccount.create(values, { transaction });
      await SocialStatSnapshot.create(
        {
          socialAccountId: saved.id,
          followers: stats.followers,
          avgViews: stats.avgViews,
          engagementRate,
        },
        { transaction }
      );
      return saved;
    });

    // Use the creator's first connected avatar if they haven't set one
    if (!profile.avatarUrl && stats.avatarUrl)
      await profile.update({ avatarUrl: stats.avatarUrl });
    await creatorService.recomputeAggregates(profile.id);
    return account;
  }

  async disconnect(userId: string, accountId: string) {
    const account = await this.findOwned(userId, accountId);
    await account.destroy();
    await creatorService.recomputeAggregates(account.creatorProfileId);
  }

  async manualSync(userId: string, accountId: string) {
    const account = await this.findOwned(userId, accountId);
    const cooldownMs = appConfig.manualSyncCooldownMinutes * 60_000;
    if (
      account.lastSyncedAt &&
      Date.now() - account.lastSyncedAt.getTime() < cooldownMs
    ) {
      const retryIn = Math.ceil(
        (cooldownMs - (Date.now() - account.lastSyncedAt.getTime())) / 60_000
      );
      throw ApiError.tooMany(
        `Stats were refreshed recently. Try again in ${retryIn} minute(s).`,
        { retryInMinutes: retryIn }
      );
    }
    return this.syncAccount(account, { throwOnError: true });
  }

  async history(userId: string, accountId: string) {
    const account = await this.findOwned(userId, accountId);
    return SocialStatSnapshot.findAll({
      where: { socialAccountId: account.id },
      order: [["capturedAt", "ASC"]],
      limit: 180,
    });
  }

  /** Background job entry point. */
  async syncStaleAccounts(batchSize = 50) {
    const staleBefore = new Date(
      Date.now() - appConfig.autoSyncStaleHours * 3_600_000
    );
    const accounts = await SocialAccount.findAll({
      where: {
        [Op.or]: [
          { lastSyncedAt: { [Op.is]: null } },
          { lastSyncedAt: { [Op.lt]: staleBefore } },
        ],
      },
      order: [["lastSyncedAt", "ASC NULLS FIRST"]],
      limit: batchSize,
    });
    let ok = 0;
    let failed = 0;
    for (const account of accounts) {
      const res = await this.syncAccount(account, { throwOnError: false });
      if (res.syncStatus === "ok") ok++;
      else failed++;
    }
    return { processed: accounts.length, ok, failed };
  }

  /**
   * Retention rule (required by YouTube API policies and promised in the Privacy Policy):
   * platform data that could not be refreshed for 30 days — e.g. access was revoked — is deleted.
   * The last successful sync is the newest stats snapshot.
   */
  async purgeUnrefreshedAccounts(days = 30) {
    const [rows] = await sequelize.query(
      `SELECT sa.id, sa.creator_profile_id AS "creatorProfileId"
         FROM social_accounts sa
         LEFT JOIN LATERAL (SELECT MAX(captured_at) AS last_ok FROM social_stat_snapshots s WHERE s.social_account_id = sa.id) x ON true
        WHERE COALESCE(x.last_ok, sa.created_at) < NOW() - make_interval(days => :days)`,
      { replacements: { days } }
    );
    const stale = rows as Array<{ id: string; creatorProfileId: string }>;
    if (!stale.length) return { deleted: 0 };
    await SocialAccount.destroy({ where: { id: stale.map((r) => r.id) } });
    for (const profileId of new Set(stale.map((r) => r.creatorProfileId)))
      await creatorService.recomputeAggregates(profileId);
    return { deleted: stale.length };
  }

  async syncAccount(account: SocialAccount, opts: { throwOnError: boolean }) {
    try {
      const provider = getSocialProvider(account.platform);
      if (!account.accessTokenEnc)
        throw ApiError.badRequest("Account needs to be reconnected");

      let accessToken = decrypt(account.accessTokenEnc);
      const refreshToken = account.refreshTokenEnc
        ? decrypt(account.refreshTokenEnc)
        : null;

      if (
        account.tokenExpiresAt &&
        account.tokenExpiresAt.getTime() - Date.now() < REFRESH_BEFORE_EXPIRY_MS
      ) {
        const refreshed = await provider.refreshTokens({
          accessToken,
          refreshToken,
        });
        if (refreshed) {
          accessToken = refreshed.accessToken;
          account.accessTokenEnc = encrypt(refreshed.accessToken);
          if (refreshed.refreshToken)
            account.refreshTokenEnc = encrypt(refreshed.refreshToken);
          account.tokenExpiresAt = refreshed.expiresAt ?? null;
        }
      }

      const stats = await provider.fetchStats(accessToken);
      console.log(stats, "stats");
      const engagementRate = this.engagementRate(
        stats.followers,
        stats.avgLikes,
        stats.avgComments
      );
      await account.update({
        handle: stats.handle,
        profileUrl: stats.profileUrl,
        avatarUrl: stats.avatarUrl,
        followers: stats.followers,
        following: stats.following,
        postsCount: stats.postsCount,
        avgViews: stats.avgViews,
        avgLikes: stats.avgLikes,
        avgComments: stats.avgComments,
        engagementRate,
        syncStatus: "ok",
        syncError: null,
        lastSyncedAt: new Date(),
      });
      await SocialStatSnapshot.create({
        socialAccountId: account.id,
        followers: stats.followers,
        avgViews: stats.avgViews,
        engagementRate,
      });
      await creatorService.recomputeAggregates(account.creatorProfileId);
      return account;
    } catch (err) {
      logger.warn(
        `Sync failed for social account ${account.id} (${account.platform})`,
        err instanceof Error ? err.message : err
      );
      await account.update({
        syncStatus: "error",
        syncError:
          err instanceof ApiError
            ? err.message
            : "Could not refresh stats. You may need to reconnect this account.",
        lastSyncedAt: new Date(),
      });
      if (opts.throwOnError)
        throw err instanceof ApiError
          ? err
          : ApiError.badGateway("Could not refresh stats from the platform");
      return account;
    }
  }

  engagementRate(followers: number, avgLikes: number, avgComments: number) {
    if (!followers) return 0;
    return Math.min(
      999.99,
      round2(((avgLikes + avgComments) / followers) * 100)
    );
  }

  private async findOwned(userId: string, accountId: string) {
    const profile = await creatorService.getByUserId(userId);
    const account = await SocialAccount.findOne({
      where: { id: accountId, creatorProfileId: profile.id },
    });
    if (!account) throw ApiError.notFound("Social account not found");
    return account;
  }
}

export const socialAccountService = new SocialAccountService();
