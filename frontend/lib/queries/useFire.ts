"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { FireResult } from "@/lib/types";

export function useFireProjection() {
  const { token } = useSession();
  return useQuery<FireResult>({
    queryKey: ["fire-projection"],
    queryFn: () => apiFetch("/api/fire/projection", {}, token),
    enabled: !!token,
  });
}

export function useFireSimulate() {
  const { token } = useSession();
  return useMutation({
    mutationFn: (params: {
      current_age: number;
      retirement_age: number;
      life_expectancy?: number;
      monthly_income: number;
      monthly_expenses: number;
      current_investments: number;
      current_debt?: number;
      monthly_debt_payments?: number;
      avg_debt_interest_rate?: number;
      expected_return?: number;
      expected_inflation?: number;
      safe_withdrawal_rate?: number;
    }) =>
      apiFetch<FireResult>("/api/fire/simulate", {
        method: "POST",
        body: JSON.stringify(params),
      }, token),
  });
}
