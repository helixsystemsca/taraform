import { withAppBasePath } from "@/lib/basePath";

/**
 * Bump this string whenever you replace `public/taraform.png` or `public/favicon.png`
 * so browsers and CDNs fetch the new bytes instead of a cached copy.
 *
 * Note: CSS cannot trim transparent padding inside a PNG — if the mark still looks
 * “small” or surrounded by empty space, the image file still has extra transparent
 * canvas; re-export with a tighter crop or less empty alpha around the artwork.
 */
const CACHE = "6";

export function brandPublicUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = withAppBasePath(normalized);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${CACHE}`;
}
