"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordSettings({ className }: { className?: string }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ kind: "idle" | "ok" | "err"; message?: string }>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    if (password.length < 8) {
      setStatus({ kind: "err", message: "Use at least 8 characters." });
      return;
    }
    if (password.length > 72) {
      setStatus({ kind: "err", message: "Password must be at most 72 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ kind: "err", message: "Passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus({ kind: "err", message: json.error || "Could not update password." });
        return;
      }
      setPassword("");
      setConfirm("");
      setStatus({ kind: "ok", message: "Password saved. You can sign in with your email and this password." });
    } catch {
      setStatus({ kind: "err", message: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="text-sm font-semibold text-ink">Password</div>
        <p className="mt-1 text-sm text-ink/55">
          After signing in with a magic link, you can add a password here to sign in with email and password as well.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <div>
          <label htmlFor="settings-new-password" className="text-xs font-medium text-ink-muted">
            New password
          </label>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="settings-confirm-password" className="text-xs font-medium text-ink-muted">
            Confirm password
          </label>
          <Input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1"
            placeholder="Repeat password"
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </Button>
      </form>
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
    </div>
  );
}
