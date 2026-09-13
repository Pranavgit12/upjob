"use client";

import { useState, useEffect } from "react";
import { Bookmark, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { storeGet, storeSet, STORAGE_KEYS, AuthRequiredError } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SaveButton({ jobId, variant = "default" }: { jobId: string; variant?: "default" | "icon" }) {
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    storeGet<string[]>(STORAGE_KEYS.savedJobs, []).then((savedJobs) => {
      if (mounted) setSaved(savedJobs.includes(jobId));
    });
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      const savedJobs = await storeGet<string[]>(STORAGE_KEYS.savedJobs, []);
      const next = savedJobs.filter((id) => id !== jobId);
      await storeSet(STORAGE_KEYS.savedJobs, next);
      setSaved(false);
      router.refresh();
      return;
    }
    try {
      const savedJobs = await storeGet<string[]>(STORAGE_KEYS.savedJobs, []);
      await storeSet(STORAGE_KEYS.savedJobs, [...savedJobs, jobId]);
      setSaved(true);
      router.refresh();
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        aria-label={saved ? "Remove from saved jobs" : "Save job"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
          saved
            ? "border-blue-200 bg-blue-50 text-blue-600"
            : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:text-zinc-600"
        )}
      >
        {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
        saved
          ? "bg-blue-50 text-blue-700"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      )}
    >
      {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}