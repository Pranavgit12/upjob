"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Bookmark,
  User,
  Settings,
  Building2,
  FileUp,
  Video,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/navbar";

const CANDIDATE_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/ai", label: "AI Interview", icon: Video },
  { href: "/dashboard/recommended", label: "Recommended Jobs", icon: Sparkles },
  { href: "/dashboard/applications", label: "Applications", icon: FileText },
  { href: "/dashboard/saved", label: "Saved Jobs", icon: Bookmark },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/resume", label: "CV Upload", icon: FileUp },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const EMPLOYER_LINKS = [
  { href: "/employer", label: "Overview", icon: LayoutDashboard },
  { href: "/employer/jobs", label: "Manage Jobs", icon: FileText },
  { href: "/employer/applications", label: "Applications", icon: FileText },
  { href: "/employer/company", label: "Company Profile", icon: Building2 },
];

export function DashboardSidebar({
  mode = "candidate",
  userName,
  userEmail,
}: {
  mode?: "candidate" | "employer";
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const links = mode === "candidate" ? CANDIDATE_LINKS : EMPLOYER_LINKS;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 pb-6 pt-2 lg:hidden">
        <Logo />
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
          {userName?.charAt(0) ?? "A"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{userName ?? "Candidate"}</p>
          <p className="truncate text-xs text-zinc-500">{userEmail ?? "candidate@upjob.app"}</p>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const active =
            pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-1 border-t border-zinc-200 pt-4">
        <a
          href="/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </a>
      </div>
    </div>
  );
}