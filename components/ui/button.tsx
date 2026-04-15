"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[transform,background-color,box-shadow,opacity] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-rose-300/45 focus-visible:ring-offset-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-white/[0.11] text-white shadow-[inset_0_1px_0_0_rgba(255,245,250,0.35)] ring-1 ring-rose-100/15 hover:bg-white/[0.14] hover:ring-rose-100/20",
        primary:
          "bg-gradient-to-b from-rose-300/35 via-pink-200/22 to-fuchsia-200/12 text-white ring-1 ring-rose-200/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_8px_40px_rgba(251,113,133,0.12)] hover:from-rose-300/45 hover:via-pink-200/28 hover:to-fuchsia-200/16",
        ghost: "bg-transparent text-white/88 hover:bg-rose-50/[0.06]",
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

