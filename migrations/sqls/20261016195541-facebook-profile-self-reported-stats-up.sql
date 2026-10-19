-- Facebook as a fourth platform.
-- Facebook Login (public_profile) proves the creator owns the profile; Facebook doesn't share
-- profile followers/views with apps, so the creator enters their stats ("self-reported").

-- 1. New platform value (used by social_accounts.platform and rate_cards.platform)
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'facebook';

-- 2. Meta's data-deletion callback sends the app-scoped Facebook user id; store it to find the account
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS owner_platform_user_id VARCHAR(128);
CREATE INDEX IF NOT EXISTS idx_social_accounts_owner ON social_accounts(platform, owner_platform_user_id);

-- 3. Where an account's numbers come from: the platform API, or entered by the creator
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stats_source') THEN
    CREATE TYPE stats_source AS ENUM ('api', 'self_reported');
  END IF;
END
$$;

ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS stats_source stats_source NOT NULL DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS stats_reported_at TIMESTAMPTZ;   