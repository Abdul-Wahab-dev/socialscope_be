import pg from 'pg';
import { Sequelize } from 'sequelize';
import { env } from './env';
import { logger } from '../libs/logger';

// Return BIGINT (int8) as JS numbers instead of strings (DECIMAL fields use model getters).
// Safe here: follower counts & rates are far below Number.MAX_SAFE_INTEGER.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  logging: env.DB_LOGGING ? (sql) => logger.debug(sql) : false,
  dialectOptions: env.DB_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Database connection established');
}
