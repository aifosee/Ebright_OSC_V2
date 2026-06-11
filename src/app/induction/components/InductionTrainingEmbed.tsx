"use client";

/**
 * Modular Induction Training embed panel.
 *
 * Links to the interactive 3-day training experience that ships in
 * /public/onboarding-preview/index.html — the same target as the HRMS
 * dashboard "Induction Training" tile (keep the two in sync).
 */
interface Props {
  employeeTypeLabel: string;
  /** Override the default path if the flow is hosted elsewhere. */
  externalUrl?: string;
}

export function InductionTrainingEmbed({
  employeeTypeLabel,
  externalUrl = "/onboarding-preview/index.html",
}: Props) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded bg-slate-900 text-white text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5">
            Induction Training
          </span>
          <h2 className="text-sm font-semibold text-slate-900">
            eBright Onboarding Flow — {employeeTypeLabel}
          </h2>
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          ↗ Open Full Flow
        </a>
      </header>
      <div className="px-6 py-10 bg-slate-50 text-center">
        <p className="text-sm font-semibold text-slate-700">Induction Training Flow</p>
        <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The interactive 3-day induction training experience for{" "}
          <span className="font-semibold text-slate-700">{employeeTypeLabel}</span>.
          Use <span className="font-semibold text-slate-700">Open Full Flow</span> above to launch it.
        </p>
      </div>
    </section>
  );
}
