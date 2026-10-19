/* Replace with your SQL commands */
-- Self-reported Facebook profiles have no Page token, so they can't survive a rollback.
DELETE FROM social_accounts WHERE stats_source = 'self_reported';

ALTER TABLE social_accounts
  DROP COLUMN IF EXISTS stats_reported_at,
  DROP COLUMN IF EXISTS stats_source;

DROP TYPE IF EXISTS stats_source;