"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  NotebookPen,
  PanelLeft,
  Sparkles,
  Library,
  LayoutPanelLeft,
  Plus,
} from "lucide-react";

import { AppTopBar } from "@/components/taraform/AppTopBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaraformLogo } from "@/components/taraform/TaraformLogo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

/** Primary nav: Workspace is the main study surface. Legacy /upload, /study, /plan remain reachable by URL only. */
const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/workspace", label: "Study", icon: LayoutPanelLeft },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/review", label: "Review", icon: Sparkles },
  { href: "/concepts", label: "Concepts", icon: Library },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/home";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-normal transition-editorial",
              "text-ink-secondary hover:bg-black/[0.03] hover:text-ink",
              active && "bg-rose-light text-[#7a4e4e] shadow-none",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0 stroke-[1.5]", active ? "text-rose-deep" : "text-ink-muted")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const shortNav = [NAV[0]!, NAV[1]!, NAV[2]!, NAV[3]!];
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(120,90,80,0.08)] lg:hidden",
        "bg-[rgba(251,248,244,0.92)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto grid max-w-[680px] grid-cols-4 px-2 py-2">
        {shortNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition-editorial",
                active ? "bg-rose-light/90 text-[#7a4e4e]" : "text-ink-muted hover:bg-black/[0.04]",
              )}
            >
              <Icon className="h-5 w-5 stroke-[1.5]" />
              <span className="line-clamp-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FocusTopBar({ pathname }: { pathname: string }) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b border-[rgba(120,90,80,0.08)]",
        "bg-[rgba(251,248,244,0.92)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(120,90,80,0.1)] bg-surface-panel/90 text-ink-secondary transition-editorial hover:bg-rose-light/50"
                aria-label="Open navigation"
              >
                <PanelLeft className="h-5 w-5 stroke-[1.5]" />
              </button>
            </DialogTrigger>
            <DialogContent className="p-0">
              <DialogHeader className="border-b border-[rgba(120,90,80,0.08)] bg-surface-panel px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-base font-medium text-ink">Navigate</DialogTitle>
                  <TaraformLogo variant="dialog" />
                </div>
              </DialogHeader>
              <SidebarNav pathname={pathname} />
            </DialogContent>
          </Dialog>
          <TaraformLogo variant="compact" />
        </div>
        <div className="text-xs font-medium text-ink-muted">Focus mode</div>
      </div>
    </div>
  );
}

export function ResponsiveShell({
  children,
  settingsHref = "/settings",
}: {
  children: React.ReactNode;
  /** Primary settings destination (student vs supporter). */
  settingsHref?: string;
}) {
  const pathname = usePathname() || "/";
  const isNotes = isActive(pathname, "/notes");
  const isWorkspace = isActive(pathname, "/workspace");

  if (isNotes) {
    return (
      <div className="min-h-dvh bg-taraform">
        <FocusTopBar pathname={pathname} />
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-taraform pb-24 lg:pb-0">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[rgba(120,90,80,0.08)] bg-surface-sidebar lg:flex">
        <div className="border-b border-[rgba(120,90,80,0.08)] px-4 py-3">
          <TaraformLogo variant="sidebar" />
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">Study sanctuary</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav pathname={pathname} />
        </div>
        <div className="border-t border-[rgba(120,90,80,0.08)] p-4">
          <Link
            href="/workspace"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-[#fbf8f4]",
              "bg-copper shadow-warm transition-editorial hover:bg-rose-deep hover:shadow-warm-hover active:scale-[0.99]",
            )}
          >
            <Plus className="h-4 w-4 stroke-[2]" />
            New unit
          </Link>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopBar settingsHref={settingsHref} />
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            isWorkspace ? "px-0 py-0 sm:px-2 sm:py-2 lg:px-4 lg:py-4" : "px-4 py-6 sm:px-6 lg:px-10 lg:py-8",
          )}
        >
          {children}
        </div>
      </div>

      <BottomNav pathname={pathname} />
    </div>
  );
}
