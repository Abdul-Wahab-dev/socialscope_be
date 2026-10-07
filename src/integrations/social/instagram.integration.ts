import { env } from '../../configs/env';
import { httpRequest } from '../../libs/http-client';
import { average, type NormalizedStats, type OAuthTokens, type SocialProvider } from './types';

/**
 * Instagram API with Instagram Login (professional accounts: Business / Creator).
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 * Requires app review for `instagram_business_basic` + `instagram_business_manage_insights`.
 */
const GRAPH = 'https://graph.instagram.com';
const GRAPH_VERSION = 'v23.0';

interface IgMe {
  user_id?: string;
  id: string;
  username: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}
interface IgMedia {
  id: string;
  media_type: string;
  like_count?: number;
  comments_count?: number;
}

export const instagramProvider: SocialProvider = {
  platform: 'instagram',

  isConfigured: () => Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET),

  getAuthUrl({ state, redirectUri }) {
    const u = new URL('https://www.instagram.com/oauth/authorize');
    u.searchParams.set('client_id', env.INSTAGRAM_APP_ID);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights');
    u.searchParams.set('state', state);
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }): Promise<OAuthTokens> {
    // 1) short-lived token (1h)
    const short = await httpRequest<{ access_token: string; user_id: number | string }>('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      form: true,
      body: {
        client_id: env.INSTAGRAM_APP_ID,
        client_secret: env.INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      },
    });
    // 2) exchange for long-lived token (60 days)
    const long = await httpRequest<{ access_token: string; expires_in: number }>(`${GRAPH}/access_token`, {
      query: { grant_type: 'ig_exchange_token', client_secret: env.INSTAGRAM_APP_SECRET, access_token: short.access_token },
    });
    return {
      accessToken: long.access_token,
      refreshToken: null,
      expiresAt: new Date(Date.now() + long.expires_in * 1000),
      platformUserId: String(short.user_id),
    };
  },

  async refreshTokens({ accessToken }) {
    const res = await httpRequest<{ access_token: string; expires_in: number }>(`${GRAPH}/refresh_access_token`, {
      query: { grant_type: 'ig_refresh_token', access_token: accessToken },
    });
    return { accessToken: res.access_token, refreshToken: null, expiresAt: new Date(Date.now() + res.expires_in * 1000) };
  },

  async fetchStats(accessToken): Promise<NormalizedStats> {
    const me = await httpRequest<IgMe>(`${GRAPH}/${GRAPH_VERSION}/me`, {
      query: { fields: 'user_id,username,profile_picture_url,followers_count,follows_count,media_count', access_token: accessToken },
    });
    const media = await httpRequest<{ data: IgMedia[] }>(`${GRAPH}/${GRAPH_VERSION}/me/media`, {
      query: { fields: 'id,media_type,like_count,comments_count', limit: 12, access_token: accessToken },
    });
    const items = media.data ?? [];

    // Views come from per-media insights; failures (e.g. old media) are ignored.
    const viewResults = await Promise.allSettled(
      items.map((m) =>
        httpRequest<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(`${GRAPH}/${GRAPH_VERSION}/${m.id}/insights`, {
          query: { metric: 'views', access_token: accessToken },
        }),
      ),
    );
    const views = viewResults
      .map((r) => (r.status === 'fulfilled' ? r.value.data?.[0]?.values?.[0]?.value : undefined))
      .filter((v): v is number => typeof v === 'number');

    return {
      platformUserId: String(me.user_id ?? me.id),
      handle: me.username,
      profileUrl: `https://www.instagram.com/${me.username}/`,
      avatarUrl: me.profile_picture_url ?? null,
      followers: me.followers_count ?? 0,
      following: me.follows_count ?? 0,
      postsCount: me.media_count ?? 0,
      avgViews: average(views),
      avgLikes: average(items.map((m) => m.like_count ?? 0)),
      avgComments: average(items.map((m) => m.comments_count ?? 0)),
    };
  },
};
