-- ============================================================
-- Personal Finance & FIRE Tracker — Initial Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with financial planning data
-- ============================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    monthly_income NUMERIC(14,2) DEFAULT 0,
    monthly_expenses NUMERIC(14,2) DEFAULT 0,
    current_age INTEGER,
    retirement_age INTEGER DEFAULT 60,
    life_expectancy INTEGER DEFAULT 85,
    safe_withdrawal_rate NUMERIC(5,4) DEFAULT 0.0400,
    expected_inflation NUMERIC(5,4) DEFAULT 0.0600,
    expected_return NUMERIC(5,4) DEFAULT 0.1200,
    fire_target_annual_expense NUMERIC(14,2),
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- Unified table for expenses, income, debt payments, investments
-- ============================================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'debt_payment', 'investment', 'transfer')),
    category TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_interval TEXT CHECK (recurrence_interval IN ('monthly', 'quarterly', 'yearly')),
    debt_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON public.transactions(user_id, type);

-- ============================================================
-- HOLDINGS
-- Stock and Mutual Fund units
-- ============================================================
CREATE TABLE public.holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'mutual_fund')),
    ticker TEXT NOT NULL,
    name TEXT,
    units NUMERIC(14,4) NOT NULL,
    purchase_price NUMERIC(14,4) NOT NULL,
    purchase_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_holdings_user ON public.holdings(user_id, is_active);
CREATE INDEX idx_holdings_ticker ON public.holdings(ticker);

-- ============================================================
-- DEBTS
-- Outstanding debts for FIRE calculation and debt paydown tracking
-- ============================================================
CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    principal NUMERIC(14,2) NOT NULL,
    outstanding_balance NUMERIC(14,2) NOT NULL,
    interest_rate NUMERIC(5,4) NOT NULL,
    emi_amount NUMERIC(14,2),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debts_user ON public.debts(user_id, is_active);

-- ============================================================
-- MARKET_CACHE
-- Cached market prices and fundamental data
-- ============================================================
CREATE TABLE public.market_cache (
    ticker TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'mutual_fund')),
    last_price NUMERIC(14,4),
    day_change_pct NUMERIC(8,4),
    pe_ratio NUMERIC(10,4),
    de_ratio NUMERIC(10,4),
    market_cap NUMERIC(18,2),
    fifty_two_week_high NUMERIC(14,4),
    fifty_two_week_low NUMERIC(14,4),
    fundamental_data JSONB DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NET_WORTH_SNAPSHOTS
-- Daily snapshots for "Net Worth Over Time" chart
-- ============================================================
CREATE TABLE public.net_worth_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_investments NUMERIC(14,2) DEFAULT 0,
    total_debt NUMERIC(14,2) DEFAULT 0,
    net_worth NUMERIC(14,2) DEFAULT 0,
    breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_networth_user_date ON public.net_worth_snapshots(user_id, snapshot_date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Transactions
CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- Holdings
CREATE POLICY "Users can manage own holdings" ON public.holdings
    FOR ALL USING (auth.uid() = user_id);

-- Debts
CREATE POLICY "Users can manage own debts" ON public.debts
    FOR ALL USING (auth.uid() = user_id);

-- Net worth snapshots
CREATE POLICY "Users can view own net worth" ON public.net_worth_snapshots
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert snapshots" ON public.net_worth_snapshots
    FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_holdings_updated_at
    BEFORE UPDATE ON public.holdings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_debts_updated_at
    BEFORE UPDATE ON public.debts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
