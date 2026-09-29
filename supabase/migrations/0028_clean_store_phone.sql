-- Migration 0027: Clean store_phone trailing decimals and restore leading zero
-- Fixes numeric coercion bug where phone numbers like '03224444692' were coerced to float '3224444692.0'

UPDATE store_settings
SET store_phone = REGEXP_REPLACE(store_phone, '\.0+$', '')
WHERE store_phone ~ '\.0+$';

UPDATE store_settings
SET store_phone = '0' || store_phone
WHERE store_phone ~ '^3[0-9]{9}$';
