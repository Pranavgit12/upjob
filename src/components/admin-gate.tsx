"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminLoginProps {
  user: { id: string; email: string; name: string; role: string } | null;
}

export default function AdminGate({ user }: AdminLoginProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  if (user?.role === "admin") {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }
      if (data.user?.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-zinc-900">Access restricted</h1>
          <p className="mt-2 text-sm text-zinc-500">
            You are signed in as <span className="font-medium text-zinc-700">{user.email}</span>, which does not have
            admin permissions. Sign in with an admin account to continue.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.refresh();
            }}
          >
            Switch account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-zinc-900">Admin sign in</h1>
          <p className="mt-1.5 text-center text-sm text-zinc-500">
            Enter your credentials to access the UpJob admin panel.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
              <Input
                type="email"
                autoComplete="username"
                placeholder="admin@upjob.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className={cn("rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600")}>{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">
          Restricted area — admin credentials only.
        </p>
      </div>
    </div>
  );
}