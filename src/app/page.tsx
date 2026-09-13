import type { Metadata } from "next";
import Link from "next/link";
import {
  MousePointerClick,
  LayoutDashboard,
  TrendingUp,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Building2,
  ShieldCheck,
  Sparkles,
  Zap,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HeroSearch } from "@/components/hero-search";
import { JobCard } from "@/components/job-card";
import { CompanyCard } from "@/components/company-card";
import { TopCompaniesSection } from "@/components/top-companies-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFeaturedJobs } from "@/lib/db-data";
import { getFeaturedCompanies } from "@/lib/db-data";
import { categories, careerResources } from "@/data/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Find Your Next Opportunity",
  description:
    "Discover internships and jobs from startups, growing companies and leading enterprises — all in one place.",
};

const QUICK_FILTERS = [
  "Remote",
  "Work From Home",
  "Internship",
  "Full Time",
  "Part Time",
  "Fresher",
  "₹10K+ Stipend",
  "₹25K+ Stipend",
  "₹50K+ Salary",
  "Tech",
  "Marketing",
  "Design",
];

const WHY_POINTS = [
  {
    icon: Compass,
    title: "Discover",
    description: "Find internships and jobs matching your skills and interests.",
  },
  {
    icon: MousePointerClick,
    title: "Apply",
    description: "Apply directly through UpJob with just a few clicks.",
  },
  {
    icon: LayoutDashboard,
    title: "Track",
    description: "Track your applications from one clean dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Grow",
    description: "Build your career with better opportunities and insights.",
  },
];

