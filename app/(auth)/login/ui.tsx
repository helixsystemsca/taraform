"use client";

import * as React from "react";
import Link from "next/link";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic";

export function LoginClient({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = React.useState<Mode>("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ kind: "idle" | "ok" | "err"; message?: string }>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch(mode === "password" ? "/api/auth/login" : "/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextPath }),
      });
      const json = (await res.json()) as { error?: string; ok?: boolean; message?: string; redirectTo?: string };
      if (!res.ok) {
        setStatus({ kind: "err", message: json.error || "Login failed." });
        return;
      }
      if (mode === "magic") {
        setStatus({ kind: "ok", message: json.message || "Check your email for a sign-in link." });
        return;
      }
      // Password mode: cookie session is set by the API route; hard redirect to avoid stale middleware state.
      window.location.href = json.redirectTo || nextPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setStatus({ kind: "err", message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">Welcome back</div>
        <p className="mt-2 text-sm text-ink/60">Sign in to continue your study sanctuary.</p>
      </div>

      <GlassCard className="p-6">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={cn(
              "flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-editorial",
              mode === "password"
                ? "border-copper/25 bg-rose-light/55 text-ink"
                : "border-[rgba(120,90,80,0.12)] bg-surface-page/70 text-ink-secondary hover:bg-rose-light/35 hover:text-ink",
            )}
            aria-pressed={mode === "password"}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={cn(
              "flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-editorial",
              mode === "magic"
                ? "border-copper/25 bg-rose-light/55 text-ink"
                : "border-[rgba(120,90,80,0.12)] bg-surface-page/70 text-ink-secondary hover:bg-rose-light/35 hover:text-ink",
            )}
            aria-pressed={mode === "magic"}
          >
            Magic link
          </button>
        </div>

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

          {mode === "password" ? (
            <label className="block">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Password</div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[rgba(120,90,80,0.12)] bg-surface-page/90 px-3 py-2 text-sm text-ink shadow-sm outline-none transition-editorial focus:border-copper/25 focus:ring-2 focus:ring-copper/15"
                autoComplete="current-password"
              />
            </label>
          ) : null}

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
            {mode === "password" ? (busy ? "Signing in…" : "Sign in") : busy ? "Sending link…" : "Send magic link"}
          </Button>

          <div className="pt-2 text-center text-sm text-ink/60">
            New here?{" "}
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-medium text-ink hover:underline">
              Create an account
            </Link>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

