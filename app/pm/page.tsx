import Link from "next/link";

/** PM overview — stub until PM features ship. */
export default function PmOverviewPage() {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">PM mode</p>
      <h1 className="text-2xl font-semibold text-slate-50">Overview</h1>
      <p className="text-sm leading-relaxed text-slate-400">
        This area uses the PM shell (dark, neutral). Study features and shared data live in the same app —
        switch back anytime.
      </p>
      <div className="flex flex-col gap-2 pt-2">
        <Link
          href="/pm/dashboard"
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-center text-sm font-medium text-slate-100"
        >
          Open dashboard (stub)
        </Link>
        <Link
          href="/pm/learn"
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-center text-sm font-medium text-slate-100"
        >
          Open learn (stub)
        </Link>
        <Link href="/workspace" className="pt-2 text-center text-sm text-emerald-500/90 underline-offset-4 hover:underline">
          Back to study workspace
        </Link>
      </div>
    </div>
  );
}
