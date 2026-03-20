-- Migration: Track portfolio value at each PDF import
-- Used to show gain/loss vs previous upload in PortfolioStats

CREATE TABLE IF NOT EXISTS public.portfolio_import_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_type   TEXT NOT NULL,          -- 'stock' | 'mutual_fund' | 'other_scheme' | 'all'
    total_invested  NUMERIC(16, 2) NOT NULL DEFAULT 0,
    total_value     NUMERIC(16, 2) NOT NULL DEFAULT 0,
    stocks_value    NUMERIC(16, 2) NOT NULL DEFAULT 0,
    mf_value        NUMERIC(16, 2) NOT NULL DEFAULT 0,
    other_value     NUMERIC(16, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_portfolio_snapshots_user_time
    ON public.portfolio_import_snapshots(user_id, imported_at DESC);

ALTER TABLE public.portfolio_import_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own portfolio snapshots"
    ON public.portfolio_import_snapshots
    FOR ALL USING (auth.uid() = user_id);
