-- Creator side: profiles, connected social accounts, stats history, rate cards, portfolio
CREATE TYPE social_platform AS ENUM ('instagram', 'tiktok', 'youtube');
CREATE TYPE sync_status AS ENUM ('pending', 'ok', 'error');
CREATE TYPE deliverable_type AS ENUM ('post', 'reel', 'story', 'video', 'short', 'live', 'ugc', 'other');

CREATE TABLE categories (
  slug        VARCHAR(40) PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (slug, name, sort_order) VALUES
  ('fashion', 'Fashion & Style', 1),
  ('beauty', 'Beauty & Makeup', 2),
  ('lifestyle', 'Lifestyle', 3),
  ('food', 'Food & Cooking', 4),
  ('travel', 'Travel', 5),
  ('fitness', 'Health & Fitness', 6),
  ('tech', 'Tech & Gadgets', 7),
  ('gaming', 'Gaming', 8),
  ('education', 'Education', 9),
  ('finance', 'Finance & Business', 10),
  ('comedy', 'Comedy & Entertainment', 11),
  ('music', 'Music & Dance', 12),
  ('parenting', 'Parenting & Family', 13),
  ('automotive', 'Automotive', 14),
  ('sports', 'Sports', 15),
  ('home', 'Home & Decor', 16),
  ('pets', 'Pets & Animals', 17),
  ('art', 'Art & Design', 18);

CREATE TABLE creator_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username            CITEXT NOT NULL UNIQUE,
  display_name        VARCHAR(80) NOT NULL,
  bio                 TEXT,
  avatar_url          VARCHAR(1000),
  categories          VARCHAR(40)[] NOT NULL DEFAULT '{}',
  languages           VARCHAR(40)[] NOT NULL DEFAULT '{}',
  country             CHAR(2),
  city                VARCHAR(80),
  contact_email       VARCHAR(255),
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  -- Listing becomes true when the registration fee is paid (or founding-creator slot)
  is_listed           BOOLEAN NOT NULL DEFAULT FALSE,
  is_founding         BOOLEAN NOT NULL DEFAULT FALSE,
  listed_at           TIMESTAMPTZ,
  -- Denormalised aggregates of connected accounts for fast search/sort
  total_followers     BIGINT NOT NULL DEFAULT 0,
  avg_engagement_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  min_price_cents     INTEGER,
  profile_views       INTEGER NOT NULL DEFAULT 0,
  search_appearances  INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_creator_profiles_listed ON creator_profiles(is_listed);
CREATE INDEX idx_creator_profiles_categories ON creator_profiles USING GIN (categories);
CREATE INDEX idx_creator_profiles_location ON creator_profiles(country, city);
CREATE INDEX idx_creator_profiles_followers ON creator_profiles(total_followers DESC);

CREATE TABLE social_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id    UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  platform              social_platform NOT NULL,
  platform_user_id      VARCHAR(128) NOT NULL,
  handle                VARCHAR(120) NOT NULL,
  profile_url           VARCHAR(1000),
  avatar_url            VARCHAR(1000),
  access_token_enc      TEXT,
  refresh_token_enc     TEXT,
  token_expires_at      TIMESTAMPTZ,
  followers             BIGINT NOT NULL DEFAULT 0,
  following             BIGINT NOT NULL DEFAULT 0,
  posts_count           INTEGER NOT NULL DEFAULT 0,
  avg_views             BIGINT NOT NULL DEFAULT 0,
  avg_likes             BIGINT NOT NULL DEFAULT 0,
  avg_comments          BIGINT NOT NULL DEFAULT 0,
  engagement_rate       NUMERIC(6,2) NOT NULL DEFAULT 0,
  sync_status           sync_status NOT NULL DEFAULT 'pending',
  sync_error            TEXT,
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_social_profile_platform UNIQUE (creator_profile_id, platform),
  -- one real social account can only belong to one creator on the platform
  CONSTRAINT uq_social_platform_user UNIQUE (platform, platform_user_id)
);
CREATE INDEX idx_social_accounts_sync ON social_accounts(last_synced_at);

CREATE TABLE social_stat_snapshots (
  id                 BIGSERIAL PRIMARY KEY,
  social_account_id  UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  followers          BIGINT NOT NULL,
  avg_views          BIGINT NOT NULL DEFAULT 0,
  engagement_rate    NUMERIC(6,2) NOT NULL DEFAULT 0,
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_snapshots_account_time ON social_stat_snapshots(social_account_id, captured_at DESC);

CREATE TABLE rate_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id  UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  platform            social_platform,
  deliverable         deliverable_type NOT NULL,
  title               VARCHAR(120) NOT NULL,
  description         TEXT,
  price_cents         INTEGER NOT NULL CHECK (price_cents >= 0),
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rate_cards_profile ON rate_cards(creator_profile_id);

CREATE TABLE portfolio_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id  UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title               VARCHAR(120) NOT NULL,
  brand_name          VARCHAR(120),
  url                 VARCHAR(1000),
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portfolio_profile ON portfolio_items(creator_profile_id);
