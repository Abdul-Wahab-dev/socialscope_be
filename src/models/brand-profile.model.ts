import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';

export class BrandProfile extends Model<InferAttributes<BrandProfile>, InferCreationAttributes<BrandProfile>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare companyName: string;
  declare website: CreationOptional<string | null>;
  declare industry: CreationOptional<string | null>;
  declare country: CreationOptional<string | null>;
  declare city: CreationOptional<string | null>;
  declare logoUrl: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

BrandProfile.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    companyName: { type: DataTypes.STRING(120), allowNull: false },
    website: { type: DataTypes.STRING(500), allowNull: true },
    industry: { type: DataTypes.STRING(40), allowNull: true },
    country: { type: DataTypes.CHAR(2), allowNull: true },
    city: { type: DataTypes.STRING(80), allowNull: true },
    logoUrl: { type: DataTypes.STRING(1000), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'brand_profiles', modelName: 'BrandProfile' },
);
