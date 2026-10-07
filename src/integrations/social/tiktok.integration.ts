import { env } from '../../configs/env';
import { httpRequest } from '../../libs/http-client';
import { ApiError } from '../../utils/api-error';
import { average, type NormalizedStats, type OAuthTokens, type SocialProvider } from './types';

/**
 * TikTok Login Kit + Display API.
 * Docs: https://developers.tiktok.com/doc/login-kit-web  |  https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info
 */
const API = 'https://open.tiktokapis.com/v2';

interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  error?: string;
  error_description?: string;
}
interface TikTokUser {
  open_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  profile_deep_link?: string;
  follower_count?: number;
  following_count?: number;
  video_count?: number;
}
interface TikTokVideo {
  view_count?: number;
  like_count?: number;
  comment_count?: number;
}

function toTokens(res: TikTokTokenResponse): OAuthTokens {
  if (res.error) throw ApiError.badGateway(`TikTok: ${res.error_description ?? res.error}`);
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: new Date(Date.now() + res.expires_in * 1000),
    platformUserId: res.open_id,
  };
}

export const tiktokProvider: SocialProvider = {
  platform: 'tiktok',

  isConfigured: () => Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),

  getAuthUrl({ state, redirectUri }) {
    const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
    u.searchParams.set('client_key', env.TIKTOK_CLIENT_KEY);
    u.searchParams.set('scope', 'user.info.basic,user.info.profile,user.info.stats,video.list');
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('state', state);
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await httpRequest<TikTokTokenResponse>(`${API}/oauth/token/`, {
      method: 'POST',
      form: true,
      body: {
        client_key: env.TIKTOK_CLIENT_KEY,
        client_secret: env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
    });
    return toTokens(res);
  },

  async refreshTokens({ refreshToken }) {
    if (!refreshToken) return null;
    const res = await httpRequest<TikTokTokenResponse>(`${API}/oauth/token/`, {
      method: 'POST',
      form: true,
      body: {
        client_key: env.TIKTOK_CLIENT_KEY,
        client_secret: env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    });
    return toTokens(res);
  },

  async fetchStats(accessToken): Promise<NormalizedStats> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const userRes = await httpRequest<{ data: { user: TikTokUser } }>(`${API}/user/info/`, {
      headers,
      query: { fields: 'open_id,username,display_name,avatar_url,profile_deep_link,follower_count,following_count,video_count' },
    });
    const user = userRes.data.user;

    const videosRes = await httpRequest<{ data: { videos: TikTokVideo[] } }>(`${API}/video/list/`, {
      method: 'POST',
      headers,
      query: { fields: 'id,view_count,like_count,comment_count' },
      body: { max_count: 20 },
    });
    const videos = videosRes.data?.videos ?? [];
    const handle = user.username ?? user.display_name ?? user.open_id;

    return {
      platformUserId: user.open_id,
      handle,
      profileUrl: user.username ? `https://www.tiktok.com/@${user.username}` : (user.profile_deep_link ?? null),
      avatarUrl: user.avatar_url ?? null,
      followers: user.follower_count ?? 0,
      following: user.following_count ?? 0,
      postsCount: user.video_count ?? 0,
      avgViews: average(videos.map((v) => v.view_count ?? 0)),
      avgLikes: average(videos.map((v) => v.like_count ?? 0)),
      avgComments: average(videos.map((v) => v.comment_count ?? 0)),
    };
  },
};
