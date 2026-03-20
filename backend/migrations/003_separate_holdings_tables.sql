-- Migration: Replace single holdings table with 3 dedicated tables
-- stocks, mutual_funds, other_schemes
-- Run this in the Supabase SQL Editor AFTER 001 and 002 migrations.

-- ============================================================
-- DROP old holdings table (data will be re-imported via PDF)
-- ============================================================
DROP TABLE IF EXISTS public.holdings CASCADE;

-- ============================================================
-- STOCKS
-- CDSL BO Statement data — one row per ISIN per user
-- ============================================================
CREATE TABLE public.stocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    isin            TEXT NOT NULL,
    name            TEXT,
    ticker          TEXT NOT NULL,          -- same as isin for stocks
    balance         NUMERIC(14, 4) NOT NULL, -- number of shares
    closing_price   NUMERIC(14, 4) NOT NULL, -- last closing price from PDF
    cost_value      NUMERIC(14, 2) NOT NULL, -- total invested (balance × avg cost)
    market_value    NUMERIC(14, 2) NOT NULL, -- value from PDF (balance × closing_price)
    asset_type      TEXT NOT NULL DEFAULT 'stock',
    statement_date  DATE NOT NULL,           -- date the PDF was for
    imported_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, isin)
);

CREATE INDEX idx_stocks_user ON public.stocks(user_id);

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stocks" ON public.stocks
    FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- MUTUAL_FUNDS
-- CAMS / KFintech CAS Statement data — one row per ISIN per user
-- ============================================================
CREATE TABLE public.mutual_funds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    isin            TEXT NOT NULL,
    folio           TEXT,
    name            TEXT,
    ticker          TEXT NOT NULL,          -- same as isin for MFs
    unit_balance    NUMERIC(14, 4) NOT NULL,
    nav             NUMERIC(14, 4) NOT NULL, -- NAV from PDF
    nav_date        DATE NOT NULL,           -- NAV date from PDF
    cost_value      NUMERIC(14, 2) NOT NULL, -- total invested amount from PDF
    market_value    NUMERIC(14, 2) NOT NULL, -- market value from PDF
    asset_type      TEXT NOT NULL DEFAULT 'mutual_fund',
    statement_date  DATE NOT NULL,
    imported_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, isin)
);

CREATE INDEX idx_mutual_funds_user ON public.mutual_funds(user_id);

ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mutual_funds" ON public.mutual_funds
    FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- OTHER_SCHEMES
-- LIC, PPF, NPS, SSY, FD, Bonds, etc. — manually entered or parsed
-- ============================================================
CREATE TABLE public.other_schemes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scheme_type     TEXT NOT NULL,           -- 'lic', 'ppf', 'nps', 'fd', 'bond', 'ssy', 'other'
    account_id      TEXT NOT NULL,           -- policy number / account number
    name            TEXT NOT NULL,
    ticker          TEXT NOT NULL,           -- same as account_id
    units           NUMERIC(14, 4) NOT NULL, -- premiums paid / years invested / units
    unit_value      NUMERIC(14, 4) NOT NULL, -- premium per unit / annual contribution
    cost_value      NUMERIC(14, 2) NOT NULL, -- total invested = units × unit_value
    market_value    NUMERIC(14, 2) NOT NULL, -- current value / maturity value from PDF
    asset_type      TEXT NOT NULL DEFAULT 'other_scheme',
    start_date      DATE NOT NULL,
    statement_date  DATE NOT NULL,
    notes           TEXT,
    imported_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, account_id, scheme_type)
);

CREATE INDEX idx_other_schemes_user ON public.other_schemes(user_id);

ALTER TABLE public.other_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own other_schemes" ON public.other_schemes
    FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- Drop old market_cache (no longer needed)
-- ============================================================
DROP TABLE IF EXISTS public.market_cache CASCADE;
