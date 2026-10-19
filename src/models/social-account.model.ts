import {
  DataTypes,
  Model,
  Op,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type WhereOptions,
} from "sequelize";
import { sequelize } from "../configs/database";
import type { SocialPlatform, StatsSource, SyncStatus } from "../types";

export class SocialAccount extends Model<
  InferAttributes<SocialAccount>,
  InferCreationAttributes<SocialAccount>
> {
  declare id: CreationOptional<string>;
  declare creatorProfileId: string;
  declare platform: SocialPlatform;
  declare platformUserId: string;
  /** Facebook: the app-scoped user id that logged in (used by Meta's deletion callback) */
  declare ownerPlatformUserId: CreationOptional<string | null>;
  declare handle: string;
  declare profileUrl: CreationOptional<string | null>;
  declare avatarUrl: CreationOptional<string | null>;
  declare accessTokenEnc: CreationOptional<string | null>;
  declare refreshTokenEnc: CreationOptional<string | null>;
  declare tokenExpiresAt: CreationOptional<Date | null>;
  declare followers: CreationOptional<number>;
  declare following: CreationOptional<number>;
  declare postsCount: CreationOptional<number>;
  declare avgViews: CreationOptional<number>;
  declare avgLikes: CreationOptional<number>;
  declare avgComments: CreationOptional<number>;
  declare engagementRate: CreationOptional<number>;
  /** 'api' = pulled from the platform; 'self_reported' = entered by the creator (Facebook) */
  declare statsSource: CreationOptional<StatsSource>;
  /** When the creator last entered self-reported stats (null until they do) */
  declare statsReportedAt: CreationOptional<Date | null>;
  declare syncStatus: CreationOptional<SyncStatus>;
  declare syncError: CreationOptional<string | null>;
  declare lastSyncedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Tokens must never leave the server. */
  toJSON() {
    const {
      accessTokenEnc: _a,
      refreshTokenEnc: _r,
      tokenExpiresAt: _t,
      ownerPlatformUserId: _o,
      ...rest
    } = this.get({ plain: true });
    return rest;
  }
}

SocialAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    creatorProfileId: { type: DataTypes.UUID, allowNull: false },
    platform: {
      type: DataTypes.ENUM("instagram", "tiktok", "youtube", "facebook"),
      allowNull: false,
    },
    platformUserId: { type: DataTypes.STRING(128), allowNull: false },
    ownerPlatformUserId: { type: DataTypes.STRING(128), allowNull: true },
    handle: { type: DataTypes.STRING(120), allowNull: false },
    profileUrl: { type: DataTypes.STRING(1000), allowNull: true },
    avatarUrl: { type: DataTypes.STRING(1000), allowNull: true },
    accessTokenEnc: { type: DataTypes.TEXT, allowNull: true },
    refreshTokenEnc: { type: DataTypes.TEXT, allowNull: true },
    tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
    followers: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    following: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    postsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    avgViews: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    avgLikes: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    avgComments: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    engagementRate: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        return Number(this.getDataValue("engagementRate") ?? 0);
      },
    },
    statsSource: {
      type: DataTypes.ENUM("api", "self_reported"),
      allowNull: false,
      defaultValue: "api",
    },
    statsReportedAt: { type: DataTypes.DATE, allowNull: true },
    syncStatus: {
      type: DataTypes.ENUM("pending", "ok", "error"),
      allowNull: false,
      defaultValue: "pending",
    },
    syncError: { type: DataTypes.TEXT, allowNull: true },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: "social_accounts", modelName: "SocialAccount" }
);

/**
 * Accounts that may appear publicly (media kit, search cards): everything pulled from an API,
 * and self-reported accounts only once the creator has entered their stats.
 */
export const PUBLIC_SOCIAL_ACCOUNT_WHERE: WhereOptions<SocialAccount> = {
  [Op.or]: [{ statsSource: "api" }, { statsReportedAt: { [Op.ne]: null } }],
};
/** Same rule as raw SQL, for queries aliased `sa`. */
export const PUBLIC_SOCIAL_ACCOUNT_SQL = `(sa.stats_source = 'api' OR sa.stats_reported_at IS NOT NULL)`;

/** Fields shown on creator cards (search, featured) */
export const CARD_SOCIAL_ATTRIBUTES = [
  "platform",
  "handle",
  "followers",
  "engagementRate",
  "avgViews",
  "statsSource",
] as const;
