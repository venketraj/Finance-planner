const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getToken(): Promise<string | undefined> {
  const { createClient } = await import("@/lib/supabase/client");
  const { data: { session } } = await createClient().auth.getSession();
  return session?.access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API Error");
  }

  return res.json();
}
