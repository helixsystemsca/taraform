"use client";

import Image from "next/image";

import { brandPublicUrl } from "@/lib/branding";
import { cn } from "@/lib/utils";

const SRC = brandPublicUrl("/taraform.png");

export type TaraformLogoVariant = "sidebar" | "header" | "compact" | "dialog";

/**
 * Renders the Taraform wordmark with outer transparent padding visually cropped:
 * the PNG canvas is zoomed slightly inside an overflow clip so the mark reads tighter.
 */
export function TaraformLogo({ variant, className }: { variant: TaraformLogoVariant; className?: string }) {
  const box = {
    /** Desktop sidebar strip — full width, modest height */
    sidebar: "h-12 w-full sm:h-14",
    /** Study home hero card */
    header: "mb-1 h-14 w-48 sm:mb-0 sm:h-16 sm:w-64 md:h-[4.5rem] md:w-80",
    /** Notes focus top bar */
    compact: "h-9 w-[10.5rem] sm:h-10 sm:w-48",
    /** Mobile nav dialog header (right side) */
    dialog: "h-9 w-40 sm:h-10 sm:w-52",
  }[variant];

  const zoom = {
    sidebar: "scale-[1.48]",
    header: "scale-[1.38]",
    compact: "scale-[1.42]",
    dialog: "scale-[1.4]",
  }[variant];

  const sizes = {
    sidebar: "220px",
    header: "(max-width: 640px) 192px, (max-width: 768px) 256px, 320px",
    compact: "(max-width: 640px) 192px, 224px",
    dialog: "208px",
  }[variant];

  return (
    <div className={cn("relative shrink-0 overflow-hidden", box, className)}>
      <Image
        src={SRC}
        alt="Taraform"
        fill
        sizes={sizes}
        className={cn("object-contain object-center", zoom)}
        priority
      />
    </div>
  );
}
