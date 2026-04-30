import type { ReactNode } from "react";

import { PmBottomNav } from "@/app/pm/_components/PmBottomNav";
import { PmHeader } from "@/app/pm/_components/PmHeader";

/**
 * PM mode shell: neutral / dark — does not use Taraform pink surfaces.
 */
export default function PMLayout(props: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950 font-sans text-slate-100 antialiased">
      <PmHeader />
      <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-4">{props.children}</main>
      <PmBottomNav />
    </div>
  );
}
