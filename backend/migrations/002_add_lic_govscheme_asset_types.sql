-- Migration: extend asset_type to support LIC and Government Schemes
-- Run this in the Supabase SQL Editor after 001_initial_schema.sql

-- Drop old constraint and add updated one
ALTER TABLE public.holdings
  DROP CONSTRAINT IF EXISTS holdings_asset_type_check;

ALTER TABLE public.holdings
  ADD CONSTRAINT holdings_asset_type_check
  CHECK (asset_type IN ('stock', 'mutual_fund', 'lic', 'gov_scheme'));

-- Same for market_cache (if LIC/gov_scheme prices are ever cached)
ALTER TABLE public.market_cache
  DROP CONSTRAINT IF EXISTS market_cache_asset_type_check;

ALTER TABLE public.market_cache
  ADD CONSTRAINT market_cache_asset_type_check
  CHECK (asset_type IN ('stock', 'mutual_fund', 'lic', 'gov_scheme'));
