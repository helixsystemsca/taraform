import type { Metadata } from "next";

import { StoreHydration } from "@/components/taraform/StoreHydration";

import "./globals.css";

export const metadata: Metadata = {
  title: "Taraform",
  description:
    "Taraform is a beautiful, Apple-inspired study companion for nursing grad school — upload textbook pages, take handwritten notes, run grounded NCLEX-style quizzes, and track confidence over time.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/favicon.png", type: "image/png" }],
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
