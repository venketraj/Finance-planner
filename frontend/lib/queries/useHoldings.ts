"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { PortfolioHolding, OtherSchemeHolding } from "@/lib/types";

export function useStockHoldings() {
  const { token } = useSession();
  return useQuery<PortfolioHolding[]>({
    queryKey: ["holdings-stocks"],
    queryFn: () => apiFetch("/api/holdings/stocks", {}, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMutualFundHoldings() {
  const { token } = useSession();
  return useQuery<PortfolioHolding[]>({
    queryKey: ["holdings-mf"],
    queryFn: () => apiFetch("/api/holdings/mutual-funds", {}, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOtherSchemeHoldings() {
  const { token } = useSession();
  return useQuery<OtherSchemeHolding[]>({
    queryKey: ["holdings-other"],
    queryFn: () => apiFetch("/api/holdings/other-schemes", {}, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      asset_type: string;
      investment: string;
      investment_code?: string;
      asset_class?: string;
      category?: string;
      amc_name?: string;
      mf_type?: string;
      expense_ratio?: number;
      broker?: string;
      investment_date?: string;
      total_units?: number;
      invested_amount: number;
      market_value: number;
      holding_pct?: number;
      total_gain_inr?: number;
      total_gain_pct?: number;
      xirr_pct?: number;
    }) => {
      const token = await getToken();
      return apiFetch("/api/holdings/manual", { method: "POST", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["holdings-mf"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });
}
