import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../configs/database';
import type { SocialAccount } from './social-account.model';
import type { RateCard } from './rate-card.model';
import type { PortfolioItem } from './portfolio-item.model';
import type { User } from './user.model';

export class CreatorProfile extends Model<InferAttributes<CreatorProfile>, InferCreationAttributes<CreatorProfile>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare username: string;
  declare displayName: string;
  declare bio: CreationOptional<string | null>;
  declare avatarUrl: CreationOptional<string | null>;
  declare categories: CreationOptional<string[]>;
  declare languages: CreationOptional<string[]>;
  declare country: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare contactEmail: CreationOptional<string | null>;
  declare isAvailable: CreationOptional<boolean>;
  declare isListed: CreationOptional<boolean>;
  declare isFounding: CreationOptional<boolean>;
  declare listedAt: CreationOptional<Date | null>;
  declare totalFollowers: CreationOptional<number>;
  declare avgEngagementRate: CreationOptional<number>;
  declare minPriceCents: CreationOptional<number | null>;
  declare profileViews: CreationOptional<number>;
  declare searchAppearances: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare socialAccounts?: NonAttribute<SocialAccount[]>;
  declare rateCards?: NonAttribute<RateCard[]>;
  declare portfolioItems?: NonAttribute<PortfolioItem[]>;
}

CreatorProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    username: { type: DataTypes.CITEXT, allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING(80), allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: true },
    avatarUrl: { type: DataTypes.STRING(1000), allowNull: true },
    categories: { type: DataTypes.ARRAY(DataTypes.STRING(40)), allowNull: false, defaultValue: [] },
    languages: { type: DataTypes.ARRAY(DataTypes.STRING(40)), allowNull: false, defaultValue: [] },
    country: { type: DataTypes.CHAR(2), allowNull: true },
    city: { type: DataTypes.STRING(80), allowNull: true },
    contactEmail: { type: DataTypes.STRING(255), allowNull: true },
    isAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isListed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isFounding: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    listedAt: { type: DataTypes.DATE, allowNull: true },
    totalFollowers: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    avgEngagementRate: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0, get() { return Number(this.getDataValue('avgEngagementRate') ?? 0); } },
    minPriceCents: { type: DataTypes.INTEGER, allowNull: true },
    profileViews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    searchAppearances: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'creator_profiles', modelName: 'CreatorProfile' },
);
