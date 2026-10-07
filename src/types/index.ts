export const USER_ROLES = ['creator', 'brand', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const DELIVERABLE_TYPES = ['post', 'reel', 'story', 'video', 'short', 'live', 'ugc', 'other'] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];

export const COLLAB_STATUSES = ['pending', 'accepted', 'declined', 'countered', 'cancelled', 'completed'] as const;
export type CollabStatus = (typeof COLLAB_STATUSES)[number];

export type PaymentPurpose = 'creator_registration' | 'search_credits';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled';
export type SyncStatus = 'pending' | 'ok' | 'error';

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
