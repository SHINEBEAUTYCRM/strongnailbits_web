-- Phone verification tokens for auth flow security
CREATE TABLE IF NOT EXISTS phone_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  token_hash text NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX idx_pvt_lookup
  ON phone_verification_tokens (token_hash, used, expires_at);

CREATE INDEX idx_pvt_phone
  ON phone_verification_tokens (phone, used);
