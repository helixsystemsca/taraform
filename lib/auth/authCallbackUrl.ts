import type { NextRequest } from "next/server";

/**
 * Production site — used for magic links, email confirmation, and server redirects when
 * `NEXT_PUBLIC_SITE_URL` / `AUTH_REDIRECT_ORIGIN` are not set (avoids localhost / *.vercel.app in emails).
 */
export const PRODUCTION_APP_ORIGIN = "https://taraform.helixsystems.ca";

/** Prefix pathname with `NEXT_PUBLIC_BASE_PATH` when the app is deployed under a subpath. */
export function withAppBasePath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/**
 * Env values like `taraform.vercel.app` (no scheme) make `new URL(path, base)` throw "Invalid URL".
 * This normalizes to a valid `origin` only (no path).
 */
/** True if this origin should never be used for email / magic links in production. */
export function isLocalDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
  } catch {
    return false;
  }
}

function normalizeEnvOrigin(raw: string, fallbackOrigin: string): string {
  const s = raw.trim().replace(/\/+$/, "");
  if (!s) return fallbackOrigin;

  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).origin;
    } catch {
      return fallbackOrigin;
    }
  }

  const hostPort = s.replace(/^\/+/, "");
  const lower = hostPort.toLowerCase();
  const scheme = lower.startsWith("localhost") || lower.startsWith("127.0.0.1") ? "http" : "https";
  try {
    return new URL(`${scheme}://${hostPort}`).origin;
  } catch {
    return fallbackOrigin;
  }
}

/**
 * Public origin for auth emails and absolute redirects.
 *
 * Priority:
 * 1. `AUTH_REDIRECT_ORIGIN`
 * 2. `NEXT_PUBLIC_SITE_URL`
 * 3. **Production:** `https://taraform.helixsystems.ca` (never infer from request — avoids wrong hosts in emails)
 * 4. **Development:** request origin (or localhost fallback)
 */
export function getAuthRedirectOrigin(req: NextRequest): string {
  const requestFallback = req.nextUrl.origin || "http://localhost:3000";
  const raw = [process.env.AUTH_REDIRECT_ORIGIN, process.env.NEXT_PUBLIC_SITE_URL].map((s) => s?.trim() ?? "").find(Boolean) ?? "";
  if (raw) {
    const fromEnv = normalizeEnvOrigin(raw, requestFallback);
    // Never send magic links to localhost from a production build (common Vercel footgun:
    // NEXT_PUBLIC_SITE_URL still set to http://localhost:3000).
    if (process.env.NODE_ENV === "production" && isLocalDevOrigin(fromEnv)) {
      return PRODUCTION_APP_ORIGIN;
    }
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_ORIGIN;
  }

  return requestFallback;
}

/**
 * Absolute URL on the public site (login, home, callback, etc.).
 */
export function buildAbsoluteUrl(req: NextRequest, pathname: string, query?: Record<string, string | undefined>): URL {
  const origin = getAuthRedirectOrigin(req);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const u = new URL(withAppBasePath(path), origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) u.searchParams.set(k, v);
    }
  }
  return u;
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

  let url: URL;
  try {
    url = new URL(pathname, origin);
  } catch {
    url = new URL(pathname, PRODUCTION_APP_ORIGIN);
  }

  const n = (nextPath?.trim() || "/home").replace(/^\/+/, "/");
  url.searchParams.set("next", n.startsWith("/") ? n : `/${n}`);
  return url.toString();
}
