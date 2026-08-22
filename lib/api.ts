import { createClient } from "./supabase/client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const supabase = createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const headers = new Headers(options.headers);

  headers.set(
    "Authorization",
    `Bearer ${session.access_token}`
  );

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}