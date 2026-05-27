ALTER TABLE participants
    DROP CONSTRAINT IF EXISTS participants_browser_locale_chk;

ALTER TABLE participants
    ADD CONSTRAINT participants_browser_locale_chk
    CHECK (browser_locale IN ('en', 'es', 'it', 'de', 'fr', 'pt', 'ru', 'zh', 'ja'));

ALTER TABLE email_campaign_recipients
    DROP CONSTRAINT IF EXISTS email_campaign_recipients_browser_locale_chk;

ALTER TABLE email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_browser_locale_chk
    CHECK (browser_locale IS NULL OR browser_locale IN ('en', 'es', 'it', 'de', 'fr', 'pt', 'ru', 'zh', 'ja'));
