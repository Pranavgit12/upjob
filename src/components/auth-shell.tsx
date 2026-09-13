import { Logo } from "@/components/navbar";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 lg:flex">
        <Logo className="text-white [&>span:last-child]:text-white [&>span:first-child]:bg-white [&>span:first-child]:text-zinc-900" />
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Intern today. Get hired tomorrow.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Join thousands of students, freshers and professionals discovering opportunities on UpJob
            — and the recruiters who hire them.
          </p>
          <div className="mt-8 space-y-3">
            {["1,000s of internships and jobs", "Direct applications, no middlemen", "Track offers from one dashboard"].map(
              (f) => (
                <p key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                  {f}
                </p>
              )
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-500">© {new Date().getFullYear()} UpJob. All rights reserved.</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className={cn("w-full max-w-sm")}>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome to UpJob</h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}