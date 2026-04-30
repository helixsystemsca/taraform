import type { ReactNode } from "react";

import { ResponsiveShell } from "@/components/taraform/ResponsiveShell";
import { getAccountRoleContext, settingsHrefForRole } from "@/lib/auth/accountRoleContext";

/**
 * Study mode shell: existing Taraform navigation + editorial styling.
 */
export default async function StudyLayout(props: { children: ReactNode }) {
  const { user, role } = await getAccountRoleContext();
  const settingsHref = user ? settingsHrefForRole(role) : "/settings";

  return <ResponsiveShell settingsHref={settingsHref}>{props.children}</ResponsiveShell>;
}
