import { createHash } from "node:crypto";
import { refusalSentence } from "../../../lib/core/routed-refusal";
import { shownCovers } from "../../../lib/loop/presentation";
import type { ProduceReport } from "./producer-spec";

// The ONLY writer of renderApproved.
//
// `approvedHash` used to be an audit marker with no reader — this file's own header said so, and
// two-chains-gap-2026-07-28.md §3.6 measured the consequence. It now has one, at the moment it
// is written: the bytes being approved must be the bytes a journalist was SHOWN, and the receipt
// that says so is READ HERE from the artifact's own path, never handed in by the caller asking
// for the approval. That is decision (b) of the 2026-07-28 spec — Splash opens, and "shown" and
// "approved" have to name the same bytes.
export function applyRenderGate(
  report: ProduceReport,
  id: string,
  artifactBytes: Uint8Array,
  artifactPath: string,
): ProduceReport {
  const results = report.results.map((r) => {
    if (r.id !== id) return r;
    if (r.status !== "produced")
      throw new Error(
        `cannot approve proposal ${id}: not produced (status=${r.status})`,
      );
    // Enforce 3a → 3b: the render-review must be recorded before an approval can be, so a
    // journalist never approves without the review's concerns having been surfaced.
    //
    // The message names the ACTION, not the gate ids. A refusal is surfaced to the journalist
    // VERBATIM (SKILL.md §5d — never softened, never papered over), and this one fires on a
    // routine live path (re-produce then 3b), so "(Gate 3a before 3b)" would have put internal
    // vocabulary in front of him through the one door the voice rules deliberately leave open.
    // Naming the action keeps the refusal exactly as actionable and as machine-stable.
    if (!r.reviewed)
      throw new Error(
        `cannot approve proposal ${id}: not render-reviewed — run the render review first`,
      );
    const approvedHash = createHash("sha256")
      .update(artifactBytes)
      .digest("hex");
    // ORDER: after the review check, before the write. A visual nobody has seen is not a visual
    // with a problem — it is a question nobody was in a position to answer.
    const unshown = shownCovers(artifactPath, approvedHash);
    if (unshown) throw new Error(refusalSentence(unshown));
    return {
      ...r,
      renderApproved: true,
      approvedHash,
      shownSha256: approvedHash,
    };
  });
  if (!results.some((r) => r.id === id))
    throw new Error(`unknown proposal ${id}`);
  // Spread the incoming report so top-level fields (generatedAt — the provenance anchor
  // gate-render checks artifacts against) survive the approval write.
  return { ...report, results };
}
