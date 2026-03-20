"use client";

import { buildApiUrl, buildWsUrl } from "@/lib/api-url";

/** Use when composing fetch URLs; same as {@link buildApiUrl}. */
export function useBuildApiUrl(): typeof buildApiUrl {
  return buildApiUrl;
}

export function useWsBaseUrl(): string {
  return buildWsUrl();
}
