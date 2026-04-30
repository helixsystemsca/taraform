"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/pm", label: "Overview" },
  { href: "/pm/dashboard", label: "Dashboard" },
  { href: "/pm/learn", label: "Learn" },
] as const;

export function PmBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg justify-around px-2 py-2">
        {items.map(({ href, label }) => {
          const active =
            href === "/pm" ? pathname === "/pm" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[44px] min-w-[72px] flex-col items-center justify-center rounded-lg px-2 text-xs font-medium ${
                active ? "text-emerald-400" : "text-slate-500"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
