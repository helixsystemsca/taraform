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
          "glass flex h-[58px] w-[58px] items-center justify-center rounded-full border border-white/70",
          "shadow-[0_18px_50px_rgba(61,43,31,0.12)] transition duration-300 ease-out",
          "group-hover:scale-105 group-hover:shadow-[0_22px_56px_rgba(184,122,107,0.22)]",
          "group-active:scale-[0.97]",
        )}
      >
        <Plus className="h-7 w-7 text-copper transition group-hover:rotate-90 duration-500 ease-out" />
      </span>
    </label>
  );
}
