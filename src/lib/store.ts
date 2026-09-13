// Client-persisted store abstraction backed by the server store API.
// All data is stored per-user in PostgreSQL (Supabase) via Prisma.
// Methods remain async so callers never change.

export interface SavedItem {
  key: string;
  value: string;
}

export class AuthRequiredError extends Error {
  constructor() {
    super("You need to sign in to do this");
    this.name = "AuthRequiredError";
  }
}

const API_ROUTE = "/api/store";

async function request<T>(path: string, init?: RequestInit): Promise<{ value: T } | null> {
  const res = await fetch(path, init);
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok) return null;
  return res.json();
}

export async function storeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const data = await request<{ value: T }>(
      `${API_ROUTE}?key=${encodeURIComponent(key)}`,
      { cache: "no-store" }
    );
    if (!data || data.value == null) return fallback;
    return data.value as T;
  } catch (error) {
    if (error instanceof AuthRequiredError) return fallback;
    return fallback;
  }
}

export async function storeSet<T>(key: string, value: T): Promise<void> {
  const data = await request<{ ok: boolean }>(API_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!data) throw new Error(`Failed to save "${key}"`);
}

export async function storeRemove(key: string): Promise<void> {
  await request<{ ok: boolean }>(API_ROUTE, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}

export async function storeMerge<T extends object>(key: string, value: Partial<T>): Promise<T> {
  const current = await storeGet<T>(key, {} as T);
  const merged = { ...current, ...value };
  await storeSet(key, merged);
  return merged;
}

export const STORAGE_KEYS = {
  savedJobs: "savedJobs",
  applications: "applications",
  profile: "profile",
  notifications: "notifications",
  employer: "employer",
  admin: "admin",
} as const;