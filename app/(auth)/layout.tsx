import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-taraform px-4 py-10 sm:px-6">{children}</div>;
}

