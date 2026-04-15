"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/[0.09] ring-1 ring-rose-100/12">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-rose-300/70 via-pink-300/55 to-fuchsia-200/45" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full bg-white/22 ring-1 ring-rose-100/25 shadow-[inset_0_1px_0_rgba(255,250,252,0.45),0_8px_28px_rgba(251,113,133,0.2)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-rose-300/50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

