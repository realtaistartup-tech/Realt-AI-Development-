"use client";

import { useEffect } from "react";

const WAS_CLOSED_ATTR = "data-print-reopen";

/**
 * Forces every collapsed <details> on the page open before printing (or
 * "Print / Save as PDF"), and restores the original collapsed state
 * afterward. A CSS-only `@media print` override of the UA stylesheet's
 * `details:not([open]) > *:not(summary) { display: none }` rule turned out
 * not to be reliable in Chromium — the content stayed unpainted even with
 * `display: block !important`. Toggling the real `open` attribute is the
 * spec-sanctioned way browsers reveal <details> content, so it always
 * works, in every browser, with no CSS fighting.
 */
export function PrintExpandDetails() {
  useEffect(() => {
    function openAll() {
      document.querySelectorAll("details:not([open])").forEach((element) => {
        element.setAttribute(WAS_CLOSED_ATTR, "true");
        (element as HTMLDetailsElement).open = true;
      });
    }

    function restoreAll() {
      document.querySelectorAll(`details[${WAS_CLOSED_ATTR}]`).forEach((element) => {
        (element as HTMLDetailsElement).open = false;
        element.removeAttribute(WAS_CLOSED_ATTR);
      });
    }

    window.addEventListener("beforeprint", openAll);
    window.addEventListener("afterprint", restoreAll);
    return () => {
      window.removeEventListener("beforeprint", openAll);
      window.removeEventListener("afterprint", restoreAll);
    };
  }, []);

  return null;
}
