/**
 * `new URL()` requires a protocol. Vercel / env often stores only the host
 * (e.g. `taraform.helixsystems.ca`) — normalize to a valid absolute URL.
 */
export function resolveMetadataBaseUrl(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (raw) {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withProtocol);
    } catch {
      return undefined;
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
