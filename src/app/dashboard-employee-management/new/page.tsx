import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/nextauth";
import AppShell from "@/app/components/AppShell";
import EmployeeForm from "@/app/components/EmployeeForm";
import { listBranches, listDepartments } from "@/lib/employeeQueries";
import { createEmployee } from "@/app/dashboard-employee-management/actions";

export default async function AddEmployeePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [branches, departments] = await Promise.all([
    listBranches(),
    listDepartments(),
  ]);

  const userEmail = session.user?.email ?? "";
  const userRole = (session.user as { role?: string } | undefined)?.role ?? "";
  const userName = session.user?.name ?? null;

  return (
    <AppShell email={userEmail} role={userRole} name={userName}>
      <EmployeeForm
        branches={branches}
        departments={departments}
        mode="create"
        action={createEmployee}
      />
    </AppShell>
  );
}
