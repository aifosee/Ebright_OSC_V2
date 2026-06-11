"use client";

import { useState } from "react";

export interface CredentialData {
  candidateName: string;
  candidateEmail: string;
  /** The induction login link (token URL) the candidate uses to begin. This
   *  is the real, working entry point — there is no separate password to
   *  share from this flow. */
  loginLink: string;
}

/**
 * Step 2 of the Create / Accept Induction flow — confirmation screen.
 *
 * Shows the candidate's induction login link as the single copyable artifact.
 * The link is token-authenticated, so it is all the candidate needs to start.
 *
 * NOTE: this flow does NOT mint a username/password. The welcome email with
 * real credentials is scheduled + sent by the Employee form + cron job
 * (induction_profile.pending_email_password → /api/jobs/send-onboarding-emails).
 * This screen therefore never claims an email was sent and never shows a
 * password — it only surfaces the link HR can share directly if needed.
 */
interface Props {
  data: CredentialData;
  onDone: () => void;
}

export function CredentialScreen({ data, onDone }: Props) {
  return (
    <>
      <header className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span aria-hidden="true">✓</span> Induction profile ready
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Share this induction link with the candidate so they can begin onboarding.
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          aria-label="Close"
          className="text-slate-400 hover:text-slate-700 text-lg leading-none px-2"
        >
          ×
        </button>
      </header>

      <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
        {/* Green link card */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <CredRow label="Candidate" value={`${data.candidateName} (${data.candidateEmail})`} copyable={false} />
          <CredRow label="Induction Login Link" value={data.loginLink} copyable mono />
        </div>

        {/* Blue info box — accurate: the link is the entry point, and the
            welcome email (if scheduled) is sent separately by the cron. */}
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 flex items-start gap-2">
          <span aria-hidden="true">🔗</span>
          <span>
            This link is all the candidate needs to log in and start their induction —
            no separate password required. If a welcome email was scheduled when the
            employee was created, it is sent automatically on the scheduled date.
          </span>
        </div>
      </div>

      <footer className="px-6 py-4 border-t border-slate-200 flex items-center justify-end bg-slate-50">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Done
        </button>
      </footer>
    </>
  );
}

function CredRow({
  label,
  value,
  copyable,
  mono,
}: {
  label: string;
  value: string;
  copyable: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — could fall back to a textarea+execCommand
      // hack, but most modern browsers + HTTPS support clipboard.writeText.
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80">{label}</p>
      <div className="flex items-center justify-between gap-2 rounded-md bg-white border border-emerald-200 px-3 py-2">
        <span className={`text-xs text-slate-900 break-all flex-1 ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
