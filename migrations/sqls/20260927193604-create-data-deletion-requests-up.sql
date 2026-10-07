-- Audit trail for data deletion requests (platform callbacks such as Meta's, and in-app account deletion).
-- Stores only a hash of the platform user id, never the raw identifier.
CREATE TYPE deletion_status AS ENUM ('received', 'completed', 'not_found');

CREATE TABLE data_deletion_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code       VARCHAR(40) NOT NULL UNIQUE,
  source                  VARCHAR(30) NOT NULL,          -- 'instagram_callback' | 'account_deletion' | ...
  platform_user_id_hash   VARCHAR(64),
  status                  deletion_status NOT NULL DEFAULT 'received',
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
