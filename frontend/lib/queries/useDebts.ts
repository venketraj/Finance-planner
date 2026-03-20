"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { Debt } from "@/lib/types";

export function useDebts(activeOnly = true) {
  const { token } = useSession();
  return useQuery<Debt[]>({
    queryKey: ["debts", activeOnly],
    queryFn: () => apiFetch(`/api/debts/?active_only=${activeOnly}`, {}, token),
    enabled: !!token,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      principal: number;
      outstanding_balance: number;
      interest_rate: number;
      emi_amount?: number;
      start_date: string;
      end_date?: string;
    }) => {
      const token = await getToken();
      return apiFetch<Debt>("/api/debts/", { method: "POST", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["debt-paydown"] });
    },
  });
}
