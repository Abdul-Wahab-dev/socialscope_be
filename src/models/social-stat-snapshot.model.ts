import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';

export class SocialStatSnapshot extends Model<InferAttributes<SocialStatSnapshot>, InferCreationAttributes<SocialStatSnapshot>> {
  declare id: CreationOptional<number>;
  declare socialAccountId: string;
  declare followers: number;
  declare avgViews: number;
  declare engagementRate: number;
  declare capturedAt: CreationOptional<Date>;
}

SocialStatSnapshot.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    socialAccountId: { type: DataTypes.UUID, allowNull: false },
    followers: { type: DataTypes.BIGINT, allowNull: false },
    avgViews: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    engagementRate: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0, get() { return Number(this.getDataValue('engagementRate') ?? 0); } },
    capturedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'social_stat_snapshots', modelName: 'SocialStatSnapshot', timestamps: false },
);
