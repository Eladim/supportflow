import { NextResponse } from "next/server";

/**
 * Auth is enforced in the app shell via {@link ./components/require-auth.tsx}.
 *
 * We do not gate on the `sf_refresh` cookie here: that cookie is host-scoped to the API
 * (e.g. *.onrender.com). On a separate frontend host (e.g. Vercel), middleware would never
 * see it, yet localhost can appear to work because browsers relax cookie port matching for
 * localhost — so checking the cookie in middleware breaks production split-domain deploys.
 */
export function middleware(): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tickets/:path*",
    "/team/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
