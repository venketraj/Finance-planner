"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import { createContext, useContext } from "react";

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  color: string;
  owner_id: string;
  created_at: string;
}

export interface CombinedPortfolio {
  primary: { stocks: number; mutual_funds: number; other: number; total: number };
  members: Array<FamilyMember & { stocks: number; mutual_funds: number; other: number; total: number }>;
  total_value: number;
}

// ── Active member context (null = primary user) ──────────────────────────────
export interface FamilyContextValue {
  activeMemberId: string | null;
  setActiveMemberId: (id: string | null) => void;
}

export const FamilyContext = createContext<FamilyContextValue>({
  activeMemberId: null,
  setActiveMemberId: () => {},
});

export function useActiveMember() {
  return useContext(FamilyContext);
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useFamilyMembers() {
  const { token } = useSession();
  return useQuery<FamilyMember[]>({
    queryKey: ["family-members"],
    queryFn: () => apiFetch("/api/family/members", {}, token),
    enabled: !!token,
  });
}

export function useCombinedPortfolio() {
  const { token } = useSession();
  return useQuery<CombinedPortfolio>({
    queryKey: ["family-combined"],
    queryFn: () => apiFetch("/api/family/combined-portfolio", {}, token),
    enabled: !!token,
  });
}

export function useCreateFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; relation: string; color: string }) => {
      const token = await getToken();
      return apiFetch("/api/family/members", { method: "POST", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members"] }),
  });
}

export function useDeleteFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiFetch(`/api/family/members/${id}`, { method: "DELETE" }, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-members"] });
      qc.invalidateQueries({ queryKey: ["family-combined"] });
    },
  });
}
