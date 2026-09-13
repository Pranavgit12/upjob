import type { Metadata } from "next";
import Link from "next/link";
import { Zap, ArrowRight, BookOpen, FileText, Briefcase } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { careerResources as resources } from "@/data/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Career Resources",
  description:
    "Resume guides, interview playbooks and career advice to help you get hired on UpJob.",
};

const GUIDES = [
  {
    icon: FileText,
    title: "Resume Masterclass",
    description: "Step-by-step guide to building a resume recruiters actually read.",
    items: 8,
  },
  {
    icon: BookOpen,
    title: "Interview Prep Library",
    description: "Behavioural and technical interview practice questions with model answers.",
    items: 12,
  },
  {
    icon: Briefcase,
    title: "Internship Playbook",
    description: "How to land — and convert — your first internship into a job offer.",
    items: 6,
  },
];

export default function ResourcesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />
      <section className="border-b border-zinc-100 bg-zinc-50/50">
        <div className="container-upjob py-14 text-center">
          <Badge variant="accent">Career Resources</Badge>
          <h1 className="mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Learn how to get hired
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-500">
            Free guides, playbooks and tips — from writing your resume to negotiating your first offer.
          </p>
        </div>
      </section>

      <section className="container-upjob flex-1 py-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {GUIDES.map((g) => (
            <Link
              key={g.title}
              href="/resources"
              className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white transition-colors group-hover:bg-blue-600">
                <g.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-zinc-900">{g.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-zinc-500">{g.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{g.items} guides</span>
                <span className="flex items-center gap-1 text-sm font-medium text-blue-600">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">Latest articles</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((res) => (
              <article
                key={res.title}
                className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
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
                <h3
                  className={cn(
                    "mt-4 cursor-pointer text-base font-semibold leading-6 text-zinc-900 group-hover:text-blue-600"
                  )}
                >
                  {res.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-zinc-500">{res.excerpt}</p>
                <p className="mt-4 text-xs font-medium text-zinc-400">{res.readTime}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-3xl bg-zinc-900 px-6 py-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">Put these tips into practice</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Build your profile now, and start applying with a resume that stands out.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
          >
            Create Free Profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}