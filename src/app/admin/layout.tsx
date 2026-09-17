import { getSessionUser } from "@/lib/auth";
import AdminGate from "@/components/admin-gate";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <>
      <AdminGate user={user} />
      {user?.role === "admin" ? children : null}
    </>
  );
}