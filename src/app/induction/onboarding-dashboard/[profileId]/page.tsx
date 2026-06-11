import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/nextauth";
import { prisma } from "@/lib/prisma";
import AppShell from "@/app/components/AppShell";
import { canManageInductions } from "@/app/induction/roles";
import { listBranches } from "@/lib/employeeQueries";
import { listDepartments } from "@/app/induction/queries";
import { CandidateDetailView } from "./CandidateDetailView";
import type { PendingInductionRow, InductionStepView } from "@/app/induction/queries";
import {
  getActiveAssignmentForUser,
  listAssignableOnboardingWorkflowsForUser,
} from "@/lib/workflow/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Candidate Detail — Onboarding",
};

interface PageProps {
  params: Promise<{ profileId: string }>;
}

/**
 * HR Page 2 — Candidate Detail. Reached by clicking a candidate row on the
 * onboarding dashboard. Read-only view of the candidate's induction
 * progress with Assign Role action when status = Completed.
 *
 * Phase A scope:
 *   - Info card, progress stepper, day tabs (read-only), modular embed +
 *     placeholder panels
 *   - Assign Role modal trigger (reuses Phase 2B+ modal + server action)
 *   - "View as Candidate →" button is disabled (Phase C wires the
 *     candidate portal)
 *
 * Out of scope (later phases):
 *   - Editing checklist (HR never can per spec)
 *   - 3-Week Branch Onboarding actual data (mock from spec for now)
 *   - Real department workflow (Phase E.2 needs workflow_assignment table)
 */
export default async function CandidateDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const actor = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { user_id: true, role: { select: { role_type: true } } },
  });
  const canManage = canManageInductions(actor?.role?.role_type ?? null);
  if (!canManage) {
    redirect("/dashboards/hrms");
  }

  const { profileId: profileIdStr } = await params;
  const profileId = Number(profileIdStr);
  if (!Number.isFinite(profileId)) notFound();

  // Fetch the profile with related user + employment + steps
  const dbProfile = await prisma.induction_profile.findUnique({
    where: { id: profileId },
    include: {
      user: {
        include: {
          user_profile: { select: { full_name: true } },
          employment: {
            where: { status: { in: ["active", "onboarding"] } },
            orderBy: { start_date: "desc" },
            take: 1,
            select: {
              department: { select: { department_name: true } },
            },
          },
        },
      },
      buddy: { include: { user_profile: { select: { full_name: true } } } },
      steps: {
        select: {
          id: true,
          step_number: true,
          title: true,
          description: true,
          due_date: true,
          status: true,
          completed_at: true,
          evidence_file_id: true,
          evidence_uploaded_at: true,
          responsible_person: {
            select: { email: true, user_profile: { select: { full_name: true } } },
          },
        },
      },
    },
  });
  if (!dbProfile) notFound();

  // Map to PendingInductionRow shape (reuses Phase 2B types)
  const totalSteps = dbProfile.steps.length;
  const completedSteps = dbProfile.steps.filter((s) => s.status === "Completed").length;
  const profile: PendingInductionRow = {
    id: dbProfile.id,
    userId: dbProfile.user_id,
    employeeName:
      dbProfile.user.user_profile?.full_name ?? dbProfile.user.email,
    employeeEmail: dbProfile.user.email,
    inductionType: dbProfile.induction_type,
    workflowTemplate: dbProfile.workflow_template,
    status: dbProfile.status,
    startDate: dbProfile.start_date.toISOString().slice(0, 10),
    exitDate: dbProfile.exit_date?.toISOString().slice(0, 10) ?? null,
    linkToken: dbProfile.link_token,
    linkExpiresAt: dbProfile.link_expires_at.toISOString(),
    createdAt: dbProfile.created_at.toISOString(),
    buddyName: dbProfile.buddy?.user_profile?.full_name ?? null,
    totalSteps,
    completedSteps,
    isArchived: false, // not relevant on this page
  };

  // Real induction steps (single source of truth). The detail view buckets
  // these by phase and renders actual completion — no spec-title matching.
  const steps: InductionStepView[] = [...dbProfile.steps]
    .sort((a, b) => a.step_number - b.step_number)
    .map((s) => ({
      id: s.id,
      stepNumber: s.step_number,
      title: s.title,
      description: s.description,
      responsibleName: s.responsible_person?.user_profile?.full_name ?? null,
      responsibleEmail: s.responsible_person?.email ?? null,
      dueDate: s.due_date.toISOString(),
      status: s.status as InductionStepView["status"],
      completedAt: s.completed_at?.toISOString() ?? null,
      evidenceFileId: s.evidence_file_id,
      evidenceUploadedAt: s.evidence_uploaded_at?.toISOString() ?? null,
    }));

  // For the Assign Role modal dropdowns
  // Plus: any active workflow assignment for this candidate, and the
  // list of workflows HR/HOD can assign right now (active + Onboarding
  // category + matching department).
  const [branches, departments, activeUsers, workflowAssignment, assignableWorkflows] =
    await Promise.all([
      listBranches(),
      listDepartments(),
      fetchActiveUsersForReportsTo(),
      getActiveAssignmentForUser(dbProfile.user_id),
      listAssignableOnboardingWorkflowsForUser(dbProfile.user_id),
    ]);

  const userEmail = session.user.email;
  const userRole = actor?.role?.role_type ?? "";
  const userName = session.user.name ?? null;

  return (
    <AppShell email={userEmail} role={userRole} name={userName}>
      <CandidateDetailView
        profile={profile}
        steps={steps}
        branches={branches}
        departments={departments}
        activeUsers={activeUsers}
        workflowAssignment={workflowAssignment}
        assignableWorkflows={assignableWorkflows}
        canAssignWorkflow={["superadmin", "hr", "od", "hod"].includes(
          (actor?.role?.role_type ?? "").toLowerCase(),
        )}
      />
    </AppShell>
  );
}

interface ActiveUserOption {
  userId: number;
  fullName: string;
  email: string;
  position: string | null;
}

/** Same query as onboarding-dashboard/page.tsx — for Assign Role modal. */
async function fetchActiveUsersForReportsTo(): Promise<ActiveUserOption[]> {
  const REPORTS_TO_ROLES = new Set(["superadmin", "ceo", "admin", "hr", "od", "hod"]);
  const rows = await prisma.users.findMany({
    where: { status: "active" },
    include: {
      user_profile: { select: { full_name: true } },
      role: { select: { role_type: true } },
      employment: {
        where: { status: "active" },
        orderBy: { start_date: "desc" },
        take: 1,
        select: { position: true },
      },
    },
    orderBy: { email: "asc" },
  });
  type Row = (typeof rows)[number];
  return rows
    .filter((u: Row) => REPORTS_TO_ROLES.has((u.role?.role_type ?? "").toLowerCase()))
    .map((u: Row) => ({
      userId: u.user_id,
      fullName: u.user_profile?.full_name ?? u.email,
      email: u.email,
      position: u.employment[0]?.position ?? null,
    }));
}
