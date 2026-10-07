import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';
import type { SocialPlatform, SyncStatus } from '../types';

export class SocialAccount extends Model<InferAttributes<SocialAccount>, InferCreationAttributes<SocialAccount>> {
  declare id: CreationOptional<string>;
  declare creatorProfileId: string;
  declare platform: SocialPlatform;
  declare platformUserId: string;
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
  declare syncStatus: CreationOptional<SyncStatus>;
  declare syncError: CreationOptional<string | null>;
  declare lastSyncedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Tokens must never leave the server. */
  toJSON() {
    const { accessTokenEnc: _a, refreshTokenEnc: _r, tokenExpiresAt: _t, ...rest } = this.get({ plain: true });
    return rest;
  }
}

SocialAccount.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    creatorProfileId: { type: DataTypes.UUID, allowNull: false },
    platform: { type: DataTypes.ENUM('instagram', 'tiktok', 'youtube'), allowNull: false },
    platformUserId: { type: DataTypes.STRING(128), allowNull: false },
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
    engagementRate: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0, get() { return Number(this.getDataValue('engagementRate') ?? 0); } },
    syncStatus: { type: DataTypes.ENUM('pending', 'ok', 'error'), allowNull: false, defaultValue: 'pending' },
    syncError: { type: DataTypes.TEXT, allowNull: true },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'social_accounts', modelName: 'SocialAccount' },
);
