"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-editorial disabled:pointer-events-none disabled:opacity-45 outline-none focus-visible:ring-2 focus-visible:ring-copper/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-[rgba(120,90,80,0.12)] bg-surface-panel/95 text-ink-secondary shadow-sm hover:border-copper/22 hover:bg-[rgba(232,214,214,0.35)] hover:text-ink",
        primary:
          "border border-transparent bg-copper text-[#fbf8f4] shadow-warm hover:bg-rose-deep hover:shadow-warm-hover",
        ghost: "border border-transparent bg-transparent text-ink-secondary hover:bg-black/[0.04] hover:text-ink",
        destructive:
          "border border-red-200/70 bg-[rgba(254,242,242,0.95)] text-red-900 hover:bg-red-100/90",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-10 w-10 px-0",
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
