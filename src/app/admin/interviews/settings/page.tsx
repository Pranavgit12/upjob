import Link from "next/link";
import { INTERN_ROLES, loadRoleConfig } from "@/lib/ai/config";
import { AdminInterviewSettings } from "@/components/admin-interview-settings";

export const dynamic = "force-dynamic";

export default async function AdminInterviewSettingsPage() {
  const configs = [];
  for (const role of INTERN_ROLES) {
    configs.push((await loadRoleConfig(role.key)) ?? role);
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">HR Admin</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">AI Interview Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Per-role interview configuration. Changes apply to interviews started after saving.
      </p>

      <div className="mt-4">
        <Link href="/admin/interviews" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back to candidates
        </Link>
      </div>

      <AdminInterviewSettings roles={configs.map((c) => JSON.parse(JSON.stringify(c)))} />
    </div>
  );
}