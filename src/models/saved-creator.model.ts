import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { sequelize } from '../configs/database';
import type { CreatorProfile } from './creator-profile.model';

export class SavedCreator extends Model<InferAttributes<SavedCreator>, InferCreationAttributes<SavedCreator>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare creatorProfileId: string;
  declare note: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare creatorProfile?: NonAttribute<CreatorProfile>;
}

SavedCreator.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    creatorProfileId: { type: DataTypes.UUID, allowNull: false },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'saved_creators', modelName: 'SavedCreator' },
);
