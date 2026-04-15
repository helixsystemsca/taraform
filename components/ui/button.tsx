"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[transform,background-color,box-shadow,opacity] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 focus-visible:ring-offset-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)] ring-1 ring-white/15 hover:bg-white/14",
        primary:
          "bg-gradient-to-b from-emerald-400/30 to-sky-400/15 text-white ring-1 ring-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] hover:from-emerald-400/40 hover:to-sky-400/18",
        ghost: "bg-transparent text-white/85 hover:bg-white/8",
        destructive:
          "bg-red-500/15 text-red-50 ring-1 ring-red-300/25 hover:bg-red-500/20",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

