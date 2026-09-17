"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Mail, Shield, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { storeGet, storeSet } from "@/lib/store";

const PREFS_KEY = "dashboardPreferences";

interface ApiMeUser {
  email?: string;
  phone?: string | null;
}

interface Prefs {
  newJobs: boolean;
  applicationUpdates: boolean;
  profileTips: boolean;
  companyNews: boolean;
  email: string;
  phone: string;
}

const DEFAULT_PREFS: Prefs = {
  newJobs: true,
  applicationUpdates: true,
  profileTips: false,
  companyNews: false,
  email: "",
  phone: "",
};

const PREFERENCE_ROWS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "newJobs", label: "New job alerts", description: "Get notified when new jobs match your skills." },
  { key: "applicationUpdates", label: "Application updates", description: "Status changes on your applications." },
  { key: "profileTips", label: "Profile tips", description: "Occasional tips to improve your profile." },
  { key: "companyNews", label: "Company news", description: "Updates from companies you follow." },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState<Prefs>(DEFAULT_PREFS);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const user: ApiMeUser | null = res.ok ? ((await res.json()).user as ApiMeUser) : null;
        const stored = (await storeGet<Partial<Prefs>>(PREFS_KEY, {})) ?? {};
        setPrefs({
          ...DEFAULT_PREFS,
          email: user?.email ?? "",
          phone: user?.phone ?? "",
          ...stored,
        });
      } catch {
        setPrefs(DEFAULT_PREFS);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await storeSet(PREFS_KEY, prefs);
      toast("Settings saved", { type: "success" });
    } catch {
      toast("Could not save settings", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Prefs) => {
    if (typeof prefs[key] !== "boolean") return;
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account and notification preferences.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <Bell className="h-4 w-4 text-blue-600" />
          Notifications
        </h2>
        <div className="mt-4 divide-y divide-zinc-100">
          {PREFERENCE_ROWS.map((p) => (
            <label key={p.key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">{p.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{p.description}</p>
              </div>
              <button
                onClick={() => toggle(p.key)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  prefs[p.key] ? "bg-black" : "bg-zinc-200"
                )}
                role="switch"
                aria-checked={prefs[p.key] as boolean}
                aria-label={p.label}
              >
                <span
                  className={cn(
                    "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all",
                    prefs[p.key] ? "left-[22px]" : "left-0.5",
                    prefs[p.key] && "text-black"
                  )}
                >
                  {prefs[p.key] && <Check className="h-3 w-3" />}
                </span>
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <Mail className="h-4 w-4 text-violet-600" />
          Contact preferences
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Notification email</label>
            <Input
              type="email"
              value={prefs.email}
              onChange={(e) => setPrefs((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Phone</label>
            <Input
              type="tel"
              value={prefs.phone}
              placeholder="Phone number"
              onChange={(e) => setPrefs((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <Shield className="h-4 w-4 text-emerald-600" />
          Security
        </h2>
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link href="/forgot-password">Change password</Link>
          </Button>
        </div>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}