import { Reveal } from "@/components/home/reveal";

const BENEFITS = [
  {
    title: "Certificate",
    description: "Get an internship completion certificate recognized by industry professionals.",
    icon: CertificateIcon,
    color: "text-blue-600",
    bg: "bg-blue-50",
    hoverBg: "group-hover:bg-blue-100",
  },
  {
    title: "Stipend",
    description: "Earn up to ₹45,000/month while gaining hands-on experience.",
    icon: StipendIcon,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    hoverBg: "group-hover:bg-emerald-100",
  },
  {
    title: "Letter of Recommendation",
    description: "Get a personalized LOR based on your performance and contributions.",
    icon: LorIcon,
    color: "text-amber-600",
    bg: "bg-amber-50",
    hoverBg: "group-hover:bg-amber-100",
  },
  {
    title: "Real Experience",
    description: "Work on real projects and build industry-ready skills that matter.",
    icon: ExperienceIcon,
    color: "text-violet-600",
    bg: "bg-violet-50",
    hoverBg: "group-hover:bg-violet-100",
  },
];

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Document */}
      <rect x="12" y="8" width="40" height="48" rx="4" className="transition-all duration-300 group-hover:stroke-[2.5]" />
      <line x1="20" y1="20" x2="44" y2="20" className="transition-all duration-300 group-hover:translate-x-1" />
      <line x1="20" y1="28" x2="38" y2="28" className="transition-all duration-300 group-hover:translate-x-1" />
      <line x1="20" y1="36" x2="32" y2="36" className="transition-all duration-300 group-hover:translate-x-1" />
      {/* Seal */}
      <circle cx="42" cy="46" r="8" className="transition-all duration-300 group-hover:scale-110 group-hover:fill-current group-hover:fill-opacity-10" />
      <path d="M38 46l3 3 5-6" className="transition-all duration-300 group-hover:scale-110" />
    </svg>
  );
}

function StipendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Wallet body */}
      <rect x="8" y="18" width="40" height="30" rx="4" className="transition-all duration-300 group-hover:stroke-[2.5]" />
      {/* Wallet flap */}
      <path d="M8 26h40" className="transition-all duration-300 group-hover:translate-x-1" />
      {/* Coin slot */}
      <rect x="36" y="30" width="12" height="10" rx="2" className="transition-all duration-300 group-hover:scale-105" />
      {/* Coins */}
      <circle cx="42" cy="35" r="3" className="transition-all duration-300 group-hover:scale-110 group-hover:fill-current group-hover:fill-opacity-10" />
      <circle cx="48" cy="32" r="2.5" className="transition-all duration-300 group-hover:scale-110 group-hover:fill-current group-hover:fill-opacity-10" />
      {/* Rupee symbol */}
      <text x="20" y="40" fontSize="10" fontWeight="bold" fill="currentColor" className="transition-all duration-300 group-hover:scale-110" style={{ transformOrigin: '20px 40px' }}>₹</text>
    </svg>
  );
}

function LorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Star */}
      <path
        d="M32 8l6 12.5L52 22l-10 9.5L44.5 46 32 39.5 19.5 46 22 31.5 12 22l14-1.5z"
        className="transition-all duration-300 group-hover:scale-110 group-hover:fill-current group-hover:fill-opacity-10"
        style={{ transformOrigin: '32px 27px' }}
      />
      {/* Ribbon left */}
      <path d="M24 46l-4 12h8" className="transition-all duration-300 group-hover:translate-y-1" />
      {/* Ribbon right */}
      <path d="M40 46l4 12h-8" className="transition-all duration-300 group-hover:translate-y-1" />
    </svg>
  );
}

function ExperienceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Briefcase body */}
      <rect x="8" y="22" width="48" height="28" rx="4" className="transition-all duration-300 group-hover:stroke-[2.5]" />
      {/* Handle */}
      <path d="M22 22V16a4 4 0 014-4h12a4 4 0 014 4v6" className="transition-all duration-300 group-hover:translate-y-[-2px]" />
      {/* Clasp */}
      <rect x="28" y="32" width="8" height="6" rx="1" className="transition-all duration-300 group-hover:scale-110 group-hover:fill-current group-hover:fill-opacity-10" />
      {/* Divider */}
      <line x1="8" y1="36" x2="56" y2="36" className="transition-all duration-300" />
    </svg>
  );
}

export function BenefitCards() {
  return (
    <section className="bg-white py-20 sm:py-28" aria-labelledby="benefits-title">
      <div className="container-upjob">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">What you get</p>
            <h2
              id="benefits-title"
              className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
            >
              Internship Benefits
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500 sm:text-base">
              Everything you need to launch your career — and get recognized for it.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit, i) => (
            <Reveal key={benefit.title} delay={i * 80}>
              <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${benefit.bg} ${benefit.hoverBg} transition-all duration-300 group-hover:scale-110`}
                >
                  <benefit.icon className={`h-7 w-7 ${benefit.color} transition-transform duration-300 group-hover:scale-105`} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-zinc-900 transition-colors duration-300 group-hover:text-zinc-950">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500 transition-colors duration-300 group-hover:text-zinc-600">
                  {benefit.description}
                </p>
                {/* Subtle gradient overlay on hover */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-zinc-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}