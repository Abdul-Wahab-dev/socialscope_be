import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';

export type SearchChargeSource = 'guest' | 'weekly_free' | 'credit';

export class SearchLog extends Model<InferAttributes<SearchLog>, InferCreationAttributes<SearchLog>> {
  declare id: CreationOptional<string>;
  declare userId: string | null;
  declare guestId: string | null;
  declare ipAddress: string | null;
  declare filters: Record<string, unknown>;
  declare filtersHash: string;
  declare resultsCount: CreationOptional<number>;
  declare chargedFrom: SearchChargeSource;
  declare createdAt: CreationOptional<Date>;
}

SearchLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    guestId: { type: DataTypes.STRING(64), allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    filters: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    filtersHash: { type: DataTypes.STRING(64), allowNull: false },
    resultsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    chargedFrom: { type: DataTypes.STRING(20), allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'search_logs', modelName: 'SearchLog', updatedAt: false },
);
