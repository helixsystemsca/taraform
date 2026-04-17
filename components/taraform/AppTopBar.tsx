"use client";

import { Bell, Search, Settings, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppTopBar() {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 shrink-0 border-b border-[rgba(120,90,80,0.08)]",
        "bg-[rgba(246,242,236,0.82)] backdrop-blur-xl backdrop-saturate-[1.15]",
      )}
    >
      <div className="flex h-[52px] items-center gap-3 px-2 sm:gap-4 sm:px-4">
        <div className="hidden min-w-0 flex-1 md:flex md:justify-center">
          <div className="w-full max-w-md">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search library…"
                className={cn(
                  "h-9 w-full rounded-full border border-[rgba(120,90,80,0.1)] bg-surface-panel/90 py-2 pl-10 pr-4",
                  "text-sm font-normal text-ink placeholder:text-ink-muted/80",
                  "outline-none transition-editorial",
                  "focus:border-copper/25 focus:ring-2 focus:ring-copper/15",
                )}
              />
            </label>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-0">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition-editorial hover:bg-rose-light/60 hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px] stroke-[1.5]" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition-editorial hover:bg-rose-light/60 hover:text-ink"
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px] stroke-[1.5]" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(120,90,80,0.1)] bg-surface-panel text-ink-secondary transition-editorial hover:border-copper/20 hover:text-ink"
            aria-label="Profile"
          >
            <User className="h-[18px] w-[18px] stroke-[1.5]" />
          </button>
        </div>
      </div>
    </header>
  );
}
