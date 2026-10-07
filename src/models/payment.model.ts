import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../configs/database';
import type { PaymentPurpose, PaymentStatus } from '../types';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare purpose: PaymentPurpose;
  declare status: CreationOptional<PaymentStatus>;
  declare amountCents: number;
  declare currency: string;
  declare credits: CreationOptional<number>;
  declare packageId: CreationOptional<string | null>;
  declare provider: 'stripe' | 'mock' | 'founding';
  declare providerSessionId: CreationOptional<string | null>;
  declare providerPaymentId: CreationOptional<string | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare metadata: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    purpose: { type: DataTypes.ENUM('creator_registration', 'search_credits'), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
    amountCents: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.CHAR(3), allowNull: false },
    credits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    packageId: { type: DataTypes.STRING(40), allowNull: true },
    provider: { type: DataTypes.STRING(20), allowNull: false },
    providerSessionId: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    providerPaymentId: { type: DataTypes.STRING(255), allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'payments', modelName: 'Payment' },
);
