"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api";
import { useSession } from "@/lib/hooks/useSession";
import type { Profile } from "@/lib/types";

export function useProfile() {
  const { token } = useSession();
  return useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => apiFetch("/api/profiles/", {}, token),
    enabled: !!token,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const token = await getToken();
      return apiFetch<Profile>("/api/profiles/", { method: "PUT", body: JSON.stringify(data) }, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
