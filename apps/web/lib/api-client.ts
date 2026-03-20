import { buildApiUrl } from "./api-url";
import type { ApiErrorBody, PublicUser } from "./types";

const ACCESS_STORAGE = "sf_access";

let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return memoryToken;
  if (memoryToken) return memoryToken;
  const s = sessionStorage.getItem(ACCESS_STORAGE);
  memoryToken = s;
  return s;
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(ACCESS_STORAGE, token);
  else sessionStorage.removeItem(ACCESS_STORAGE);
}

/** Exchange httpOnly refresh cookie for an access token; returns null if session invalid. */
export async function refreshAccessToken(): Promise<string | null> {
  return tryRefresh();
}

async function tryRefresh(): Promise<string | null> {
  const res = await fetch(buildApiUrl("/api/v1/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const at = rec.accessToken;
  if (typeof at !== "string") return null;
  setAccessToken(at);
  return at;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (
    !headers.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  const isAuthPublic =
    path.includes("/auth/login") ||
    path.includes("/auth/register") ||
    path.includes("/auth/refresh");
  if (res.status === 401 && !isAuthPublic && !retried) {
    const newTok = await tryRefresh();
    if (newTok) return apiFetch<T>(path, init, true);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const body =
      parsed && typeof parsed === "object" && "code" in parsed
        ? (parsed as ApiErrorBody)
        : null;
    const msg = body?.message ?? `Request failed (${res.status})`;
    throw new ApiClientError(res.status, msg, body);
  }

  return parsed as T;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ accessToken: string; user: PublicUser }> {
  const data = await apiFetch<{ accessToken: string; user: PublicUser }>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  setAccessToken(data.accessToken);
  return data;
}

export async function registerRequest(
  email: string,
  password: string,
  name: string,
): Promise<{ accessToken: string; user: PublicUser }> {
  const data = await apiFetch<{ accessToken: string; user: PublicUser }>(
    "/api/v1/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    },
  );
  setAccessToken(data.accessToken);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiFetch<void>("/api/v1/auth/logout", { method: "POST" });
  setAccessToken(null);
}

export async function meRequest(): Promise<{ user: PublicUser }> {
  return apiFetch<{ user: PublicUser }>("/api/v1/auth/me");
}
