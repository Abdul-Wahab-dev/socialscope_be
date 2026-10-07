import type { SocialPlatform } from '../../types';
import { ApiError } from '../../utils/api-error';
import { instagramProvider } from './instagram.integration';
import { tiktokProvider } from './tiktok.integration';
import { youtubeProvider } from './youtube.integration';
import { createMockProvider, isMockSocial } from './mock.integration';
import type { SocialProvider } from './types';

const realProviders: Record<SocialPlatform, SocialProvider> = {
  instagram: instagramProvider,
  tiktok: tiktokProvider,
  youtube: youtubeProvider,
};

export function getSocialProvider(platform: SocialPlatform): SocialProvider {
  if (isMockSocial()) return createMockProvider(platform);
  const provider = realProviders[platform];
  if (!provider.isConfigured()) {
    throw new ApiError(503, `${platform} connection is not configured yet`, 'PROVIDER_NOT_CONFIGURED');
  }
  return provider;
}

export type { SocialProvider, NormalizedStats, OAuthTokens } from './types';
