import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';

export type DeletionStatus = 'received' | 'completed' | 'not_found';

export class DataDeletionRequest extends Model<InferAttributes<DataDeletionRequest>, InferCreationAttributes<DataDeletionRequest>> {
  declare id: CreationOptional<string>;
  declare confirmationCode: string;
  declare source: string;
  declare platformUserIdHash: string | null;
  declare status: CreationOptional<DeletionStatus>;
  declare completedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

DataDeletionRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    confirmationCode: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    source: { type: DataTypes.STRING(30), allowNull: false },
    platformUserIdHash: { type: DataTypes.STRING(64), allowNull: true },
    status: { type: DataTypes.ENUM('received', 'completed', 'not_found'), allowNull: false, defaultValue: 'received' },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'data_deletion_requests', modelName: 'DataDeletionRequest' },
);
