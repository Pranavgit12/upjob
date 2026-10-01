"use client";

import * as React from "react";
import { Loader2, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Carrier = {
  id: "EMAIL" | "SMS";
  label: string;
  description: string;
  destination: string;
  preferred: boolean;
};

type MfaState = {
  mfaEnabled: boolean;
  emailVerified: boolean;
  mode: "required" | "optional" | "off";
  carriers: Carrier[];
};

/**
 * Surfaces the one-time-code login state and lets the user opt in or out.
 *
 * The toggle only has an effect when the server runs `OTP_MODE=optional`; in
 * `required` mode every non-admin login is challenged regardless, so that case
 * is called out instead of silently doing nothing.
 */
export function MfaSection() {
  const { toast } = useToast();
  const [state, setState] = React.useState<MfaState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/mfa", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setState(data);
      } catch {
        // Non-fatal: the section simply stays hidden.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't update verification", { type: "error" });
        return;
      }
      setState((prev) => (prev ? { ...prev, mfaEnabled: data.mfaEnabled } : prev));
      toast(enabled ? "Two-step verification enabled" : "Two-step verification disabled", {
        type: "success",
      });
    } catch {
      toast("Something went wrong", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !state) return null;

  const enforced = state.mode === "required";
  const disabled = state.mode === "off";

  return (
    <div className="mt-5 border-t border-zinc-100 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Two-step verification
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {disabled
              ? "Disabled server-wide by OTP_MODE=off."
              : enforced
                ? "Required for every login on this account. You'll be asked for a one-time code after entering your password."
                : "When enabled, you'll be asked for a one-time code after entering your password."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state.mfaEnabled}
          aria-label="Two-step verification"
          disabled={disabled || saving || enforced}
          onClick={() => toggle(!state.mfaEnabled)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            state.mfaEnabled ? "bg-black" : "bg-zinc-200",
            (disabled || enforced) && "cursor-not-allowed opacity-50",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all",
              state.mfaEnabled ? "left-[22px]" : "left-0.5",
              state.mfaEnabled && "text-black",
            )}
          >
            {state.mfaEnabled && <ShieldCheck className="h-3 w-3" />}
          </span>
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-zinc-500">Where your code can be sent</p>
        {state.carriers.length === 0 ? (
          <p className="text-xs text-amber-700">
            No delivery method is configured. Set a phone number below and configure an email or
            SMS provider, or you won&rsquo;t be able to sign in.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {state.carriers.map((carrier) => (
              <li key={carrier.id} className="flex items-center gap-2 text-xs text-zinc-600">
                {carrier.id === "EMAIL" ? (
                  <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                )}
                <span className="font-medium">{carrier.label}</span>
                <span className="truncate text-zinc-500">{carrier.destination}</span>
                {carrier.preferred && (
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                    Preferred
                  </span>
                )}
                {carrier.id === "EMAIL" && !state.emailVerified && (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                    Unverified
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {saving && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </p>
        )}
      </div>
    </div>
  );
}
