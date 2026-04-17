import type { NextRequest } from "next/server";

/** Prefix pathname with `NEXT_PUBLIC_BASE_PATH` when the app is deployed under a subpath. */
export function withAppBasePath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/**
 * Origin used in `emailRedirectTo` for magic link / signup confirmation.
 * Must match an entry in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * Priority:
 * 1. `AUTH_REDIRECT_ORIGIN` (server-only canonical URL, no trailing slash)
 * 2. `NEXT_PUBLIC_SITE_URL` (public canonical site URL)
 * 3. Request `Origin` / URL from the browser (correct for local ports and most Vercel deployments)
 */
export function getAuthRedirectOrigin(req: NextRequest): string {
  const fromEnv = [process.env.AUTH_REDIRECT_ORIGIN, process.env.NEXT_PUBLIC_SITE_URL]
    .map((s) => s?.trim().replace(/\/$/, ""))
    .find(Boolean);
  if (fromEnv) return fromEnv;

  return req.nextUrl.origin;
}

/**
 * Full URL Supabase should redirect the user to after they click the email link (includes `next`).
 * Respects `NEXT_PUBLIC_BASE_PATH` when the app is hosted under a subpath.
 */
export function buildAuthEmailRedirectUrl(req: NextRequest, nextPath: string | undefined): string {
  const origin = getAuthRedirectOrigin(req);
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const pathTail = "/auth/callback";
  const pathname = base ? `${base}${pathTail}` : pathTail;
  const url = new URL(pathname, origin);
  const n = (nextPath?.trim() || "/home").replace(/^\/+/, "/");
  url.searchParams.set("next", n.startsWith("/") ? n : `/${n}`);
  return url.toString();
}
