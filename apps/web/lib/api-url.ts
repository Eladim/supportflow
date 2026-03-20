/** Base URL for REST API (no trailing slash). */
const rawBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function buildApiUrl(path: string): string {
  const base = rawBase.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function buildWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return rawBase.replace(/^http/, "ws").replace(/\/$/, "");
}
