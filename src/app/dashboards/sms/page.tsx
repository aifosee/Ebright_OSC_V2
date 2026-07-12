import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/nextauth";
import AppShell from "@/app/components/AppShell";
import SmsDashboard from "@/app/components/SmsDashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SMS",
};

export default async function SmsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const userEmail = session.user.email;
  const userRole = (session.user as { role?: string }).role ?? "";
  const userName = session.user.name ?? null;

  return (
    <AppShell email={userEmail} role={userRole} name={userName}>
      <SmsDashboard />
    </AppShell>
  );
}
