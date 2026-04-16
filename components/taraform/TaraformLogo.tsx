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
    /** Sidebar: short clip so the rail header stays compact; scale does the “bigger” work. */
    sidebar: "h-9 w-full sm:h-10",
    /** Home hero: tighter block so greeting isn’t pushed down; image is zoomed inside clip. */
    header: "mb-0.5 h-10 w-52 sm:mb-0 sm:h-11 sm:w-64 md:h-12 md:w-72",
    /** Notes focus top bar */
    compact: "h-8 w-[11rem] sm:h-9 sm:w-52",
    /** Mobile nav dialog header (right side) */
    dialog: "h-8 w-44 sm:h-9 sm:w-52",
  }[variant];

  const zoom = {
    sidebar: "scale-[1.62]",
    header: "scale-[1.52]",
    compact: "scale-[1.5]",
    dialog: "scale-[1.48]",
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
