"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "candidate" });

  const handleGoogleSignup = () => {
    setGoogleLoading(true);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/auth/google";
  };

  React.useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) {
      const msg =
        err === "google_denied" || err === "google_failed"
          ? "Google sign-in was unsuccessful. Try again."
          : err === "google_no_email"
            ? "Your Google account doesn't have an email associated with it."
            : err === "google_not_configured"
              ? "Google sign-in isn't configured yet."
              : "Google sign-in failed.";
      toast(msg, { type: "error" });
    }
  }, [toast]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast("Please fill in all fields", { type: "error" });
      return;
    }
    if (form.password.length < 8) {
      toast("Password too short", { type: "error", description: "Use at least 8 characters." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Unable to create account", { type: "error" });
        return;
      }
      toast("Account created!", { type: "success", description: `Welcome to UpJob, ${form.name.split(" ")[0]}.` });
      router.push(form.role === "employer" ? "/employer" : "/dashboard");
    } catch {
      toast("Something went wrong", { type: "error", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Create your free account to start applying in minutes.">
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: "candidate", label: "I'm a Candidate" },
            { key: "employer", label: "I'm an Employer" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setForm({ ...form, role: opt.key })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                form.role === opt.key
                  ? "border-black bg-black text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Full name</label>
          <Input
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Password</label>
          <Input
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs text-zinc-400">or continue with</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <Button
        variant="outline"
        type="button"
        className="w-full"
        size="lg"
        disabled={googleLoading}
        onClick={handleGoogleSignup}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
        )}
        Sign up with Google
      </Button>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </Link>
      </p>

      <div className="mt-8 rounded-xl bg-zinc-50 p-4 text-xs leading-5 text-zinc-500 ring-1 ring-zinc-100">
        By creating an account you agree to UpJob&apos;s{" "}
        <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and{" "}
        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
      </div>
    </AuthShell>
  );
}