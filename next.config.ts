import type { NextConfig } from "next";

/** Deploy at site root (e.g. taraform.helixsystems.ca). Set only if you host under a subpath. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  env: {
    ...(basePath ? { NEXT_PUBLIC_BASE_PATH: basePath } : {}),
  },
  /** Many clients request `/favicon.ico` even when `<link rel="icon" href="*.png">` is set. */
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/favicon.png", permanent: false }];
  },
};

export default nextConfig;
