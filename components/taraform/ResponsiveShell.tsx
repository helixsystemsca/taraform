"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, NotebookPen, PanelLeft, Sparkles, Library, UploadCloud, ListChecks } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaraformLogo } from "@/components/taraform/TaraformLogo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/plan", label: "Study Plan", icon: ListChecks },
  { href: "/upload", label: "Upload Notes", icon: UploadCloud },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/review", label: "Review", icon: Sparkles },
  { href: "/concepts", label: "Concepts", icon: Library },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
              "border border-transparent hover:bg-blush-medium/45",
              active ? "border-blush-dust/45 bg-white/75 text-ink" : "text-ink/70",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-copper" : "text-ink/45")} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/70 bg-blush-sheet/85 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-[680px] grid-cols-4 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition",
                active ? "bg-white/70 text-ink" : "text-ink/55 hover:bg-blush-medium/40",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-copper" : "text-ink/45")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FocusTopBar({ pathname }: { pathname: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#fdfaf6]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200/70 bg-white/60 text-ink/75 hover:bg-blush-medium/50"
                aria-label="Open navigation"
              >
                <PanelLeft className="h-5 w-5 text-copper" />
              </button>
            </DialogTrigger>
            <DialogContent className="p-0">
              <DialogHeader className="border-b border-stone-200/70 bg-[#fdfaf6] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-base">Navigate</DialogTitle>
                  <TaraformLogo variant="dialog" />
                </div>
              </DialogHeader>
              <SidebarNav pathname={pathname} />
            </DialogContent>
          </Dialog>
          <TaraformLogo variant="compact" />
        </div>
        <div className="text-xs text-ink/45">Focus mode</div>
      </div>
    </div>
  );
}

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isNotes = isActive(pathname, "/notes");

  if (isNotes) {
    return (
      <div className="min-h-dvh">
        <FocusTopBar pathname={pathname} />
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-5 sm:px-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24 lg:pb-0">
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-5 sm:px-6">
        <div className="flex gap-5">
          <aside className="hidden w-[260px] shrink-0 lg:block">
            <div className="glass overflow-hidden rounded-[1.75rem]">
              <div className="flex items-center border-b border-stone-200/70 bg-[#fdfaf6] px-4 py-3 sm:px-5 sm:py-3.5">
                <TaraformLogo variant="sidebar" />
              </div>
              <SidebarNav pathname={pathname} />
            </div>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <BottomNav pathname={pathname} />
    </div>
  );
}

