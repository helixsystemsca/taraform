import type { ReactNode } from "react";

import { ResponsiveShell } from "@/components/taraform/ResponsiveShell";

export default function MainLayout(props: { children: ReactNode }) {
  return <ResponsiveShell>{props.children}</ResponsiveShell>;
}

