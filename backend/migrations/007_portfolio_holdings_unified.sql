-- Migration 007: unified portfolio_holdings table
-- Replaces separate stocks / mutual_funds tables for the Excel-import workflow.
-- The other_schemes table is untouched.
--
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Classification (drives which UI table the row appears in)
    asset_type        TEXT NOT NULL CHECK (asset_type IN ('stock', 'mutual_fund')),
    asset_class       TEXT,           -- e.g. "Equity", "Debt", "Hybrid", "Gold"
    category          TEXT,           -- e.g. "Large Cap", "Others"

    -- Identity
    investment_code   TEXT,           -- ISIN / scheme code
    investment        TEXT NOT NULL,  -- full stock name / scheme name
    amc_name          TEXT,           -- AMC name (MF) or broker name (stock)

    -- MF-specific
    mf_type           TEXT,           -- "Direct" | "Regular"  (NULL for stocks)
    expense_ratio     NUMERIC(8,4),   -- e.g. 0.1500  (NULL for stocks)

    -- Trade details
    broker            TEXT,
    investment_date   DATE,
    total_units       NUMERIC(18,4),

    -- Values (stored from excel, not recalculated server-side)
    invested_amount   NUMERIC(18,2) NOT NULL DEFAULT 0,
    market_value      NUMERIC(18,2) NOT NULL DEFAULT 0,
    holding_pct       NUMERIC(8,4),   -- Holding (%)
    total_gain_inr    NUMERIC(18,2),  -- Total Gain/Loss (INR)
    total_gain_pct    NUMERIC(8,4),   -- Total Gain/Loss (%)
    xirr_pct          NUMERIC(8,4),   -- XIRR (%)

    imported_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user      ON portfolio_holdings (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_type ON portfolio_holdings (user_id, asset_type);

-- Row-level security
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio_holdings"
    ON portfolio_holdings FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
