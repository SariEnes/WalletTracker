-- Schema for Vibe Wallet Tracker

-- ENUMS
CREATE TYPE bundle_icon AS ENUM ('whale', 'defi', 'nft', 'team', 'dao', 'anon', 'shark', 'diamond', 'fire', 'lock');
CREATE TYPE wallet_provider AS ENUM ('generic', 'metamask', 'phantom', 'coinbase', 'rainbow', 'trust', 'ledger', 'safe', 'rabby');
CREATE TYPE chain_type AS ENUM ('evm', 'solana', 'bitcoin');
CREATE TYPE wallet_source AS ENUM ('import', 'connect', 'manual');
CREATE TYPE sync_status AS ENUM ('pending', 'running', 'done', 'failed');
CREATE TYPE fetch_status AS ENUM ('pending', 'success', 'error', 'stale');

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- TABLES
CREATE TABLE bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 60),
    icon bundle_icon DEFAULT 'anon',
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    label TEXT CHECK (char_length(label) <= 80),
    provider wallet_provider DEFAULT 'generic',
    chain_type chain_type DEFAULT 'evm',
    source wallet_source DEFAULT 'import',
    notes TEXT,
    UNIQUE(bundle_id, address)
);

CREATE INDEX idx_wallets_address_trgm ON wallets USING gin(address gin_trgm_ops);

CREATE TABLE wallet_cache (
    wallet_id UUID PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
    net_worth_usd NUMERIC(20,4) DEFAULT 0,
    net_worth_usd_24h_ago NUMERIC(20,4) DEFAULT 0,
    native_balance NUMERIC(36,18) DEFAULT 0,
    native_symbol TEXT,
    native_price_usd NUMERIC(20,4) DEFAULT 0,
    token_count INT DEFAULT 0,
    nft_count INT DEFAULT 0,
    defi_positions_count INT DEFAULT 0,
    chains_active TEXT[],
    fetch_status fetch_status DEFAULT 'pending',
    last_fetched_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE TABLE sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    status sync_status DEFAULT 'pending',
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT
);

CREATE TABLE wallet_auth_nonces (
    address TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- TRIGGERS
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bundles_updated_at
BEFORE UPDATE ON bundles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ENFORCE LIMITS
CREATE OR REPLACE FUNCTION check_bundle_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM bundles WHERE user_id = NEW.user_id) >= 20 THEN
    RAISE EXCEPTION 'Bundle limit reached (20)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_bundle_limit
BEFORE INSERT ON bundles
FOR EACH ROW EXECUTE FUNCTION check_bundle_limit();

CREATE OR REPLACE FUNCTION check_wallet_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM wallets WHERE bundle_id = NEW.bundle_id) >= 75 THEN
    RAISE EXCEPTION 'Wallet limit reached (75 per bundle)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_wallet_limit
BEFORE INSERT ON wallets
FOR EACH ROW EXECUTE FUNCTION check_wallet_limit();

-- VIEWS
CREATE OR REPLACE VIEW bundle_summaries AS
SELECT 
  b.id,
  b.user_id,
  b.name,
  b.icon,
  b.color,
  b.created_at,
  b.updated_at,
  COUNT(w.id) as wallet_count,
  COALESCE(SUM(wc.net_worth_usd), 0) as total_net_worth_usd,
  COUNT(CASE WHEN wc.fetch_status = 'pending' THEN 1 END) as pending_sync_count
FROM bundles b
LEFT JOIN wallets w ON w.bundle_id = b.id
LEFT JOIN wallet_cache wc ON wc.wallet_id = w.id
GROUP BY b.id;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bundles" 
ON bundles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage wallets in their bundles" 
ON wallets FOR ALL 
USING (bundle_id IN (SELECT id FROM bundles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view cache for their wallets" 
ON wallet_cache FOR SELECT 
USING (wallet_id IN (SELECT id FROM wallets WHERE bundle_id IN (SELECT id FROM bundles WHERE user_id = auth.uid())));

CREATE POLICY "Service role can manage wallet_cache" 
ON wallet_cache FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their sync jobs" 
ON sync_jobs FOR SELECT 
USING (bundle_id IN (SELECT id FROM bundles WHERE user_id = auth.uid()));

-- Clean up expired nonces every 15 minutes (requires pg_cron)
SELECT cron.schedule('cleanup_nonces', '*/15 * * * *', $$ DELETE FROM wallet_auth_nonces WHERE expires_at < now(); $$);
