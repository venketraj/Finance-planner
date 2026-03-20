-- Migration 008: Watchlist + Price Alert tables

-- ── Watchlist ──────────────────────────────────────────────────────────────
create table if not exists watchlist (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  symbol          text not null,          -- e.g. "INFY.NS" or "PPFAS_MF"
  name            text not null,
  asset_type      text not null,          -- "stock" | "mutual_fund"
  added_at        timestamptz not null default now()
);

create unique index if not exists watchlist_user_symbol on watchlist(user_id, symbol);

alter table watchlist enable row level security;
create policy "Users manage own watchlist"
  on watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Price alerts ───────────────────────────────────────────────────────────
-- Extends the alerts_config table with price-target columns.
-- Add columns only if they don't exist (idempotent).
alter table alerts_config
  add column if not exists symbol            text,
  add column if not exists target_price      numeric,
  add column if not exists direction         text,   -- "above" | "below"
  add column if not exists alert_window_days int;    -- user-defined check window
