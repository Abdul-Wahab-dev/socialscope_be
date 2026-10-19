import { env } from "../../configs/env";
import { httpRequest } from "../../libs/http-client";
import type { NormalizedStats, OAuthTokens, SocialProvider } from "./types";

/**
 * Facebook PROFILE via Facebook Login — identity only.
 *
 * Meta's API doesn't share a personal profile's (or professional-mode profile's) followers,
 * reels or views with third-party apps. So Facebook Login is used to prove the creator owns
 * a Facebook account (app-scoped id, name, picture) and the creator enters their stats
 * themselves (see SocialAccountService.updateSelfReportedStats). Those stats are labelled
 * "self-reported" everywhere they are shown.
 *
 * Permission: public_profile only (granted by default, no App Review needed).
 * The long-lived user token (~60 days) is used only to refresh the name and picture.
 */
const graph = () => `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
const SCOPES = ["public_profile"];

interface FbMe {
  id: string;
  name?: string;
  picture?: { data?: { url?: string; is_silhouette?: boolean } };
}

export const facebookProvider: SocialProvider = {
  platform: "facebook",

  isConfigured: () => Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),

  getAuthUrl({ state, redirectUri }) {
    const u = new URL(
      `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`
    );
    u.searchParams.set("client_id", env.FACEBOOK_APP_ID);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("state", state);
    u.searchParams.set("response_type", "code");
    // Facebook Login for Business apps pick permissions in a Configuration instead of `scope`
    if (env.FACEBOOK_LOGIN_CONFIG_ID)
      u.searchParams.set("config_id", env.FACEBOOK_LOGIN_CONFIG_ID);
    else u.searchParams.set("scope", SCOPES.join(","));
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }): Promise<OAuthTokens> {
    const short = await httpRequest<{ access_token: string }>(
      `${graph()}/oauth/access_token`,
      {
        query: {
          client_id: env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      }
    );
    const long = await httpRequest<{
      access_token: string;
      expires_in?: number;
    }>(`${graph()}/oauth/access_token`, {
      query: {
        grant_type: "fb_exchange_token",
        client_id: env.FACEBOOK_APP_ID,
        client_secret: env.FACEBOOK_APP_SECRET,
        fb_exchange_token: short.access_token,
      },
    });
    const me = await httpRequest<{ id: string }>(`${graph()}/me`, {
      query: { fields: "id", access_token: long.access_token },
    });

    return {
      accessToken: long.access_token,
      refreshToken: null,
      expiresAt: long.expires_in
        ? new Date(Date.now() + long.expires_in * 1000)
        : null,
      platformUserId: me.id,
      ownerPlatformUserId: me.id, // Meta's deletion callback sends this id
    };
  },

  async refreshTokens() {
    return null; // Long-lived user tokens can't be refreshed server-side; the creator reconnects (~every 60 days)
  },

  /** Identity only: the numbers are entered by the creator and never overwritten from here. */
  async fetchStats(accessToken): Promise<NormalizedStats> {
    const me = await httpRequest<FbMe>(`${graph()}/me`, {
      query: {
        fields: "id,name,picture.type(large)",
        access_token: accessToken,
      },
    });
    const picture = me.picture?.data;
    return {
      platformUserId: me.id,
      handle: me.name ?? "Facebook user",
      profileUrl: null, // the creator adds their public profile link with their stats
      avatarUrl: picture?.url && !picture.is_silhouette ? picture.url : null,
      followers: 0,
      following: 0,
      postsCount: 0,
      avgViews: 0,
      avgLikes: 0,
      avgComments: 0,
    };
  },
};
