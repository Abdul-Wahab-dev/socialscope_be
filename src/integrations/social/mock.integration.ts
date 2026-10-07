import crypto from 'crypto';
import { env } from '../../configs/env';
import type { SocialPlatform } from '../../types';
import type { NormalizedStats, SocialProvider } from './types';

/**
 * Development-only provider (SOCIAL_OAUTH_MOCK=true). Skips the real consent screen and
 * returns deterministic, realistic-looking stats so the whole flow can be tested locally.
 */
function seeded(seed: string, min: number, max: number): number {
  const n = parseInt(crypto.createHash('md5').update(seed).digest('hex').slice(0, 8), 16) / 0xffffffff;
  return Math.round(min + n * (max - min));
}

export function createMockProvider(platform: SocialPlatform): SocialProvider {
  return {
    platform,
    isConfigured: () => true,

    getAuthUrl({ state, redirectUri, userId }) {
      const u = new URL(redirectUri);
      u.searchParams.set('code', `mock_${userId}`);
      u.searchParams.set('state', state);
      return u.toString();
    },

    async exchangeCode({ code }) {
      const userId = code.replace(/^mock_/, '');
      return {
        accessToken: `mock-token:${platform}:${userId}`,
        refreshToken: `mock-refresh:${platform}:${userId}`,
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        platformUserId: `mock_${platform}_${userId}`,
      };
    },

    async refreshTokens(tokens) {
      return { ...tokens, expiresAt: new Date(Date.now() + 30 * 86_400_000) };
    },

    async fetchStats(accessToken): Promise<NormalizedStats> {
      const userId = accessToken.split(':')[2] ?? 'x';
      const key = `${platform}:${userId}`;
      const followers = seeded(key, 2_000, 450_000);
      // small drift so stats history charts show movement between syncs
      const drift = 1 + (seeded(key + new Date().toISOString().slice(0, 13), 0, 40) - 15) / 1000;
      const f = Math.round(followers * drift);
      const likes = Math.round(f * (seeded(key + 'er', 15, 70) / 1000));
      const handle = `demo_${platform}_${userId.slice(0, 6)}`;
      const urls: Record<SocialPlatform, string> = {
        instagram: `https://www.instagram.com/${handle}/`,
        tiktok: `https://www.tiktok.com/@${handle}`,
        youtube: `https://www.youtube.com/@${handle}`,
      };
      return {
        platformUserId: `mock_${platform}_${userId}`,
        handle,
        profileUrl: urls[platform],
        avatarUrl: null,
        followers: f,
        following: seeded(key + 'fo', 50, 1500),
        postsCount: seeded(key + 'p', 40, 900),
        avgViews: Math.round(f * (seeded(key + 'v', 80, 600) / 1000)),
        avgLikes: likes,
        avgComments: Math.round(likes * 0.04),
      };
    },
  };
}

export const isMockSocial = () => env.SOCIAL_OAUTH_MOCK;
