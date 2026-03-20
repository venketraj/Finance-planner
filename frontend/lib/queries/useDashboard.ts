"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { NetWorthSnapshot, DashboardOverview, DebtPaydown } from "@/lib/types";

export function useNetWorthHistory(days = 365) {
  const { token } = useSession();
  return useQuery<NetWorthSnapshot[]>({
    queryKey: ["net-worth-history", days],
    queryFn: () => apiFetch(`/api/dashboard/net-worth-history?days=${days}`, {}, token),
    enabled: !!token,
  });
}

export function useDebtPaydown() {
  const { token } = useSession();
  return useQuery<DebtPaydown>({
    queryKey: ["debt-paydown"],
    queryFn: () => apiFetch("/api/dashboard/debt-paydown", {}, token),
    enabled: !!token,
  });
}

export function useDashboardOverview() {
  const { token } = useSession();
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: () => apiFetch("/api/dashboard/overview", {}, token),
    enabled: !!token,
  });
}
