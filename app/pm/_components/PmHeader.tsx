"use client";

import Link from "next/link";

export function PmHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-label="Menu (placeholder)"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-full border border-slate-700 bg-slate-900 text-slate-200"
        >
          <span className="h-0.5 w-4 rounded bg-current" />
          <span className="h-0.5 w-4 rounded bg-current" />
          <span className="h-0.5 w-4 rounded bg-current" />
        </button>
        <span className="text-sm font-semibold tracking-wide text-slate-100">PM Trainer</span>
        <Link
          href="/pm"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-900"
          aria-label="PM home"
        >
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600" />
        </Link>
      </div>
    </header>
  );
}
