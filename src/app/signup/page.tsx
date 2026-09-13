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
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "candidate" });

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