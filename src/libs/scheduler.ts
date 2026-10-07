import cron from 'node-cron';
import { env, isTest } from '../configs/env';
import { logger } from './logger';
import { Op } from 'sequelize';
import { RefreshToken, SearchLog } from '../models';
import { socialAccountService } from '../services/social-account.service';

/** Registers background jobs. Run in a single instance (or move to a worker/queue when scaling out). */
export function startScheduler(): void {
  if (isTest) return;
  if (!cron.validate(env.SOCIAL_SYNC_CRON)) {
    logger.warn(`Invalid SOCIAL_SYNC_CRON "${env.SOCIAL_SYNC_CRON}", stats sync job disabled`);
    return;
  }
  cron.schedule(env.SOCIAL_SYNC_CRON, async () => {
    try {
      const result = await socialAccountService.syncStaleAccounts();
      logger.info('Social stats sync finished', result);
    } catch (err) {
      logger.error('Social stats sync job failed', err);
    }
  });
  // Daily retention clean-up at 03:10 server time
  cron.schedule('10 3 * * *', async () => {
    try {
      const social = await socialAccountService.purgeUnrefreshedAccounts(30);
      const searchLogs = await SearchLog.destroy({ where: { createdAt: { [Op.lt]: new Date(Date.now() - 365 * 86_400_000) } } });
      const tokens = await RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
      logger.info('Retention clean-up finished', { socialAccounts: social.deleted, searchLogs, refreshTokens: tokens });
    } catch (err) {
      logger.error('Retention clean-up failed', err);
    }
  });

  logger.info(`Scheduler started (social sync: ${env.SOCIAL_SYNC_CRON})`);
}
