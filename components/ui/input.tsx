"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl bg-white/[0.07] px-4 py-2 text-sm text-white placeholder:text-rose-100/35 ring-1 ring-rose-100/12 shadow-[inset_0_1px_0_0_rgba(255,245,250,0.2)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-rose-300/45 disabled:cursor-not-allowed disabled:opacity-50",
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

