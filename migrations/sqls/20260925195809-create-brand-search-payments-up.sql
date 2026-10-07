-- Brand side: profiles, saved creators, search logging/quota, payments
CREATE TYPE payment_purpose AS ENUM ('creator_registration', 'search_credits');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'cancelled');

CREATE TABLE brand_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name  VARCHAR(120) NOT NULL,
  website       VARCHAR(500),
  industry      VARCHAR(40),
  country       CHAR(2),
  city          VARCHAR(80),
  logo_url      VARCHAR(1000),
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_creators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_profile_id  UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  note                VARCHAR(500),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_saved_creator UNIQUE (user_id, creator_profile_id)
);

-- Every *new* search is logged. Quota is computed from this table.
CREATE TABLE search_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_id       VARCHAR(64),
  ip_address     VARCHAR(64),
  filters        JSONB NOT NULL DEFAULT '{}',
  filters_hash   VARCHAR(64) NOT NULL,
  results_count  INTEGER NOT NULL DEFAULT 0,
  -- 'guest' | 'weekly_free' | 'credit'
  charged_from   VARCHAR(20) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_search_logs_user_time ON search_logs(user_id, created_at DESC);
CREATE INDEX idx_search_logs_guest ON search_logs(guest_id);
CREATE INDEX idx_search_logs_ip ON search_logs(ip_address);

CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose               payment_purpose NOT NULL,
  status                payment_status NOT NULL DEFAULT 'pending',
  amount_cents          INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency              CHAR(3) NOT NULL,
  credits               INTEGER NOT NULL DEFAULT 0,
  package_id            VARCHAR(40),
  provider              VARCHAR(20) NOT NULL,
  provider_session_id   VARCHAR(255) UNIQUE,
  provider_payment_id   VARCHAR(255),
  paid_at               TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