export default async function HomePage() {
  const [featuredJobs, featuredCompanies] = await Promise.all([
    getFeaturedJobs(6),
    getFeaturedCompanies(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-100 bg-gradient-to-b from-zinc-50 via-white to-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.06),transparent_55%)]" />
        <div className="container-upjob relative py-20 text-center md:py-28">
          <Badge variant="outline" className="mx-auto mb-6 gap-1.5 rounded-full px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3 text-blue-600" />
            Intern today. Get hired tomorrow.
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
            Find Your Next{" "}
            <span className="relative whitespace-nowrap">
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Opportunity
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-500 sm:text-lg">
            Discover internships and jobs from startups, growing companies and leading enterprises —
            all in one place.
          </p>
          <div className="mx-auto mt-10 max-w-4xl">
            <HeroSearch />
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 150+ companies on UpJob
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Free for job seekers
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Track every application
            </span>
          </div>
        </div>
      </section>

      {/* QUICK FILTERS */}
      <section className="container-upjob -mt-5 relative z-10">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_FILTERS.map((f) => (
            <Link
              key={f}
              href={`/jobs?q=${encodeURIComponent(f)}`}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-900"
            >
              {f}
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED JOBS */}
      <section className="container-upjob py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="accent">Featured Jobs</Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Opportunities handpicked for you
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Fresh openings from startups, growing companies and leading enterprises.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/jobs">
              View all jobs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-20">
          <div className="text-center">
            <Badge variant="outline">Browse by Category</Badge>
            <h2 className="mx-auto mt-3 max-w-lg text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Popular categories
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Explore roles across every domain — from engineering to operations.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/jobs?category=${encodeURIComponent(cat.name)}`}
                className="group flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    cat.bg,
                    cat.color
                  )}
                >
                  <cat.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{cat.name}</p>
                  <p className="text-xs text-zinc-400">{cat.jobs.toLocaleString()}+ jobs</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED COMPANIES */}
      <section className="container-upjob py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="accent">Companies on UpJob</Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Explore opportunities at great companies
            </h2>
            <p className="mt-2 max-w-lg text-sm text-zinc-500">
              Company listings on UpJob are not automatically affiliated partnerships. Look for the
              Verified badge — and treat every posting with due diligence.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/companies">
              Explore all companies
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCompanies.slice(0, 8).map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      </section>

      {/* WHY UPJOB */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-20">
          <div className="text-center">
            <Badge variant="outline">Why UpJob</Badge>
            <h2 className="mx-auto mt-3 max-w-lg text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Everything you need to launch your career
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_POINTS.map((point) => (
              <div
                key={point.title}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white transition-colors group-hover:bg-blue-600">
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-zinc-900">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-upjob py-20">
        <div className="text-center">
          <Badge variant="outline">How It Works</Badge>
          <h2 className="mx-auto mt-3 max-w-lg text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            From first search to signed offer
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-zinc-900">For Candidates</h3>
            </div>
            <div className="mt-6 space-y-0">
              {[
                "Create Profile",
                "Discover",
                "Apply",
                "Track",
                "Get Hired",
              ].map((step, i, arr) => (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && <span className="my-1 w-px flex-1 bg-zinc-200" />}
                  </div>
                  <div className="pb-6">
                    <p className="pt-1 text-sm font-semibold text-zinc-800">{step}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {i === 0 && "Build a profile that showcases your skills"}
                      {i === 1 && "Explore opportunities matched to you"}
                      {i === 2 && "Apply directly with one click"}
                      {i === 3 && "Monitor every application in one place"}
                      {i === 4 && "Land the internship or job you deserve"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-900 p-8 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white">For Employers</h3>
            </div>
            <div className="mt-6 space-y-0">
              {[
                "Create Company",
                "Post Job",
                "Review Candidates",
                "Interview",
                "Hire",
              ].map((step, i, arr) => (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white ring-1 ring-white/20">
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && <span className="my-1 w-px flex-1 bg-white/20" />}
                  </div>
                  <div className="pb-6">
                    <p className="pt-1 text-sm font-semibold text-white">{step}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {i === 0 && "Set up your company profile"}
                      {i === 1 && "Post roles to thousands of candidates"}
                      {i === 2 && "Shortlist the right talent"}
                      {i === 3 && "Schedule interviews seamlessly"}
                      {i === 4 && "Make the offer and grow your team"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild className="mt-4 bg-white text-zinc-900 hover:bg-zinc-100">
              <Link href="/employer">Post a Job</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* INTERNSHIP SECTION */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="accent">Internships</Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Launch your career with the right internship
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-500">
                Paid and unpaid internships across software, design, marketing, data, finance and
                more. Filter by domain, stipend, duration and work mode to find the perfect fit.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Paid stipends up to ₹50,000/month",
                  "Remote, hybrid and on-site internships",
                  "Direct applications — no middlemen",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Button asChild>
                  <Link href="/internships">
                    Explore Internships
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/jobs">Browse All Jobs</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {featuredJobs
                .filter((j) => j.type === "Internship")
                .slice(0, 4)
                .map((job, i) => (
                  <div
                    key={job.id}
                    className={cn(
                      "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                      i % 2 === 1 && "lg:mt-8"
                    )}
                  >
                    <p className="text-xs font-medium text-blue-600">{job.category}</p>
                    <Link href={`/jobs/${job.id}`}>
                      <h3 className="mt-1.5 text-sm font-semibold text-zinc-900 hover:text-blue-600">
                        {job.title}
                      </h3>
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">{job.location}</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      ₹{(job.salaryMin / 1000).toFixed(0)}K/month
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* CAREER RESOURCES */}
      <section className="container-upjob py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="outline">Career Resources</Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Learn how to get hired
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Guides, playbooks and tips from recruiters and hiring managers.
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {careerResources.slice(0, 6).map((res) => (
            <Link
              key={res.title}
              href="/resources"
              className={cn(
                "group flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
                res.featured ? "border-zinc-900" : "border-zinc-200/80"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant={res.featured ? "dark" : "accent"}>{res.category}</Badge>
                {res.featured && (
                  <Badge variant="dark">
                    <Zap className="h-3 w-3" />
                    Trending
                  </Badge>
                )}
              </div>
              <h3 className="mt-4 text-base font-semibold leading-6 text-zinc-900 group-hover:text-blue-600">
                {res.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-zinc-500">{res.excerpt}</p>
              <p className="mt-4 text-xs font-medium text-zinc-400">{res.readTime}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-upjob pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900 px-6 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="relative">
            <Badge variant="dark" className="bg-white/10 ring-white/20">
              <Building2 className="h-3 w-3" />
              Your next step starts here
            </Badge>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Intern today. Get hired tomorrow.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-400">
              Join thousands of students and freshers building their careers on UpJob — for free.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100">
                <Link href="/signup">
                  Create Free Profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/employer">
                  <ShieldCheck className="h-4 w-4" />
                  For Recruiters
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TopCompaniesSection />
      <Footer />
    </div>
  );
}