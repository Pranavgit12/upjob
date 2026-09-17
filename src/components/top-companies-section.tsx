import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCompanies } from "@/lib/db-data";
import { Button } from "@/components/ui/button";

const LOGO_ASSETS = [
  { name: "Allianz", logo: "/logos/allianz-1.svg" },
  { name: "Coca-Cola", logo: "/logos/coca-cola-2021.svg" },
  { name: "DHL", logo: "/logos/dhl-1.svg" },
  { name: "DJI", logo: "/logos/dji-1.svg" },
  { name: "Google", logo: "/logos/google-1-1.svg" },
  { name: "Honda", logo: "/logos/honda-11.svg" },
  { name: "Levi's", logo: "/logos/levis-1.svg" },
  { name: "Meta", logo: "/logos/meta-3.svg" },
  { name: "PUMA", logo: "/logos/puma-logo.svg" },
  { name: "Spotify", logo: "/logos/spotify-2.svg" },
  { name: "Swiggy", logo: "/logos/swiggy-logo.svg" },
  { name: "Visa", logo: "/logos/visa-10.svg" },
  { name: "Zomato", logo: "/logos/zomato-2.svg" },
];

function CompanyCard({ name, logo, slug }: (typeof LOGO_ASSETS)[number] & { slug?: string }) {
  const content = (
    <span className="top-companies__card group">
      <Image
        src={logo}
        alt={`${name} logo`}
        width={150}
        height={56}
        className="top-companies__logo"
      />
      <span className="sr-only">{name}</span>
    </span>
  );

  return slug ? (
    <Link href={`/companies/${slug}`} aria-label={`View ${name}`} className="block">
      {content}
    </Link>
  ) : (
    <span aria-label={`${name} logo`}>{content}</span>
  );
}

export async function TopCompaniesSection() {
  const companies = await getCompanies();
  const companyCount = `${companies.length}+`;
  const companyByName = new Map(companies.map((company) => [company.name.toLowerCase(), company]));
  const logos = LOGO_ASSETS.map((asset) => ({
    ...asset,
    slug: companyByName.get(asset.name.toLowerCase())?.slug,
  }));
  const firstRow = [...logos, ...logos];
  const secondRow = [...logos.slice().reverse(), ...logos.slice().reverse()];

  return (
    <section className="top-companies-section border-y border-zinc-100 bg-zinc-50/60" aria-labelledby="top-companies-title">
      <div className="container-upjob py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Build your future</p>
          <h2 id="top-companies-title" className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Get experienced and job ready for {companyCount} top companies
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-500 sm:text-base">
            Build real-world experience, develop job-ready skills, and prepare yourself for opportunities at leading companies.
          </p>
        </div>

        <div className="top-companies__marquees mt-12 space-y-4" aria-label={`${companyCount} top companies`}>
          <div className="top-companies__viewport">
            <div className="top-companies__track top-companies__track--right">
              {firstRow.map((company, index) => (
                <CompanyCard key={`right-${company.name}-${index}`} {...company} />
              ))}
            </div>
          </div>
          <div className="top-companies__viewport">
            <div className="top-companies__track top-companies__track--left">
              {secondRow.map((company, index) => (
                <CompanyCard key={`left-${company.name}-${index}`} {...company} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-medium text-zinc-700">Ready to become job-ready?</p>
          <Button asChild>
            <Link href="/signup">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
