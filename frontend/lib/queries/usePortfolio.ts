"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { PortfolioSummary } from "@/lib/types";

export function usePortfolioSummary() {
  const { token } = useSession();
  return useQuery<PortfolioSummary>({
    queryKey: ["portfolio-summary"],
    queryFn: () => apiFetch("/api/portfolio/summary", {}, token),
    enabled: !!token,
  });
}

export interface ImportSnapshot {
  id: string;
  imported_at: string;
  document_type: string;
  total_invested: number;
  total_value: number;
  stocks_value: number;
  mf_value: number;
  other_value: number;
}

export function usePortfolioImportHistory() {
  const { token } = useSession();
  return useQuery<ImportSnapshot[]>({
    queryKey: ["portfolio-import-history"],
    queryFn: () => apiFetch("/api/portfolio/import-history", {}, token),
    enabled: !!token,
  });
}

export function useHoldingXirr(ticker: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["holding-xirr", ticker],
    queryFn: () => apiFetch(`/api/portfolio/holdings/${ticker}/xirr`, {}, token),
    enabled: !!token && !!ticker,
  });
}

export function useMfAnalysis(schemeCode: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["mf-analysis", schemeCode],
    queryFn: () => apiFetch(`/api/portfolio/mf/${schemeCode}/analysis`, {}, token),
    enabled: !!token && !!schemeCode,
  });
}
