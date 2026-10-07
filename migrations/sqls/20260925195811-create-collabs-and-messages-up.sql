-- Collaboration requests between brands and creators, with a message thread per request
CREATE TYPE collab_status AS ENUM ('pending', 'accepted', 'declined', 'countered', 'cancelled', 'completed');

CREATE TABLE collab_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_profile_id  UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title               VARCHAR(150) NOT NULL,
  brief               TEXT NOT NULL,
  deliverables        JSONB NOT NULL DEFAULT '[]',
  budget_cents        INTEGER NOT NULL CHECK (budget_cents >= 0),
  counter_cents       INTEGER CHECK (counter_cents >= 0),
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  deadline            DATE,
  status              collab_status NOT NULL DEFAULT 'pending',
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_collabs_brand ON collab_requests(brand_user_id, created_at DESC);
CREATE INDEX idx_collabs_creator ON collab_requests(creator_profile_id, created_at DESC);

CREATE TABLE messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_request_id  UUID NOT NULL REFERENCES collab_requests(id) ON DELETE CASCADE,
  sender_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body               TEXT NOT NULL,
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_collab ON messages(collab_request_id, created_at);
