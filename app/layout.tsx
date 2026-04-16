import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";

import { StoreHydration } from "@/components/taraform/StoreHydration";
import { brandPublicUrl } from "@/lib/branding";
import { resolveMetadataBaseUrl } from "@/lib/siteUrl";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const metadataBase = resolveMetadataBaseUrl();

const faviconHref = brandPublicUrl("/favicon.png");

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
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
    <html lang="en" className={playfair.variable}>
      <body className="min-h-dvh bg-taraform text-ink antialiased">
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
