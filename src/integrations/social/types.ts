import type { SocialPlatform } from '../../types';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  /** Absolute expiry of the access token */
  expiresAt?: Date | null;
  /** Some providers return the user id in the token response */
  platformUserId?: string;
}

/** Provider-agnostic stats shape stored on social_accounts. */
export interface NormalizedStats {
  platformUserId: string;
  handle: string;
  profileUrl: string | null;
  avatarUrl: string | null;
  followers: number;
  following: number;
  postsCount: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
}

export interface SocialProvider {
  readonly platform: SocialPlatform;
  /** true when client id / secret are configured */
  isConfigured(): boolean;
  getAuthUrl(params: { state: string; redirectUri: string; userId: string }): string;
  exchangeCode(params: { code: string; redirectUri: string }): Promise<OAuthTokens>;
  /** Returns new tokens if the provider supports refreshing, otherwise null. */
  refreshTokens(tokens: { accessToken: string; refreshToken?: string | null }): Promise<OAuthTokens | null>;
  fetchStats(accessToken: string): Promise<NormalizedStats>;
}

export const average = (nums: number[]): number => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);
