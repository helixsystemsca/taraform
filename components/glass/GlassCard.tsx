"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[rgba(120,90,80,0.08)] bg-surface-panel text-ink shadow-warm transition-editorial",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
