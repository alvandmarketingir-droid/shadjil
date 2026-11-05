import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePermission } from "@/lib/admin/require-permission";
import { permissionsFor } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await requirePermission("admin.access");

  if (!gate.ok) {
    if (gate.error === "login_required") {
      redirect("/login?next=/admin/dashboard");
    }
    redirect("/");
  }

  return (
    <AdminShell
      role={gate.role}
      permissions={[...permissionsFor(gate.role)]}
    >
      {children}
    </AdminShell>
  );
}
