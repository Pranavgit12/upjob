"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const JOB_TYPES = ["Internship", "Full-time", "Part-time", "Contract"];
const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const SORTS = ["Most Relevant", "Latest", "Salary: High to Low", "Salary: Low to High"];
const EXPERIENCE = ["Fresher", "0 - 1 year", "1 - 3 years", "3 - 5 years"];

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "bg-black text-white shadow-sm"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      )}
    >
      {label}
    </button>
  );
}

export function FilterSidebar({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const types = (params.get("type") ?? "").split(",").filter(Boolean);
  const modes = (params.get("workMode") ?? "").split(",").filter(Boolean);
  const exp = params.get("experience") ?? "any";
  const sort = params.get("sort") ?? "Most Relevant";

  const update = (key: string, value: string) => {
    params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggle = (key: string, value: string) => {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    if (next.length) params.set(key, next.join(","));
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActive = types.length > 0 || modes.length > 0 || exp !== "any" || params.get("company");

  return (
    <aside className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </h3>
        {hasActive && (
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.search = "";
              router.push(pathname);
            }}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Sort by</p>
        <Select value={sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Job type</p>
        <div className="flex flex-wrap gap-1.5">
          {JOB_TYPES.map((t) => (
            <ToggleChip key={t} active={types.includes(t)} label={t} onClick={() => toggle("type", t)} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Work mode</p>
        <div className="flex flex-wrap gap-1.5">
          {WORK_MODES.map((m) => (
            <ToggleChip key={m} active={modes.includes(m)} label={m} onClick={() => toggle("workMode", m)} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Experience</p>
        <Select value={exp} onValueChange={(v) => update("experience", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any experience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any experience</SelectItem>
            {EXPERIENCE.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}