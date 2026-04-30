import type { ReactNode } from "react";

import PMLayout from "@/components/layouts/PMLayout";

export const metadata = {
  title: "PM Trainer",
  description: "Project management learning mode",
};

export default function PmRouteLayout(props: { children: ReactNode }) {
  return <PMLayout>{props.children}</PMLayout>;
}
