import type { NextConfig } from "next";

/** Deploy at site root (e.g. taraform.helixsystems.ca). Set only if you host under a subpath. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  env: {
    ...(basePath ? { NEXT_PUBLIC_BASE_PATH: basePath } : {}),
  },
};

export default nextConfig;
