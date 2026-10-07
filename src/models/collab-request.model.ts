import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { sequelize } from '../configs/database';
import type { CollabStatus, DeliverableType, SocialPlatform } from '../types';
import type { CreatorProfile } from './creator-profile.model';
import type { User } from './user.model';

export interface CollabDeliverable {
  platform?: SocialPlatform;
  type: DeliverableType;
  quantity: number;
  notes?: string;
}

export class CollabRequest extends Model<InferAttributes<CollabRequest>, InferCreationAttributes<CollabRequest>> {
  declare id: CreationOptional<string>;
  declare brandUserId: string;
  declare creatorProfileId: string;
  declare title: string;
  declare brief: string;
  declare deliverables: CreationOptional<CollabDeliverable[]>;
  declare budgetCents: number;
  declare counterCents: CreationOptional<number | null>;
  declare currency: CreationOptional<string>;
  declare deadline: CreationOptional<string | null>;
  declare status: CreationOptional<CollabStatus>;
  declare respondedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare brandUser?: NonAttribute<User>;
  declare creatorProfile?: NonAttribute<CreatorProfile>;
}

CollabRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    brandUserId: { type: DataTypes.UUID, allowNull: false },
    creatorProfileId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    brief: { type: DataTypes.TEXT, allowNull: false },
    deliverables: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    budgetCents: { type: DataTypes.INTEGER, allowNull: false },
    counterCents: { type: DataTypes.INTEGER, allowNull: true },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'USD' },
    deadline: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined', 'countered', 'cancelled', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    respondedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'collab_requests', modelName: 'CollabRequest' },
);
