import Link from "next/link";
import { SearchX, Inbox, FolderOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
        <Icon className="h-7 w-7 text-zinc-400" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-zinc-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-zinc-500">{description}</p>}
      {(actionLabel || actionHref || onAction) && (
        <div className="mt-6">
          {actionHref ? (
            <Button asChild variant="accent">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}

export function useEmptyStateIcons() {
  return { SearchX, Inbox, FolderOpen };
}