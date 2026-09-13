import type { LucideIcon } from "lucide-react";

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-black group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{title}</p>
    </div>
  );
}