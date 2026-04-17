/**
 * Fixed identity used only when `isDevAuthBypass()` is true (`NODE_ENV === "development"`).
 * Not used in production builds.
 */
export const DEV_USER = {
  id: "dev-user-123",
  email: "dev@local.test",
} as const;

export function isDevAuthBypass() {
  return process.env.NODE_ENV === "development";
}
