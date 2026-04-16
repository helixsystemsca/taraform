import { withAppBasePath } from "@/lib/basePath";

/**
 * Bump this string whenever you replace `public/taraform.png` or `public/favicon.png`
 * so browsers and CDNs fetch the new bytes instead of a cached copy.
 */
const CACHE = "8";

export function brandPublicUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = withAppBasePath(normalized);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${CACHE}`;
}
