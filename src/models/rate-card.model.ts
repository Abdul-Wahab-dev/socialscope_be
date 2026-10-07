import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';
import type { DeliverableType, SocialPlatform } from '../types';

export class RateCard extends Model<InferAttributes<RateCard>, InferCreationAttributes<RateCard>> {
  declare id: CreationOptional<string>;
  declare creatorProfileId: string;
  declare platform: SocialPlatform | null;
  declare deliverable: DeliverableType;
  declare title: string;
  declare description: string | null;
  declare priceCents: number;
  declare currency: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RateCard.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    creatorProfileId: { type: DataTypes.UUID, allowNull: false },
    platform: { type: DataTypes.ENUM('instagram', 'tiktok', 'youtube'), allowNull: true },
    deliverable: { type: DataTypes.ENUM('post', 'reel', 'story', 'video', 'short', 'live', 'ugc', 'other'), allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    priceCents: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'USD' },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'rate_cards', modelName: 'RateCard' },
);
