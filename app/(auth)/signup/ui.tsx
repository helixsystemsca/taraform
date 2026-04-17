"use client";

import * as React from "react";
import Link from "next/link";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { formatAuthError } from "@/lib/auth/formatAuthError";
import { cn } from "@/lib/utils";

export function SignupClient({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ kind: "idle" | "ok" | "err"; message?: string }>({ kind: "idle" });
  /** Blocks overlapping submits (double-clicks / Enter + click in the same moment). */
  const submitLock = React.useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextPath }),
      });
      // Never assume the response is JSON (Next.js/Supabase can return empty/HTML on unexpected failures).
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      const json =
        contentType.includes("application/json") && raw
          ? (JSON.parse(raw) as { error?: string; message?: string; redirectTo?: string; needsEmailConfirm?: boolean })
          : ({} as { error?: string; message?: string; redirectTo?: string; needsEmailConfirm?: boolean });

      if (!res.ok) {
        setStatus({ kind: "err", message: formatAuthError(json.error || raw || undefined) });
        return;
      }
      if (json.needsEmailConfirm) {
        setStatus({ kind: "ok", message: json.message || "Check your email to confirm your account." });
        return;
      }
      window.location.href = json.redirectTo || nextPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed.";
      setStatus({ kind: "err", message: formatAuthError(msg) });
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">Create your account</div>
        <p className="mt-2 text-sm text-ink/60">This app is private.</p>
      </div>

      <GlassCard className="p-6">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Email</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[rgba(120,90,80,0.12)] bg-surface-page/90 px-3 py-2 text-sm text-ink shadow-sm outline-none transition-editorial focus:border-copper/25 focus:ring-2 focus:ring-copper/15"
              placeholder="tara@example.com"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Password</div>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[rgba(120,90,80,0.12)] bg-surface-page/90 px-3 py-2 text-sm text-ink shadow-sm outline-none transition-editorial focus:border-copper/25 focus:ring-2 focus:ring-copper/15"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-ink/45">Use at least 8 characters.</p>
          </label>

          {status.kind !== "idle" ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2 text-sm",
                status.kind === "ok"
                  ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-800"
                  : "border-red-200/70 bg-red-50/70 text-red-800",
              )}
            >
              {status.message}
            </div>
          ) : null}

          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Creating account…" : "Sign up"}
          </Button>

          <div className="pt-2 text-center text-sm text-ink/60">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-ink hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

