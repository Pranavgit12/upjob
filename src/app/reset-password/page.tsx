"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { useToast } from "@/components/ui/toast";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast("Password must be at least 8 characters", { type: "error" });
      return;
    }
    if (password !== confirm) {
      toast("Passwords do not match", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error ?? "Could not reset your password", { type: "error" });
        return;
      }
      setDone(true);
    } catch {
      toast("Something went wrong. Try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <KeyRound className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-zinc-900">Invalid reset link</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          This link is missing or has expired. Request a new one to reset your password.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <KeyRound className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-zinc-900">Password updated</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Your password has been reset. You&apos;re now signed in.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          New password
        </label>
        <Input
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Confirm new password
        </label>
        <Input
          type="password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Reset password"
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell subtitle="Choose a new password for your account.">
      <Suspense
        fallback={
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}