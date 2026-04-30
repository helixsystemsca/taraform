"use client";

import { usePathname } from "next/navigation";

import { getAppModeFromPathname, type AppMode } from "@/lib/appMode";

/** Client hook: mode from current route (`/pm/*` → pm). */
export function useAppMode(): AppMode {
  const pathname = usePathname();
  return getAppModeFromPathname(pathname);
}
