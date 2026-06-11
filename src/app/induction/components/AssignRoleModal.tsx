"use client";

import { useEffect, useState, useTransition } from "react";
import { useModalA11y } from "@/app/components/useModalA11y";
import {
  assignCandidateRole,
  listDepartmentHeads,
  type ReportsToOption,
} from "@/app/induction/actions";
import type { PendingInductionRow, DepartmentOption } from "@/app/induction/queries";
import type { BranchOpt } from "@/lib/employeeQueries";

export interface ActiveUserOption {
  userId: number;
  fullName: string;
  email: string;
  position: string | null;
}

interface Props {
  profile: PendingInductionRow;
  branches: BranchOpt[];
  departments: DepartmentOption[];
  activeUsers: ActiveUserOption[];
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  "Regular Intern",
  "Protege Intern",
  "Part-time Coach",
  "Full-time Coach",
  "Executive HQ",
  "Manager",
] as const;

export function AssignRoleModal({
  profile,
  branches,
  departments,
  onClose,
  onSuccess,
}: Props) {
  const [role, setRole] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [reportsToUserId, setReportsToUserId] = useState<string>("");
  // "Reporting To" is populated dynamically with the HOD(s) of the selected
  // department (narrowed by branch when one is chosen) — see effect below.
  const [reportsToOptions, setReportsToOptions] = useState<ReportsToOption[]>([]);
  const [loadingReportsTo, setLoadingReportsTo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  // Re-fetch department heads whenever the department or branch changes.
  // The dropdown stays disabled until a department is picked.
  useEffect(() => {
    if (!departmentId) {
      setReportsToOptions([]);
      setReportsToUserId("");
      return;
    }
    let cancelled = false;
    setLoadingReportsTo(true);
    setReportsToUserId("");
    listDepartmentHeads(Number(departmentId), branchId ? Number(branchId) : null)
      .then((opts) => {
        if (!cancelled) setReportsToOptions(opts);
      })
      .finally(() => {
        if (!cancelled) setLoadingReportsTo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [departmentId, branchId]);

  const canSubmit = role !== "" && departmentId !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await assignCandidateRole({
        profileId: profile.id,
        role,
        departmentId: Number(departmentId),
        branchId: branchId ? Number(branchId) : null,
        reportsToUserId: reportsToUserId ? Number(reportsToUserId) : null,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed to assign role.");
      } else {
        onSuccess();
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-role-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(17, 17, 17, 0.5)" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b" style={{ borderColor: "#E5E5E0" }}>
          <h2 id="assign-role-title" className="text-base font-bold text-slate-900">
            Assign Permanent Role
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            For <span className="font-semibold text-slate-700">{profile.employeeName}</span> ({profile.employeeEmail})
          </p>
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <Field label="Permanent Role" required>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a role…</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>

          <Field label="Department" required>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Assigned Branch">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— No branch (HQ-based) —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code ? `${b.code} · ${b.name}` : b.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reporting To">
            <select
              value={reportsToUserId}
              onChange={(e) => setReportsToUserId(e.target.value)}
              disabled={!departmentId || loadingReportsTo}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="">
                {!departmentId
                  ? "Select branch & department first"
                  : loadingReportsTo
                    ? "Loading department heads…"
                    : reportsToOptions.length === 0
                      ? "No department head found"
                      : "— No direct manager —"}
              </option>
              {reportsToOptions.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName}{u.position ? ` · ${u.position}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Head(s) of the selected department{branchId ? " at this branch" : ""}.
            </p>
          </Field>

          <div
            className="rounded-md border px-3 py-2.5 text-xs flex items-start gap-2"
            style={{ background: "#FFFBEB", borderColor: "#FED7AA", color: "#92400E" }}
          >
            <span aria-hidden="true">⚠️</span>
            <span>
              Confirming will remove this candidate from the onboarding pipeline and update their
              employment record with the new role.
            </span>
          </div>

          {error && (
            <div
              className="rounded-md border px-3 py-2 text-xs"
              style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" }}
            >
              {error}
            </div>
          )}
        </form>

        <footer
          className="px-6 py-4 flex items-center justify-end gap-2"
          style={{ background: "#FAFAFA", borderTop: "1px solid #E5E5E0" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-md px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#16A34A" }}
          >
            {submitting ? "Assigning…" : "Confirm & Assign Role"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
