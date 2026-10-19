/**
 * Validates and normalises a Facebook PROFILE link typed by a creator.
 *
 * Accepted:
 *   https://www.facebook.com/some.username
 *   https://m.facebook.com/some.username, fb.com/some.username, web.facebook.com/…
 *   https://www.facebook.com/profile.php?id=1000123456789
 *   https://www.facebook.com/people/Some-Name/1000123456789/
 * Rejected: groups, events, posts, reels, share links, etc.
 */
export interface FacebookProfileLink {
  /** Canonical https://www.facebook.com/… URL */
  profileUrl: string;
  /** Username from the link, or null for numeric-id links (use the Facebook name instead) */
  username: string | null;
}

const HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "mbasic.facebook.com",
  "fb.com",
  "www.fb.com",
]);

/** First path segments that are never a profile. */
const RESERVED = new Set([
  "groups",
  "events",
  "pages",
  "watch",
  "reel",
  "reels",
  "share",
  "story.php",
  "stories",
  "photo",
  "photo.php",
  "photos",
  "videos",
  "video.php",
  "posts",
  "permalink.php",
  "marketplace",
  "gaming",
  "login",
  "login.php",
  "help",
  "settings",
  "hashtag",
  "search",
  "friends",
  "messages",
  "notifications",
  "business",
  "ads",
  "privacy",
  "policies",
  "legal",
  "home.php",
]);

const USERNAME_RE = /^[A-Za-z0-9.]{5,50}$/;
const NUMERIC_ID_RE = /^\d{5,25}$/;

export function parseFacebookProfileUrl(
  raw: string
): FacebookProfileLink | null {
  let url: URL;
  try {
    const value = raw.trim();
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (!first) return null;

  if (first === "profile.php") {
    const id = url.searchParams.get("id") ?? "";
    return NUMERIC_ID_RE.test(id)
      ? {
          profileUrl: `https://www.facebook.com/profile.php?id=${id}`,
          username: null,
        }
      : null;
  }

  if (first === "people" && segments.length >= 3) {
    const [, name, id] = segments;
    if (!NUMERIC_ID_RE.test(id!)) return null;
    return {
      profileUrl: `https://www.facebook.com/people/${name}/${id}/`,
      username: null,
    };
  }

  if (RESERVED.has(first) || segments.length > 1) return null;
  const username = segments[0]!;
  if (!USERNAME_RE.test(username)) return null;
  return { profileUrl: `https://www.facebook.com/${username}`, username };
}
