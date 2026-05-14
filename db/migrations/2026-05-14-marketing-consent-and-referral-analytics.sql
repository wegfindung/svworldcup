ALTER TABLE participants ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at TIMESTAMPTZ;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS marketing_unsubscribe_token TEXT;

UPDATE participants
SET marketing_unsubscribe_token = gen_random_uuid()::text
WHERE marketing_unsubscribe_token IS NULL;

ALTER TABLE participants ALTER COLUMN marketing_unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS participants_marketing_unsubscribe_token_unq
    ON participants (marketing_unsubscribe_token);

ALTER TABLE email_campaign_recipients ADD COLUMN IF NOT EXISTS referrer_soccerverse_username TEXT;
ALTER TABLE email_campaign_recipients ADD COLUMN IF NOT EXISTS marketing_unsubscribe_token TEXT;

CREATE TABLE IF NOT EXISTS email_delivery_log (
    delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_delivery_log_sent_at_idx
    ON email_delivery_log (sent_at);

CREATE TABLE IF NOT EXISTS referral_clicks (
    click_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_soccerverse_username TEXT NOT NULL,
    landing_path TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_clicks_referrer_created_idx
    ON referral_clicks (referrer_soccerverse_username, created_at);
