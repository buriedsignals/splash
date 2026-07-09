import type { ProduceReport } from "./producer-spec";

// The one MECHANICAL gate: nothing ships unless it was actually produced AND the human
// approved the render. Lives in the irreversible-action scripts so a lower-level call
// cannot bypass it.
export function assertShippable(report: ProduceReport, id: string): void {
  const r = report.results.find((x) => x.id === id);
  if (!r) throw new Error(`unknown proposal ${id}`);
  if (r.status !== "produced")
    throw new Error(
      `refusing to export ${id}: not produced (status=${r.status})`,
    );
  if (!r.reviewed)
    throw new Error(
      `refusing to export ${id}: not render-reviewed (run the render-review + review-gate first)`,
    );
  if (!r.renderApproved)
    throw new Error(
      `refusing to export ${id}: not render-approved (run gate-render first)`,
    );
}

// After EXPORT: a hand-over folder is a REAL delivery only if `export-code` actually
// produced its artifacts. This is the mechanical teeth behind the "delivered requires an
// export artifact" rule (SKILL.md EXPORT §6) — a run cannot claim an interactive/scrolly
// visual delivered on produce-time byproducts (a Gate-3 review PNG, `interactive.png`, or
// the build subdir's `static.png`); only this folder is a delivery. It also locks the
// a11y invariant: a no-JS `static.html` fallback is ALWAYS present for an interactive
// delivery. A SCROLLY is the one exemption — it has no static image, so it ships without
// the static form (SKILL.md EXPORT §6). `export-code` calls this on its OWN output, so a
// build that silently dropped the fallback fails loudly instead of shipping inaccessible.
export function assertDelivered(
  files: string[],
  opts?: { scrolly?: boolean },
): void {
  if (!files.includes("EMBED.md"))
    throw new Error(
      "not a delivery: EMBED.md missing — export-code did not run to completion",
    );
  if (!files.some((f) => f.toLowerCase().endsWith(".html")))
    throw new Error("not a delivery: no .html artifact in the export folder");
  if (!opts?.scrolly && !files.includes("static.html"))
    throw new Error(
      "not a delivery: static.html (no-JS a11y fallback) missing — an interactive export MUST carry it",
    );
}
