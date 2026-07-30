// A refusal that can only be measured on the RENDER — the contrast guards. It is late, and that
// is assumed (decision 2, 2026-07-29): what cannot be established before the render cannot be
// declared at the offer, and a preventive mark on a form nobody measured would be a false in
// the other direction. Two things are owed instead: the refusal DEVIATES to the step that
// unblocks, and it is RECORDED so the declared-limit list shrinks on evidence.
//
// Renders through lib/core/routed-refusal.ts's shared refusalSentence() now (family A's task 1
// landed) — this module no longer has its own refusal-formatting. `deviation` stays a plain
// string rather than becoming a full Route: a late refusal is guard-specific and measured only
// at render, so there is no runnable command to carry — the guard's own message IS the fix.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  refusalSentence,
  type RoutedRefusal,
} from "../../../lib/core/routed-refusal";

export type LateRefusal = {
  guard: string;
  subject: string;
  reason: string;
  deviation: string;
  at: string;
};

export function lateRefusalSentence(r: Omit<LateRefusal, "at">): string {
  if (!r.deviation.trim())
    throw new Error(
      "late-refusal: a refusal with no deviation stops the run instead of routing it — " +
        "name the step that unblocks",
    );
  const routed: RoutedRefusal = {
    code: "late-render-refusal",
    message: `${r.guard} refused ${r.subject}: ${r.reason}`,
    route: { step: r.deviation },
  };
  return refusalSentence(routed);
}

export function recordLateRefusal(
  outDir: string,
  r: Omit<LateRefusal, "at">,
): void {
  lateRefusalSentence(r); // validate before recording — no unrouted refusal on disk either
  mkdirSync(outDir, { recursive: true });
  const row: LateRefusal = { ...r, at: new Date().toISOString() };
  appendFileSync(
    join(outDir, "late-refusals.jsonl"),
    JSON.stringify(row) + "\n",
  );
}
