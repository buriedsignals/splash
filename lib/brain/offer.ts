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
import type { VisualFormat } from "../core/vocabulary";
import type { ReadinessStatus } from "../newsroom/readiness";

export type OfferOption = {
  id: string;
  nativeType: string;
  engine: string;
  format: VisualFormat;
  intent: Intent[];
  requires?: string[];
  readiness?: { status: ReadinessStatus; reason: string };
  whySource: {
    sheet: string;
    fragments: string[];
    facts: Record<string, string>;
  };
};

export type Offer = { options: OfferOption[]; excluded: Excluded[] };

const DEFAULT_MAX = 3;

export function buildOffer(
  input: EligibilityInput & { intents: Intent[]; max?: number },
  pairs?: RenderableSheet[],
): Offer {
  const { eligible: legal, excluded } = eligible(input, pairs);
  const ordered = rank(legal, input.intents);
  const options: OfferOption[] = [];
  const seen = new Set<string>();
  for (const c of ordered) {
    // One row per FORM, not per format: the ranking already put that form's best format
    // first, and offering the same form three times would bury the other forms.
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    options.push(toOption(c, input));
    if (options.length === (input.max ?? DEFAULT_MAX)) break;
  }
  return { options, excluded };
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
