"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const QUICK_SEARCHES = [
  "Software Engineer",
  "Frontend Developer",
  "Data Analyst",
  "Marketing Intern",
  "Product Designer",
];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("Anywhere");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location !== "Anywhere") params.set("location", location);
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={onSearch}
        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-900/5 lg:flex-row lg:items-center"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-5 w-5 shrink-0 text-zinc-400" />
          <Input
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Job title, skill or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="hidden h-8 w-px bg-zinc-200 lg:block" />
        <div className="flex flex-1 items-center gap-2 px-3">
          <MapPin className="h-5 w-5 shrink-0 text-zinc-400" />
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="h-12 border-0 shadow-none focus:ring-0 data-[placeholder]:text-zinc-500">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Anywhere">Anywhere</SelectItem>
              <SelectItem value="Bengaluru">Bengaluru</SelectItem>
              <SelectItem value="Mumbai">Mumbai</SelectItem>
              <SelectItem value="Gurugram">Gurugram</SelectItem>
              <SelectItem value="Hyderabad">Hyderabad</SelectItem>
              <SelectItem value="Pune">Pune</SelectItem>
              <SelectItem value="Chennai">Chennai</SelectItem>
              <SelectItem value="New Delhi">New Delhi</SelectItem>
              <SelectItem value="Remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="lg" className="h-12 lg:px-8" variant="accent">
          Search Jobs
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <TrendingUp className="h-3.5 w-3.5" />
          Popular:
        </span>
        {QUICK_SEARCHES.map((q) => (
          <a
            key={q}
            href={`/jobs?q=${encodeURIComponent(q)}`}
            className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 transition-all hover:bg-white hover:text-zinc-900 hover:shadow-sm"
          >
            {q}
          </a>
        ))}
      </div>
    </div>
  );
}