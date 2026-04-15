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
        "rounded-[1.75rem] bg-white/[0.065] ring-1 ring-rose-100/14 shadow-[0_10px_50px_rgba(0,0,0,0.34),0_0_60px_rgba(251,207,232,0.06)] backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
