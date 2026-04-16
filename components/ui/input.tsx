"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[rgba(120,90,80,0.12)] bg-surface-panel/95 px-4 py-2 text-sm font-normal text-ink placeholder:text-ink-muted/70 shadow-sm outline-none transition-editorial",
          "focus-visible:border-copper/25 focus-visible:ring-2 focus-visible:ring-copper/12 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
