"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type GlassFABProps = {
  label: string;
  disabled?: boolean;
  className?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

export function GlassFAB({ label, disabled, className, inputProps }: GlassFABProps) {
  return (
    <label
      className={cn(
        "group fixed bottom-7 right-5 z-40 cursor-pointer md:bottom-9 md:right-8",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input type="file" className="sr-only" disabled={disabled} {...inputProps} />
      <span className="sr-only">{label}</span>
      <span
        className={cn(
          "glass flex h-[58px] w-[58px] items-center justify-center rounded-full ring-1 ring-rose-200/25",
          "shadow-[0_22px_90px_rgba(0,0,0,0.5),0_0_48px_rgba(251,113,133,0.15)] transition duration-300 ease-out",
          "group-hover:scale-105 group-hover:shadow-[0_28px_100px_rgba(244,114,182,0.22),0_0_64px_rgba(253,186,211,0.2)]",
          "group-active:scale-[0.97]",
        )}
      >
        <Plus className="h-7 w-7 text-rose-50 transition group-hover:rotate-90 duration-500 ease-out" />
      </span>
    </label>
  );
}
