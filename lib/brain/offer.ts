// What the desk puts on the table: a few ranked forms, each carrying the material a why is
// written from, plus what was discarded and why. It offers — it never chooses (P1).
import type { Intent } from "./intents";
import {
  eligible,
  type Candidate,
  type EligibilityInput,
  type Excluded,
} from "./eligibility";
import { rank } from "./rank";
import type { RenderableSheet } from "./typology";
import {
  DELIVERABLE_KIND,
  type DeliverableKind,
  type VisualFormat,
} from "../core/vocabulary";
import type { ReadinessStatus } from "../newsroom/readiness";

export type OfferOption = {
  id: string;
  nativeType: string;
  engine: string;
  format: VisualFormat;
  intent: Intent[];
  requires?: string[];
  readiness?: { status: ReadinessStatus; reason: string };
  /** Render limits this pairing DECLARES (see Candidate.limits) — carried through unchanged so
   *  the offer shows the same sentence the journalist would meet at a later refusal. */
  limits?: string[];
  whySource: {
    sheet: string;
    fragments: string[];
    facts: Record<string, string>;
  };
};

export type Offer = {
  options: OfferOption[];
  excluded: Excluded[];
  refusal?: string;
};

const DEFAULT_MAX = 3;

export function buildOffer(
  input: EligibilityInput & { intents: Intent[]; max?: number },
  pairs?: RenderableSheet[],
): Offer {
  const { eligible: legal, excluded, refusal } = eligible(input, pairs);
  const ordered = rank(legal, input.intents);
  const max = input.max ?? DEFAULT_MAX;
  const options: OfferOption[] = [];
  const seen = new Set<string>();
  const kinds = new Set<DeliverableKind>();
  const take = (c: Candidate) => {
    seen.add(c.id);
    kinds.add(DELIVERABLE_KIND[c.format]);
    options.push(toOption(c, input));
  };
  // Fill every row but the last by the plain rule: one row per FORM, best-ranked first. Two
  // rows of the same form would also break `chosenId`, which resolves by id alone
  // (lib/loop/manifest.ts:156, lib/loop/produce.ts:56) and would silently pick the first.
  for (const c of ordered) {
    if (options.length >= max - 1) break;
    if (seen.has(c.id)) continue;
    take(c);
  }
  // THE RESERVED ROW. Without it the offer is mono-format: the ranking's last tie-break puts
  // interactive ahead of static ahead of video, so on article-web all three rows were
  // interactive and on a social channel all three were static — 20 legal, unmarked, actually
  // buildable video candidates never surfaced. What separates rows for a journalist is not the
  // format but what they walk away with (an embeddable element, an mp4, a whole narrative
  // page), so the last row goes to the best-ranked candidate of a kind not already on the
  // table. If there is none, it falls back to the plain rule — the offer never shrinks because
  // of the reservation.
  if (options.length < max) {
    const reserved = ordered.find(
      (c) => !seen.has(c.id) && !kinds.has(DELIVERABLE_KIND[c.format]),
    );
    const fallback = ordered.find((c) => !seen.has(c.id));
    const last = reserved ?? fallback;
    if (last) take(last);
  }
  return { options, excluded, ...(refusal ? { refusal } : {}) };
}

function toOption(c: Candidate, input: EligibilityInput): OfferOption {
  return {
    id: c.id,
    nativeType: c.key,
    engine: c.engine,
    format: c.format,
    intent: c.sheet.intent,
    ...(c.requires ? { requires: c.requires } : {}),
    ...(c.readiness ? { readiness: c.readiness } : {}),
    ...(c.limits ? { limits: c.limits } : {}),
    whySource: {
      sheet: c.sheet.sheetPath,
      // The ONLY prose the model may draw on: the sheet's own words for what this form is
      // good at, and what it is not.
      fragments: [...c.sheet.bestFor, ...c.sheet.notFor],
      facts: {
        rows: String(input.facts.rows),
        series: String(input.facts.series),
        points: String(input.facts.points),
        ...(input.facts.numericColumns.length
          ? { measures: input.facts.numericColumns.join(", ") }
          : {}),
      },
    },
  };
}
