import type { ReactNode } from "react";

import { ResponsiveShell } from "@/components/taraform/ResponsiveShell";
import { getAccountRoleContext, settingsHrefForRole } from "@/lib/auth/accountRoleContext";

export default async function MainLayout(props: { children: ReactNode }) {
  const { user, role } = await getAccountRoleContext();
  const settingsHref = user ? settingsHrefForRole(role) : "/settings";

  return <ResponsiveShell settingsHref={settingsHref}>{props.children}</ResponsiveShell>;
}

