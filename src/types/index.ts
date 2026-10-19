export const USER_ROLES = ["creator", "brand", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Where an account's numbers come from: the platform's API, or typed in by the creator. */
export const STATS_SOURCES = ["api", "self_reported"] as const;
export type StatsSource = (typeof STATS_SOURCES)[number];

/**
 * Platforms whose login only proves who the creator is. Facebook's API doesn't share
 * profile followers/views with third-party apps, so the creator enters them.
 */
export const SELF_REPORTED_PLATFORMS: ReadonlySet<SocialPlatform> = new Set([
  "facebook",
]);
export const isSelfReportedPlatform = (platform: SocialPlatform) =>
  SELF_REPORTED_PLATFORMS.has(platform);

export const DELIVERABLE_TYPES = [
  "post",
  "reel",
  "story",
  "video",
  "short",
  "live",
  "ugc",
  "other",
] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const COLLAB_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "countered",
  "cancelled",
  "completed",
] as const;
export type CollabStatus = (typeof COLLAB_STATUSES)[number];

export type PaymentPurpose = "creator_registration" | "search_credits";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled";
export type SyncStatus = "pending" | "ok" | "error";

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
