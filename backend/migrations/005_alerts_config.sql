-- Migration: User alert configurations
-- Stores per-user alert rules; evaluated on page load / on-demand

CREATE TABLE IF NOT EXISTS public.alerts_config (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type   TEXT NOT NULL,       -- 'sip_reminder' | 'rebalance' | 'budget' | 'fire_milestone' | 'emi_reminder'
    label        TEXT NOT NULL,       -- user-friendly name
    enabled      BOOLEAN NOT NULL DEFAULT true,
    -- SIP / EMI reminder
    reminder_day  INT,                -- day of month (1-31)
    reminder_note TEXT,               -- e.g. "HDFC Midcap SIP"
    -- Budget alert
    category      TEXT,              -- transaction category to watch
    budget_amount NUMERIC(14,2),     -- monthly limit in INR
    -- Rebalance: target allocation percentages (stored as JSON)
    target_allocation JSONB,         -- e.g. {"stock": 40, "mutual_fund": 50, "other_scheme": 10}
    drift_threshold   NUMERIC(5,2) DEFAULT 5.0,  -- % drift before alert
    -- FIRE milestone
    milestone_pct INT,               -- 25 | 50 | 75 | 100
    -- Generic
    last_triggered_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_config_user ON public.alerts_config(user_id);

ALTER TABLE public.alerts_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alerts"
    ON public.alerts_config
    FOR ALL USING (auth.uid() = user_id);
