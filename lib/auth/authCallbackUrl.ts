import type { NextRequest } from "next/server";

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
 * Origin used in `emailRedirectTo` for magic link / signup confirmation.
 * Must match an entry in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * Priority:
 * 1. `AUTH_REDIRECT_ORIGIN` (canonical origin; may omit `https://` — we fix that here)
 * 2. `NEXT_PUBLIC_SITE_URL`
 * 3. Request URL origin (correct for local ports and most Vercel deployments)
 */
export function getAuthRedirectOrigin(req: NextRequest): string {
  const fallback = req.nextUrl.origin || "http://localhost:3000";
  const raw = [process.env.AUTH_REDIRECT_ORIGIN, process.env.NEXT_PUBLIC_SITE_URL].map((s) => s?.trim() ?? "").find(Boolean) ?? "";
  if (!raw) return fallback;
  return normalizeEnvOrigin(raw, fallback);
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
    url = new URL(pathname, req.nextUrl.origin || "http://localhost:3000");
  }

  const n = (nextPath?.trim() || "/home").replace(/^\/+/, "/");
  url.searchParams.set("next", n.startsWith("/") ? n : `/${n}`);
  return url.toString();
}
