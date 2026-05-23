ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS browser_locale TEXT NOT NULL DEFAULT 'en';

ALTER TABLE participants
    DROP CONSTRAINT IF EXISTS participants_browser_locale_chk;

ALTER TABLE participants
    ADD CONSTRAINT participants_browser_locale_chk
    CHECK (browser_locale IN ('en', 'es', 'de', 'fr', 'pt', 'ru', 'zh'));

ALTER TABLE email_campaigns
    ADD COLUMN IF NOT EXISTS subject_by_locale JSONB,
    ADD COLUMN IF NOT EXISTS body_html_by_locale JSONB,
    ADD COLUMN IF NOT EXISTS requires_marketing_opt_in BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE email_campaign_recipients
    ADD COLUMN IF NOT EXISTS browser_locale TEXT;

ALTER TABLE email_campaign_recipients
    DROP CONSTRAINT IF EXISTS email_campaign_recipients_browser_locale_chk;

ALTER TABLE email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_browser_locale_chk
    CHECK (browser_locale IS NULL OR browser_locale IN ('en', 'es', 'de', 'fr', 'pt', 'ru', 'zh'));
