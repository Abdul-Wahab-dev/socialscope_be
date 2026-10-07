import { env } from './env';

/** Business rules & catalog values that the API exposes to the frontend. */
export const appConfig = {
  currency: env.CURRENCY.toLowerCase(),
  creatorRegistrationFeeCents: env.CREATOR_REGISTRATION_FEE_CENTS,
  foundingCreatorFreeSlots: env.FOUNDING_CREATOR_FREE_SLOTS,
  guestSearchLimit: env.GUEST_SEARCH_LIMIT,
  weeklyFreeSearchLimit: env.WEEKLY_FREE_SEARCH_LIMIT,
  /** Re-running the same search (e.g. paging) within this window is free. */
  searchReuseWindowMinutes: 30,
  /** Minimum time between manual re-syncs of a social account. */
  manualSyncCooldownMinutes: 60,
  /** Accounts older than this are refreshed by the background job. */
  autoSyncStaleHours: 12,
  searchCreditPackages: [
    { id: 'starter', name: 'Starter', credits: 30, priceCents: 500 },
    { id: 'growth', name: 'Growth', credits: 100, priceCents: 1200 },
    { id: 'agency', name: 'Agency', credits: 300, priceCents: 3000 },
  ],
} as const;

export type SearchCreditPackage = (typeof appConfig.searchCreditPackages)[number];

export const cookieNames = {
  access: 'ss_access',
  refresh: 'ss_refresh',
  guest: 'ss_guest',
} as const;
