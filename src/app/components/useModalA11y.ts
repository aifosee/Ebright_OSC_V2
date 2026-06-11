"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Accessibility helper for custom `role="dialog"` modals:
 *   - Escape closes the dialog.
 *   - Tab / Shift+Tab is trapped inside the dialog (focus cycles, never
 *     escapes to the page behind it).
 *   - Focus moves into the dialog on open and is restored to the previously
 *     focused element on close.
 *
 * Attach the returned ref to the dialog *panel* element and give that element
 * `tabIndex={-1}` so it can receive focus as a fallback when it has no
 * focusable children yet.
 *
 *   const dialogRef = useModalA11y(onClose);
 *   <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true">…</div>
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  /** Pass false when the dialog is not currently rendered so the hook can be
   *  called unconditionally (React rules) without attaching global listeners. */
  enabled: boolean = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog on open.
    const initial = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initial ?? node)?.focus?.();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;

      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (active && !node.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose, enabled]);

  return ref;
}
