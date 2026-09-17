import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LinkedinIcon, InstagramIcon, XIcon } from "@/components/brand-icons";
import { Logo } from "@/components/navbar";

const FOOTER_COLUMNS = [
  {
    title: "For Candidates",
    links: [
      { label: "Find Jobs", href: "/jobs" },
      { label: "Internships", href: "/internships" },
      { label: "Companies", href: "/companies" },
      { label: "Career Resources", href: "/resources" },
    ],
  },
  {
    title: "For Employers",
    links: [
      { label: "Post a Job", href: "/employer" },
      { label: "Employer Dashboard", href: "/employer" },
      { label: "Hiring Solutions", href: "/employer" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/about" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookie Policy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="container-upjob py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">
              Intern today. Get hired tomorrow. UpJob connects students and job seekers with startups,
              growing companies and leading enterprises.
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href="https://www.linkedin.com/company/upjobonline"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-900 hover:text-white"
                aria-label="UpJob on LinkedIn"
              >
                <LinkedinIcon className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-900 hover:text-white"
                aria-label="UpJob on Instagram"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-900 hover:text-white"
                aria-label="UpJob on X"
              >
                <XIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} UpJob. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            Company listings on UpJob are not automatically affiliated partnerships.
            <Link href="/companies" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
              Learn more
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}