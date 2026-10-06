"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { OtpInput } from "@/components/otp-input";
import { useToast } from "@/components/ui/toast";
import { cn, sanitizeNextPath } from "@/lib/utils";

type Carrier = {
  id: "EMAIL" | "SMS";
  label: string;
  description: string;
  destination: string;
  preferred: boolean;
};

type Step = "credentials" | "carrier" | "code";

type ChallengeState = {
  challengeId: string;
  maskedDestination: string;
  expiresAt: string;
  resendAfter: string;
  carriers: Carrier[];
  next: string | null;
};

const OTP_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = React.useState<Step>("credentials");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [challenge, setChallenge] = React.useState<ChallengeState | null>(null);
  const [selectedCarrier, setSelectedCarrier] = React.useState<Carrier | null>(null);
  const [code, setCode] = React.useState("");
  const [codeInvalid, setCodeInvalid] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  // Wall clock, written only from an interval. Reading Date.now() during render
  // is impure and makes the tree unstable between renders.
  const [now, setNow] = React.useState(0);

  // `window` is unavailable during prerender, so the `?next=` value is read in
  // an effect and cached in a ref rather than derived during render.
  const nextParamRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    nextParamRef.current = sanitizeNextPath(
      new URLSearchParams(window.location.search).get("next"),
    );
  }, []);

  React.useEffect(() => {
    if (step !== "code" || !challenge) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, challenge]);

  // Derived from `now`, never from a fresh Date.now() in render.
  const expiresAtMs = challenge ? new Date(challenge.expiresAt).getTime() : 0;
  const resendAtMs = challenge ? new Date(challenge.resendAfter).getTime() : 0;
  const expired = Boolean(challenge) && now > 0 && expiresAtMs <= now;
  const minutesLeft = Math.max(0, Math.ceil((expiresAtMs - now) / 60000));
  const cooldownLeft =
    now > 0 && resendAtMs > now ? Math.ceil((resendAtMs - now) / 1000) : 0;

  const enterChallenge = React.useCallback((next: ChallengeState) => {
    setChallenge(next);
    setCode("");
    setCodeInvalid(false);
    const preferred = next.carriers.find((c) => c.preferred) ?? next.carriers[0] ?? null;
    setSelectedCarrier(preferred);
    // A single available carrier skips the picker entirely.
    setStep(next.carriers.length > 1 ? "carrier" : "code");
  }, []);

  const requestCode = React.useCallback(
    async (carrierId?: "EMAIL" | "SMS") => {
      setResending(true);
      try {
        const res = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carrierId ? { carrier: carrierId } : {}),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error || "Couldn't send a code", { type: "error" });
          return;
        }
        const carriers: Carrier[] = data.carriers ?? [];
        setChallenge({
          challengeId: data.challengeId,
          maskedDestination: data.maskedDestination,
          expiresAt: data.expiresAt,
          resendAfter: data.resendAfter,
          carriers,
          next: data.next ?? null,
        });
        setSelectedCarrier(carriers.find((c) => c.id === data.carrier) ?? null);
        setStep("code");
        setCode("");
        setCodeInvalid(false);
        toast(data.throttled ? "Please wait before requesting another code." : "Code sent", {
          type: data.throttled ? "error" : "success",
        });
      } catch {
        toast("Something went wrong", { type: "error", description: "Please try again." });
      } finally {
        setResending(false);
      }
    },
    [toast],
  );

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/auth/google";
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      const msg =
        err === "google_denied" || err === "google_failed"
          ? "Google sign-in was unsuccessful. Try again."
          : err === "google_no_email"
            ? "Your Google account doesn't have an email associated with it."
            : err === "google_not_configured"
              ? "Google sign-in isn't configured yet."
              : err === "otp_unavailable"
                ? "We couldn't send you a verification code, so Google sign-in was stopped. Check your account, or sign in with your password."
                : "Google sign-in failed.";
      toast(msg, { type: "error" });
      return;
    }

    // Google sign-in returns here with a live OTP challenge cookie but no
    // client state — the code was already dispatched server-side.
    if (params.get("verify") === "required") {
      void (async () => {
        try {
          const res = await fetch("/api/auth/otp/carriers", { cache: "no-store" });
          if (!res.ok) {
            toast("Verification expired. Please sign in again.", { type: "error" });
            return;
          }
          const data = await res.json();
          enterChallenge({
            challengeId: "",
            maskedDestination: data.activeMaskedDestination,
            expiresAt: data.expiresAt,
            resendAfter: new Date().toISOString(),
            carriers: data.carriers,
            next: nextParamRef.current,
          });
          toast("Verification code sent", { type: "success" });
        } catch {
          toast("Something went wrong", { type: "error" });
        }
      })();
    }
  }, [toast, enterChallenge]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast("Please fill in all fields", { type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextParamRef.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Unable to log in", { type: "error" });
        return;
      }

      if (data.mfaRequired) {
        // The code was already dispatched by the server when it minted the
        // challenge — do not request a second one.
        enterChallenge({
          challengeId: data.challengeId,
          maskedDestination: data.maskedDestination,
          expiresAt: data.expiresAt,
          resendAfter: data.resendAfter,
          carriers: data.carriers,
          next: data.next ?? nextParamRef.current,
        });
        toast("Enter the code we just sent to finish signing in.", { type: "info" });
        return;
      }

      toast("Welcome back!", { type: "success", description: "You're now signed in." });
      router.push(
        data.user?.role === "admin"
          ? "/admin"
          : sanitizeNextPath(nextParamRef.current) || "/dashboard",
      );
      router.refresh();
    } catch {
      toast("Something went wrong", { type: "error", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = React.useCallback(
    async (value: string) => {
      if (loading || !challenge) return;
      setLoading(true);
      setCodeInvalid(false);
      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: value,
            challengeId: challenge.challengeId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCodeInvalid(true);
          setCode("");
          toast(data.error || "That code doesn't look right", { type: "error" });
          return;
        }
        toast("You're verified", { type: "success" });
        router.push(
          sanitizeNextPath(data.next) ||
            (data.user?.role === "admin" ? "/admin" : "/dashboard"),
        );
        router.refresh();
      } catch {
        setCodeInvalid(true);
        toast("Something went wrong", { type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [challenge, loading, router, toast],
  );

  const backToCredentials = () => {
    setStep("credentials");
    setChallenge(null);
    setCode("");
    setPassword("");
    setCodeInvalid(false);
  };

  /* ---------------------------------------------------------------- carrier */

  if (step === "carrier" && challenge) {
    return (
      <AuthShell subtitle="Choose how you'd like to receive your verification code.">
        <div className="space-y-3">
          {challenge.carriers.map((carrier) => (
            <button
              key={carrier.id}
              type="button"
              disabled={resending}
              onClick={() => requestCode(carrier.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-50",
                carrier.preferred && "border-zinc-400",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                {carrier.id === "EMAIL" ? <Mail className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900">
                  {carrier.label}
                  {carrier.preferred && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                      Preferred
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-zinc-500">{carrier.destination}</span>
              </span>
              {resending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
              ) : (
                <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-zinc-400" />
              )}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={backToCredentials}
            disabled={resending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </AuthShell>
    );
  }

  /* ------------------------------------------------------------------- code */

  if (step === "code" && challenge) {
    return (
      <AuthShell subtitle="Enter the code we just sent to finish signing in.">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-zinc-900">
                Code sent to {challenge.maskedDestination}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {expired
                  ? "This code has expired."
                  : `Expires in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`}
              </p>
            </div>
          </div>

          <OtpInput
            length={OTP_LENGTH}
            value={code}
            onChange={(v) => {
              setCode(v);
              if (codeInvalid) setCodeInvalid(false);
            }}
            onComplete={handleVerify}
            disabled={loading || expired}
            invalid={codeInvalid || expired}
            autoFocus
          />

          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={loading || code.length !== OTP_LENGTH || expired}
            onClick={() => handleVerify(code)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Verify and continue
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep("carrier")}
              className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change method
            </button>
            <button
              type="button"
              disabled={cooldownLeft > 0 || resending}
              onClick={() => requestCode(selectedCarrier?.id)}
              className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
            >
              {resending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : "Resend code"}
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={backToCredentials}
            disabled={loading}
          >
            Use a different account
          </Button>
        </div>
      </AuthShell>
    );
  }

  /* ------------------------------------------------------------- credentials */

  return (
    <AuthShell subtitle="Log in to track your applications and find more opportunities.">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
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
        onClick={handleGoogleLogin}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A6.42 6.42 0 0 0 12 5.38z"/>
          </svg>
        )}
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-zinc-500">
        New to UpJob?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
