"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";

export interface AlertConfig {
  id: string;
  alert_type: string;
  label: string;
  enabled: boolean;
  reminder_day?: number | null;
  reminder_note?: string | null;
  category?: string | null;
  budget_amount?: number | null;
  target_allocation?: Record<string, number> | null;
  drift_threshold?: number | null;
  milestone_pct?: number | null;
  last_triggered_at?: string | null;
  created_at: string;
  // price_target fields
  symbol?: string | null;
  target_price?: number | null;
  direction?: string | null;
  alert_window_days?: number | null;
}

export interface TriggeredAlert {
  id: string;
  type: string;
  label: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  [key: string]: unknown;
}

export interface AlertEvaluation {
  total_configured: number;
  total_enabled: number;
  triggered: TriggeredAlert[];
  triggered_count: number;
}

export function useAlerts() {
  const { token } = useSession();
  return useQuery<AlertConfig[]>({
    queryKey: ["alerts"],
    queryFn: () => apiFetch("/api/alerts/", {}, token),
    enabled: !!token,
  });
}

export function useEvaluateAlerts() {
  const { token } = useSession();
  return useQuery<AlertEvaluation>({
    queryKey: ["alerts-evaluate"],
    queryFn: () => apiFetch("/api/alerts/evaluate", {}, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // re-evaluate every 5 min
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<AlertConfig, "id" | "created_at" | "last_triggered_at">) => {
      const token = await getToken();
      return apiFetch("/api/alerts/", { method: "POST", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-evaluate"] });
    },
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AlertConfig> & { id: string }) => {
      const token = await getToken();
      return apiFetch(`/api/alerts/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-evaluate"] });
    },
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiFetch(`/api/alerts/${id}`, { method: "DELETE" }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-evaluate"] });
    },
  });
}
