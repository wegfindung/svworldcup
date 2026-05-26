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

DROP TABLE IF EXISTS legacy_team_nations;
CREATE TEMP TABLE legacy_team_nations (
    team_code TEXT PRIMARY KEY,
    nation_code TEXT NOT NULL
);

INSERT INTO legacy_team_nations (team_code, nation_code)
VALUES
    ('ALG', 'dz'),
    ('ARG', 'ar'),
    ('AUS', 'au'),
    ('AUT', 'at'),
    ('BEL', 'be'),
    ('BIH', 'ba'),
    ('BRA', 'br'),
    ('CAN', 'ca'),
    ('CIV', 'ci'),
    ('COD', 'cd'),
    ('COL', 'co'),
    ('CRO', 'hr'),
    ('CZE', 'cz'),
    ('ECU', 'ec'),
    ('EGY', 'eg'),
    ('ENG', 'gb'),
    ('ESP', 'es'),
    ('FRA', 'fr'),
    ('GER', 'de'),
    ('GHA', 'gh'),
    ('HAI', 'ht'),
    ('IRN', 'ir'),
    ('IRQ', 'iq'),
    ('JOR', 'jo'),
    ('JPN', 'jp'),
    ('KOR', 'kr'),
    ('KSA', 'sa'),
    ('MAR', 'ma'),
    ('MEX', 'mx'),
    ('NED', 'nl'),
    ('NOR', 'no'),
    ('NZL', 'nz'),
    ('PAN', 'pa'),
    ('PAR', 'py'),
    ('POR', 'pt'),
    ('QAT', 'qa'),
    ('RSA', 'za'),
    ('SCO', 'gb-sct'),
    ('SEN', 'sn'),
    ('SUI', 'ch'),
    ('SWE', 'se'),
    ('TUN', 'tn'),
    ('TUR', 'tr'),
    ('URU', 'uy'),
    ('USA', 'us'),
    ('UZB', 'uz');

UPDATE participants p
SET primary_team_code = m.nation_code
FROM legacy_team_nations m
WHERE p.primary_team_code = m.team_code;

UPDATE participants p
SET secondary_team_code = m.nation_code
FROM legacy_team_nations m
WHERE p.secondary_team_code = m.team_code;

UPDATE email_campaign_recipients r
SET primary_team_code = m.nation_code
FROM legacy_team_nations m
WHERE r.primary_team_code = m.team_code;

UPDATE email_campaign_recipients r
SET secondary_team_code = m.nation_code
FROM legacy_team_nations m
WHERE r.secondary_team_code = m.team_code;

UPDATE email_campaigns c
SET audience_team_code = m.nation_code
FROM legacy_team_nations m
WHERE c.audience_team_code = m.team_code;
