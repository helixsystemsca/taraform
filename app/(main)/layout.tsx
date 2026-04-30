import type { ReactNode } from "react";

import StudyLayout from "@/components/layouts/StudyLayout";

export default async function MainLayout(props: { children: ReactNode }) {
  return <StudyLayout>{props.children}</StudyLayout>;
}

