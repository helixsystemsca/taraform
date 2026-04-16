import type { Metadata } from "next";

import { StoreHydration } from "@/components/taraform/StoreHydration";
import { brandPublicUrl } from "@/lib/branding";

import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const faviconHref = brandPublicUrl("/favicon.png");

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "Taraform",
  description:
    "Taraform is a beautiful, Apple-inspired study companion for nursing grad school — upload textbook pages, take handwritten notes, run grounded NCLEX-style quizzes, and track confidence over time.",
  icons: {
    icon: [{ url: faviconHref, type: "image/png" }],
    shortcut: faviconHref,
    apple: [{ url: faviconHref, type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-taraform text-ink antialiased">
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
