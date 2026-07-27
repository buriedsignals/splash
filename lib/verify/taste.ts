// The "needs-human-eye" lane.
//
// This project already ran the experiment: S4c decomposed judge opinion into five semantic
// dimensions and measured inter-judge kappa, and its own conclusion (spec
// 2026-07-23-s4c-dimension-judges-kappa-design.md, "Goals" 5) is that kappa measures a
// judge's SELF-CONSISTENCY, not correctness, until human labels exist. Stacking a second
// model on the first would manufacture confidence rather than verification.
//
// So the axes no mechanism can settle are not graded here. They are DETECTED as risks —
// with the measurement that raised them — and routed to the one instrument that can see the
// ceiling: the human editor who already signs off (skills/splash/src/editorial-signoff.ts).
//
// The type is the guard. TasteRiskSignal has no `outcome`, no `severity`, no `pass`: there
// is no field a model could write a verdict into, so "risk" cannot quietly become "fine".
import type { CaptureRecord, TasteRiskSignal } from "./types";

// Marks per 100 css px of component width. A slope with 18 marks across 1152px sits at 1.6;
// a chart at 8 is dense enough that whether it still READS is a judgement about the subject,
// not a threshold — which is exactly when a human should look.
export const DENSITY_MARKS_PER_100PX = 8;

// Weighted RGB distance (2,4,3 — the cheap approximation of perceived difference). Measured
// against real palettes: the codebase's own #1b7f79 / #d95f02 pair scores ~345, while a pair
// a reader would struggle to separate (#1b7f79 / #1d8a80) scores ~25.
export const MIN_COLOUR_SEPARATION = 90;

// Share of the confirmed takeaway's content words the rendered title also uses. Below this,
// the title may be a fine editorial rewrite or may have drifted off the confirmed point —
// a distinction no token count can make, which is why it is a risk and not a finding.
export const TAKEAWAY_OVERLAP_FLOOR = 0.3;

// Share of the publication container the component actually fills.
export const WHITESPACE_FILL_FLOOR = 0.35;

// Words carried by almost every sentence: counting them as overlap would make any two
// strings look related and silence the detector.
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with",
  "every",
  "all",
  "than",
  "this",
]);

function contentWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function rgbOf(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function colourSeparation(a: string, b: string): number | null {
  const x = rgbOf(a);
  const y = rgbOf(b);
  if (!x || !y) return null;
  const dr = x[0] - y[0];
  const dg = x[1] - y[1];
  const db = x[2] - y[2];
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

export type TasteInput = {
  captures: CaptureRecord[];
  confirmedTakeaway: string;
  /** The title as actually RENDERED. Absent when nothing was captured to read it from —
   *  a missing title is a furniture finding, not a matter of taste. */
  renderedTitle?: string;
};

/** Detect risks. Never a verdict: each signal carries the number that raised it. */
export function detectTasteRisks(input: TasteInput): TasteRiskSignal[] {
  const out: TasteRiskSignal[] = [];

  // Density and whitespace are judged at EVERY captured breakpoint: a chart that breathes
  // on a 1600px desktop and suffocates at 360px is the normal case, not the exception.
  const dense: string[] = [];
  const empty: string[] = [];
  for (const c of input.captures) {
    if (c.rootBox.width > 0 && c.marks > 0) {
      const per100 = (c.marks / c.rootBox.width) * 100;
      if (per100 > DENSITY_MARKS_PER_100PX)
        dense.push(
          `[${c.breakpoint}] ${c.marks} marks across ${Math.round(c.rootBox.width)}px (${per100.toFixed(1)} per 100px, risk above ${DENSITY_MARKS_PER_100PX})`,
        );
    }
    const containerArea = c.cssViewport.width * c.cssViewport.height;
    const rootArea = c.rootBox.width * c.rootBox.height;
    if (containerArea > 0 && rootArea / containerArea < WHITESPACE_FILL_FLOOR)
      empty.push(
        `[${c.breakpoint}] the component fills ${(100 * rootArea) / containerArea < 1 ? "<1" : Math.round((100 * rootArea) / containerArea)}% of its ${c.cssViewport.width}x${c.cssViewport.height} container`,
      );
  }
  if (dense.length)
    out.push({
      dimension: "density",
      detector: `marks per 100px > ${DENSITY_MARKS_PER_100PX}`,
      evidence: dense,
      routedTo: "human-signoff",
    });
  if (empty.length)
    out.push({
      dimension: "whitespace",
      detector: `component fills < ${Math.round(WHITESPACE_FILL_FLOOR * 100)}% of its container`,
      evidence: empty,
      routedTo: "human-signoff",
    });

  // Palette adjacency, over the colours ACTUALLY painted — harvested from the live render
  // rather than read off a config. This codebase has already paid for the difference: a
  // grep of a single-file bundle once "proved" a palette that was not the one on screen.
  const colours = [...new Set(input.captures.flatMap((c) => c.markColours))];
  const tooClose: string[] = [];
  for (let i = 0; i < colours.length; i++)
    for (let j = i + 1; j < colours.length; j++) {
      const d = colourSeparation(colours[i]!, colours[j]!);
      if (d !== null && d < MIN_COLOUR_SEPARATION)
        tooClose.push(
          `${colours[i]} and ${colours[j]} are ${Math.round(d)} apart (risk below ${MIN_COLOUR_SEPARATION})`,
        );
    }
  if (tooClose.length)
    out.push({
      dimension: "palette-adjacency",
      detector: `weighted RGB separation < ${MIN_COLOUR_SEPARATION}`,
      evidence: tooClose,
      routedTo: "human-signoff",
    });

  // Title vs the takeaway the journalist confirmed. The project's own audit lists this as a
  // recurring divergence with no clean mechanical lever — precisely why it belongs here
  // rather than in the findings list.
  if (input.renderedTitle?.trim()) {
    const takeaway = contentWords(input.confirmedTakeaway);
    const title = contentWords(input.renderedTitle);
    if (takeaway.size > 0) {
      const shared = [...takeaway].filter((w) => title.has(w)).length;
      const overlap = shared / takeaway.size;
      if (overlap < TAKEAWAY_OVERLAP_FLOOR)
        out.push({
          dimension: "title-takeaway-divergence",
          detector: `shared content words < ${TAKEAWAY_OVERLAP_FLOOR}`,
          evidence: [
            `title "${input.renderedTitle}" shares ${shared}/${takeaway.size} content words with the confirmed takeaway "${input.confirmedTakeaway}"`,
          ],
          routedTo: "human-signoff",
        });
    }
  }

  return out;
}
