"use client";

import * as React from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast("Enter your email", { type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error ?? "Could not send the reset link", { type: "error" });
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      toast("Something went wrong. Try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="We'll send you a link to reset your password.">
      {sent ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <MailCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-zinc-900">Check your inbox</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            We&apos;ve sent a password reset link to <span className="font-medium text-zinc-800">{email}</span>.
            The link expires in 1 hour.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Back to login
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}