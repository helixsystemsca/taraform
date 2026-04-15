/**
 * Prefix for URLs under `public/` when the app uses Next.js `basePath`
 * (must match `basePath` in `next.config.ts`).
 */
export function withAppBasePath(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
