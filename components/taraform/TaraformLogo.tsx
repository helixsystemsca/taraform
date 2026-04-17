"use client";

import Image from "next/image";

import { brandPublicUrl } from "@/lib/branding";
import { cn } from "@/lib/utils";

const SRC = brandPublicUrl("/taraform.png");

export type TaraformLogoVariant = "sidebar" | "compact" | "dialog" | "auth";

/**
 * Renders the Taraform wordmark with outer transparent padding visually cropped:
 * the PNG canvas is zoomed slightly inside an overflow clip so the mark reads tighter.
 */
export function TaraformLogo({ variant, className }: { variant: TaraformLogoVariant; className?: string }) {
  const box = {
    /** Sidebar: ~2× prior rail height for a prominent wordmark. */
    sidebar: "h-18 w-full sm:h-20",
    /** Notes focus top bar */
    compact: "h-8 w-[11rem] sm:h-9 sm:w-52",
    /** Mobile nav dialog header (right side) */
    dialog: "h-8 w-44 sm:h-9 sm:w-52",
    /** Login / signup hero */
    auth: "mx-auto h-14 w-64 sm:h-16 sm:w-72",
  }[variant];

  const zoom = {
    sidebar: "scale-[1.38]",
    compact: "scale-[1.5]",
    dialog: "scale-[1.48]",
    auth: "scale-[1.36]",
  }[variant];

  const sizes = {
    sidebar: "248px",
    compact: "(max-width: 640px) 192px, 224px",
    dialog: "208px",
    auth: "(max-width: 640px) 256px, 288px",
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
