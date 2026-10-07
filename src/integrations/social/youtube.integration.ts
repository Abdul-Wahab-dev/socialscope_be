import { env } from '../../configs/env';
import { httpRequest } from '../../libs/http-client';
import { ApiError } from '../../utils/api-error';
import { average, type NormalizedStats, type OAuthTokens, type SocialProvider } from './types';

/**
 * YouTube Data API v3 via Google OAuth (scope: youtube.readonly).
 * Docs: https://developers.google.com/youtube/v3/docs/channels/list
 */
const YT = 'https://www.googleapis.com/youtube/v3';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}
interface YtChannel {
  id: string;
  snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } };
  statistics: { subscriberCount?: string; videoCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

export const youtubeProvider: SocialProvider = {
  platform: 'youtube',

  isConfigured: () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),

  getAuthUrl({ state, redirectUri }) {
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly');
    u.searchParams.set('access_type', 'offline');
    u.searchParams.set('prompt', 'consent');
    u.searchParams.set('include_granted_scopes', 'true');
    u.searchParams.set('state', state);
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }): Promise<OAuthTokens> {
    const res = await httpRequest<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      form: true,
      body: {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
    });
    return { accessToken: res.access_token, refreshToken: res.refresh_token ?? null, expiresAt: new Date(Date.now() + res.expires_in * 1000) };
  },

  async refreshTokens({ refreshToken }) {
    if (!refreshToken) return null;
    const res = await httpRequest<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      form: true,
      body: { client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' },
    });
    // Google does not always return a new refresh token; keep the old one.
    return { accessToken: res.access_token, refreshToken, expiresAt: new Date(Date.now() + res.expires_in * 1000) };
  },

  async fetchStats(accessToken): Promise<NormalizedStats> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const channels = await httpRequest<{ items?: YtChannel[] }>(`${YT}/channels`, {
      headers,
      query: { part: 'snippet,statistics,contentDetails', mine: 'true' },
    });
    const ch = channels.items?.[0];
    if (!ch) throw ApiError.badRequest('No YouTube channel found on this Google account');

    let views: number[] = [];
    let likes: number[] = [];
    let comments: number[] = [];
    const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) {
      const playlist = await httpRequest<{ items?: Array<{ contentDetails: { videoId: string } }> }>(`${YT}/playlistItems`, {
        headers,
        query: { part: 'contentDetails', playlistId: uploads, maxResults: 12 },
      });
      const ids = (playlist.items ?? []).map((i) => i.contentDetails.videoId);
      if (ids.length) {
        const videos = await httpRequest<{ items?: Array<{ statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }> }>(
          `${YT}/videos`,
          { headers, query: { part: 'statistics', id: ids.join(',') } },
        );
        const stats = (videos.items ?? []).map((v) => v.statistics);
        views = stats.map((s) => Number(s.viewCount ?? 0));
        likes = stats.map((s) => Number(s.likeCount ?? 0));
        comments = stats.map((s) => Number(s.commentCount ?? 0));
      }
    }

    const handle = ch.snippet.customUrl ?? ch.snippet.title;
    return {
      platformUserId: ch.id,
      handle,
      profileUrl: ch.snippet.customUrl ? `https://www.youtube.com/${ch.snippet.customUrl}` : `https://www.youtube.com/channel/${ch.id}`,
      avatarUrl: ch.snippet.thumbnails?.default?.url ?? null,
      followers: Number(ch.statistics.subscriberCount ?? 0),
      following: 0,
      postsCount: Number(ch.statistics.videoCount ?? 0),
      avgViews: average(views),
      avgLikes: average(likes),
      avgComments: average(comments),
    };
  },
};
