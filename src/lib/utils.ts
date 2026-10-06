import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates a post-login redirect target.
 *
 * `startsWith("/")` alone is not enough: `//evil.com` and `/\evil.com` are
 * both protocol-relative URLs that a browser resolves to another origin, so a
 * `?next=//evil.com` would bounce a freshly authenticated user to a site of the
 * attacker's choosing. Anything that is not a single-slash same-origin path is
 * rejected and the caller falls back to its default destination.
 *
 * Safe to import from client components — no server-only dependencies.
 */
export function sanitizeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (path.length === 0 || path.length > 512) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//") || path.startsWith("/\\")) return null;
  if (path.includes("\\") || path.includes("\n") || path.includes("\r")) return null;
  return path;
}

export function formatSalary(min: number, max: number | null, isStipend = false) {
  const prefix = isStipend ? "₹" : "₹";
  const fmt = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
    return `${n / 1000}K`;
  };
  const unit = isStipend ? "/month" : "";
  if (max && max > min) {
    return `${prefix}${fmt(min)} – ${prefix}${fmt(max)}${isStipend ? unit : ""}`;
  }
  return `${prefix}${fmt(min)}${isStipend ? unit : ""}`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getCompanyLogoHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
}
