import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getSessionUser } from "@/lib/auth";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const name = user?.name ?? "Recruiter";
  const email = user?.email ?? "";

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 lg:block">
        <div className="lg:sticky lg:top-0">
          <DashboardSidebar mode="employer" userName={name} userEmail={email} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-zinc-50/50">
        <div className="border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-bold text-zinc-900">
              Up<span className="text-blue-600">Job</span> · Employer
            </Link>
            <Link href="/employer" className="text-xs font-medium text-blue-600">
              Dashboard
            </Link>
          </div>
        </div>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}