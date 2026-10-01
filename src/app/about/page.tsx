import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Shield, Globe, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { getFeaturedCompanies } from "@/lib/db-data";

// Rendered per-request; the company logos read from Postgres. Prerendering
// forced `next build` to reach a live database, which breaks container builds.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About UpJob",
  description:
    "UpJob connects students, freshers and job seekers with internships and jobs from startups, growing companies and leading enterprises.",
};

const VALUES = [
  {
    icon: TrendingUp,
    title: "Mobility first",
    description: "Careers should not be limited by geography or background. We break down barriers to opportunity.",
  },
  {
    icon: Shield,
    title: "Trust & safety",
    description: "Transparent listing labels, verified partnerships and real job moderation keep candidates safe.",
  },
  {
    icon: Users,
    title: "Candidate centered",
    description: "Everything is free for seekers. Your data belongs to you, and applications go directly to employers.",
  },
  {
    icon: Globe,
    title: "Built for India & beyond",
    description: "From metro startups to global enterprises, we connect great talent with great companies.",
  },
];

export default async function AboutPage() {
  const featuredCompanies = await getFeaturedCompanies();
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <section className="container-upjob py-16 text-center">
        <Badge variant="accent">About UpJob</Badge>
        <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Intern today. Get hired tomorrow.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-500">
          UpJob is a modern internship and job discovery platform built for the way careers actually
          start — with real opportunities, transparent labels and a clean, fast experience.
        </p>
      </section>

      <section className="container-upjob pb-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">{v.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Opportunities for every stage of your journey
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Whether you&apos;re a first-year student looking for your first internship, a fresher hunting
              for a full-time role, or an experienced professional exploring new fields — UpJob has a
              place for you.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-zinc-600">
              {[
                "Internships across 13+ domains",
                "Full-time roles from startups to global enterprises",
                "Recommended jobs matched to your skills",
                "A single dashboard to track every application",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8">
              <Link href="/jobs">
                Start exploring
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Companies on UpJob</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {featuredCompanies.slice(0, 10).map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.slug}`}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CompanyLogo name={c.name} size="sm" />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-upjob py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Join the mission</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
          Building the hiring marketplace where careers begin. Questions or partnerships?
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/contact">Get in touch</Link>
        </Button>
      </section>

      <Footer />
    </div>
  );
}