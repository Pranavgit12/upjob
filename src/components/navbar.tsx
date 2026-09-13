"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, TrendingUp, Building2, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/internships", label: "Internships" },
  { href: "/companies", label: "Companies" },
  { href: "/resources", label: "Career Resources" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
        <TrendingUp className="h-4 w-4" />
      </span>
      <span className="text-lg font-bold tracking-tight text-zinc-900">
        Up<span className="text-blue-600">Job</span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-zinc-200/70 bg-white/90 backdrop-blur-md transition-shadow",
        scrolled && "shadow-sm"
      )}
    >
      <nav className="container-upjob flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900",
                  pathname === link.href && "text-zinc-900 bg-zinc-50",
                  i > 2 && "xl:flex"
                )}
              >
                {i === 2 && <Building2 className="mr-1.5 hidden h-3.5 w-3.5 xl:block" />}
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Link>
          </Button>
        </div>

        <button
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 pb-4 pt-2 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-zinc-100" />
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Login
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}