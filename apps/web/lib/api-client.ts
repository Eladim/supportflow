import { toast } from "sonner";
import { buildApiUrl } from "./api-url";
import type { ApiErrorBody, PublicUser } from "./types";

const ACCESS_STORAGE = "sf_access";

/** After this many ms, show a “cold start” hint (e.g. Render free tier spin-down). */
const SLOW_REQUEST_MS = 8_000;

const SLOW_TOAST_TITLE = "Backend is waking up";
const SLOW_TOAST_DESCRIPTION =
  "The server is hosted on a free-tier instance and may take around 50 seconds or more to start after inactivity. Your request is still being processed.";

/*
 * Alternative copy if you want to swap the strings above:
 * Title: "Please wait a moment"
 * Description: "Our backend is running on a free-tier server, which may go to sleep when inactive. It can take around 50 seconds or more to wake up and respond."
 */

/** Concurrent API calls each wrap with `withSlowRequestNotice`; one shared toast avoids duplicates (e.g. refresh + login). */
let inflightSlowWatches = 0;
let globalSlowTimer: ReturnType<typeof setTimeout> | null = null;
let globalSlowToastId: string | number | undefined;

function beginSlowRequestWatch(): void {
  if (typeof window === "undefined") return;
  inflightSlowWatches += 1;
  if (inflightSlowWatches !== 1) return;
  globalSlowTimer = setTimeout(() => {
    globalSlowTimer = null;
    if (globalSlowToastId === undefined) {
      globalSlowToastId = toast(SLOW_TOAST_TITLE, {
        description: SLOW_TOAST_DESCRIPTION,
        duration: Infinity,
      });
    }
  }, SLOW_REQUEST_MS);
}

function endSlowRequestWatch(): void {
  if (typeof window === "undefined") return;
  inflightSlowWatches = Math.max(0, inflightSlowWatches - 1);
  if (inflightSlowWatches > 0) return;
  if (globalSlowTimer !== null) {
    clearTimeout(globalSlowTimer);
    globalSlowTimer = null;
  }
  if (globalSlowToastId !== undefined) {
    toast.dismiss(globalSlowToastId);
    globalSlowToastId = undefined;
  }
}

function withSlowRequestNotice<T>(run: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return run();
  beginSlowRequestWatch();
  return run().finally(() => {
    endSlowRequestWatch();
  });
}

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
  return withSlowRequestNotice(() => tryRefresh());
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
  if (!retried) {
    return withSlowRequestNotice(() => apiFetchImpl<T>(path, init, false));
  }
  return apiFetchImpl<T>(path, init, true);
}

async function apiFetchImpl<T>(
  path: string,
  init: RequestInit,
  retried: boolean,
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
    if (newTok) return apiFetchImpl<T>(path, init, true);
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
