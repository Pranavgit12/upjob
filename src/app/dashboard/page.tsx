import { DashboardOverview } from "@/components/dashboard-overview";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-data";

export default async function DashboardOverviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const summary = await getDashboardOverview(user.id);
  return <DashboardOverview summary={summary} />;
}
