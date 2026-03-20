"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { Transaction } from "@/lib/types";

interface TransactionFilters {
  type?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { token } = useSession();
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined) params.set(k, String(v));
  });

  return useQuery<Transaction[]>({
    queryKey: ["transactions", filters],
    queryFn: () => apiFetch(`/api/transactions/?${params}`, {}, token),
    enabled: !!token,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Transaction, "id" | "user_id" | "created_at">) => {
      const token = await getToken();
      return apiFetch<Transaction>("/api/transactions/", { method: "POST", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });
}

export function useTransactionSummary(months = 1) {
  const { token } = useSession();
  return useQuery<{ total_income: number; total_expense: number; by_category: Record<string, number> }>({
    queryKey: ["transaction-summary", months],
    queryFn: () => apiFetch(`/api/transactions/summary?months=${months}`, {}, token),
    enabled: !!token,
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (txnId: string) => {
      const token = await getToken();
      return apiFetch(`/api/transactions/${txnId}`, { method: "DELETE" }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
