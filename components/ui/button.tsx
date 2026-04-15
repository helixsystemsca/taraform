"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[transform,background-color,box-shadow,opacity] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-copper/35 focus-visible:ring-offset-2 focus-visible:ring-offset-blush-cream active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-copper/25 bg-blush-sheet/90 text-ink shadow-sm shadow-stone-900/5 hover:bg-white hover:border-copper/35",
        primary:
          "border border-blush-dust/60 bg-gradient-to-b from-blush-dust to-[#dcc4bb] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] hover:from-[#ebd5cc] hover:to-[#d2b6ac]",
        ghost: "border border-transparent bg-transparent text-ink/80 hover:bg-blush-medium/60",
        destructive:
          "border border-red-200/80 bg-red-50 text-red-900 hover:bg-red-100",
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
