CREATE TABLE IF NOT EXISTS participant_shipping_addresses (
    participant_id UUID PRIMARY KEY REFERENCES participants(participant_id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    country_code CHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE participant_shipping_addresses IS
    'Private delivery details for eligible physical-prize winners; never exposed by public APIs.';
