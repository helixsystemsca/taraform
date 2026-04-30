/**
 * Global app mode derived from the URL: PM shell vs study shell.
 * Single app — no duplicate deployments.
 */

export type AppMode = "study" | "pm";

/** Workspace tag for persisted client data (defaults to study for legacy rows). */
export type AppWorkspace = "study" | "pm";

export const DEFAULT_WORKSPACE: AppWorkspace = "study";

/** Paths starting with /pm use the PM layout and should tag new data as "pm" where applicable. */
export function getAppModeFromPathname(pathname: string | null): AppMode {
  if (!pathname) return "study";
  return pathname === "/pm" || pathname.startsWith("/pm/") ? "pm" : "study";
}

export function getWorkspaceForMode(mode: AppMode): AppWorkspace {
  return mode === "pm" ? "pm" : "study";
}
