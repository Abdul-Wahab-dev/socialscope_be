import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';
import type { UserRole } from '../types';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare passwordHash: string;
  declare fullName: string;
  declare role: UserRole;
  declare status: CreationOptional<'active' | 'suspended'>;
  declare searchCredits: CreationOptional<number>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  /** Never leak the password hash, even if a scope is forgotten. */
  toJSON() {
    const { passwordHash: _omit, ...rest } = this.get({ plain: true });
    return rest as Omit<InferAttributes<User>, 'passwordHash'>;
  }
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.CITEXT, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    fullName: { type: DataTypes.STRING(120), allowNull: false },
    role: { type: DataTypes.ENUM('creator', 'brand', 'admin'), allowNull: false },
    status: { type: DataTypes.ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
    searchCredits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'users', modelName: 'User' },
);
