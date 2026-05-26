-- Nation pick (registration primary/secondary) now uses the full Soccerverse nation set
-- (ISO-3166 alpha-2 plus gb-sct/gb-wls/gb-nir and xk), not just the 48 World Cup teams.
-- Widen the nation-code columns from CHAR(3) to TEXT and drop the foreign key to teams(code),
-- since nation codes are no longer constrained to the World Cup team list.
--
-- The 01-schema.sql change only affects fresh containers; this migration pushes it to live DBs.

ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_primary_team_code_fkey;
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_secondary_team_code_fkey;
ALTER TABLE participants ALTER COLUMN primary_team_code TYPE TEXT;
ALTER TABLE participants ALTER COLUMN secondary_team_code TYPE TEXT;

ALTER TABLE email_campaign_recipients ALTER COLUMN primary_team_code TYPE TEXT;
ALTER TABLE email_campaign_recipients ALTER COLUMN secondary_team_code TYPE TEXT;

ALTER TABLE email_campaigns ALTER COLUMN audience_team_code TYPE TEXT;
