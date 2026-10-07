import { DataTypes, Model, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';

export class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare slug: string;
  declare name: string;
  declare sortOrder: number;
}

Category.init(
  {
    slug: { type: DataTypes.STRING(40), primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'categories', modelName: 'Category', timestamps: false },
);
