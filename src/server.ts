import { env } from './configs/env';
import { connectDatabase, sequelize } from './configs/database';
import { createApp } from './app';
import { logger } from './libs/logger';
import { startScheduler } from './libs/scheduler';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`${env.APP_NAME} API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
  startScheduler();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
