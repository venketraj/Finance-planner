"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string | null;
  sector: string | null;
  industry: string | null;
  current_price: number | null;
  previous_close: number | null;
  day_high: number | null;
  day_low: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  pb_ratio: number | null;
  ps_ratio: number | null;
  ev_ebitda: number | null;
  eps_ttm: number | null;
  eps_forward: number | null;
  revenue: number | null;
  gross_margins: number | null;
  operating_margins: number | null;
  profit_margins: number | null;
  roe: number | null;
  roa: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  book_value: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
  earnings_growth: number | null;
  revenue_growth: number | null;
  shares_outstanding: number | null;
  float_shares: number | null;
  held_pct_insiders: number | null;
  held_pct_institutions: number | null;
  description: string | null;
}

export function useStockQuote(symbol: string | null) {
  const { token } = useSession();
  return useQuery<StockQuote>({
    queryKey: ["market-quote", symbol],
    queryFn: () => apiFetch(`/api/market/quote/${encodeURIComponent(symbol!)}`, {}, token),
    enabled: !!token && !!symbol,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export interface ScreenerFilters {
  symbols: string[];
  min_pe?: number;
  max_pe?: number;
  min_pb?: number;
  max_pb?: number;
  min_roe?: number;
  max_debt_to_equity?: number;
  min_market_cap?: number;
  max_market_cap?: number;
  min_eps?: number;
  min_book_value?: number;
  min_profit_margin?: number;
}

export function useScreener() {
  return useMutation<StockQuote[], Error, ScreenerFilters>({
    mutationFn: async (filters) => {
      const token = await getToken();
      return apiFetch("/api/market/screener", { method: "POST", body: JSON.stringify(filters) }, token);
    },
  });
}

// Watchlist hooks
export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  added_at: string;
}

export function useWatchlist() {
  const { token } = useSession();
  return useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => apiFetch("/api/watchlist/", {}, token),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { symbol: string; name: string; asset_type: string }) => {
      const token = await getToken();
      return apiFetch("/api/watchlist/", { method: "POST", body: JSON.stringify(item) }, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (symbol: string) => {
      const token = await getToken();
      return apiFetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" }, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}
