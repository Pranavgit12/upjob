import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 lg:block">
        <div className="lg:sticky lg:top-0">
          <DashboardSidebar mode="candidate" userName="Aarav" userEmail="aarav@upjob.app" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-zinc-50/50">
        <div className="border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-bold text-zinc-900">
              Up<span className="text-blue-600">Job</span> · Dashboard
            </Link>
            <details className="relative">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                A
              </summary>
              <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                <DashboardSidebar mode="candidate" userName="Aarav" userEmail="aarav@upjob.app" />
              </div>
            </details>
          </div>
        </div>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}