import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';

export class PortfolioItem extends Model<InferAttributes<PortfolioItem>, InferCreationAttributes<PortfolioItem>> {
  declare id: CreationOptional<string>;
  declare creatorProfileId: string;
  declare title: string;
  declare brandName: string | null;
  declare url: string | null;
  declare description: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PortfolioItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    creatorProfileId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(120), allowNull: false },
    brandName: { type: DataTypes.STRING(120), allowNull: true },
    url: { type: DataTypes.STRING(1000), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'portfolio_items', modelName: 'PortfolioItem' },
);
