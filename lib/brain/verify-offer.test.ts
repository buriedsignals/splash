import { test, expect } from "bun:test";
import { verifyOffer } from "./verify-offer";
import { buildOffer, type Offer } from "./offer";
import { deriveFacts } from "./facts";
// renderableSheets() only sees a type once its engine has self-registered into
// lib/core/registry — same side-effect import eligibility.test.ts and offer.test.ts use.
import "../loop/engines";

// A real KB, spatial+magnitude dataset — ranks an interactive map-native row into the top-3
// offer, carrying the keyboard limit map-native declares on every interactive/scrolly pairing
// (skills/map-native/src/feature-limits.ts).
function inputForMapSymbolInteractive() {
  return {
    facts: deriveFacts({
      columns: ["city", "population"],
      numericColumns: ["population"],
      rowCount: 10,
    }),
    channel: "article-web" as const,
    intents: ["spatial" as const, "magnitude" as const],
  };
}

// A real KB chart-native dataset, pinned to `static` — chart-native has never registered a
// feature-reach limit, so every offered row here carries none.
function inputForChartStatic() {
  return {
    facts: deriveFacts({
      columns: ["canton", "2019", "2024"],
      numericColumns: ["2019", "2024"],
      rowCount: 8,
    }),
    channel: "article-web" as const,
    intents: ["change-over-time" as const],
    requestedFormat: "static" as const,
  };
}

const OFFER: Offer = {
  options: [
    {
      id: "slope",
      nativeType: "slope",
      engine: "chart-native",
      format: "static",
      intent: ["change-over-time"],
      whySource: {
        sheet: "chart/types/slope.md",
        fragments: ["a before/after across a handful of categories"],
        facts: { rows: "8", series: "8", points: "2" },
      },
    },
    {
      id: "dumbbell",
      nativeType: "dumbbell",
      engine: "chart-native",
      format: "static",
      intent: ["ranking"],
      readiness: { status: "missing", reason: "chart-native is not installed" },
      whySource: {
        sheet: "chart/types/dumbbell.md",
        fragments: ["the SIZE of the gap between two values"],
        facts: { rows: "8", series: "8", points: "2" },
      },
    },
  ],
  excluded: [{ id: "pie", reason: "8 categories — a pie takes at most 5" }],
};

test("a faithful phrasing passes", () => {
  expect(() =>
    verifyOffer(
      [
        {
          id: "slope",
          why: "Deux dates (2 points) pour 8 cantons : la pente montre qui monte et qui descend.",
        },
        {
          id: "dumbbell",
          why: "Marque l'écart aux deux bouts. Nécessite chart-native, qui n'est pas installé.",
          markAcknowledged: true,
        },
      ],
      OFFER,
    ),
  ).not.toThrow();
});

test("an option the brain never offered is refused", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "sankey", why: "joli" },
        {
          id: "dumbbell",
          why: "l'écart aux deux bouts",
          markAcknowledged: true,
        },
      ],
      OFFER,
    ),
  ).toThrow(/not offered|sankey/i);
});

test("a discarded form presented as offered is refused", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "pie", why: "un camembert" },
        { id: "slope", why: "la pente" },
        { id: "dumbbell", why: "l'écart", markAcknowledged: true },
      ],
      OFFER,
    ),
  ).toThrow(/discarded|pie/i);
});

test("reordering is refused — the ranking is not the model's to change", () => {
  expect(() =>
    verifyOffer(
      [
        {
          id: "dumbbell",
          why: "l'écart aux deux bouts",
          markAcknowledged: true,
        },
        { id: "slope", why: "la pente entre deux dates" },
      ],
      OFFER,
    ),
  ).toThrow(/order/i);
});

test("dropping an offered option — even down to an empty list — is refused as an order change, never a silent removal", () => {
  expect(() => verifyOffer([], OFFER)).toThrow(/order/i);
  expect(() =>
    verifyOffer([{ id: "slope", why: "la pente entre deux dates" }], OFFER),
  ).toThrow(/order/i);
});

test("a number that is in neither the facts nor the offer is refused, with both options phrased so nothing masks it", () => {
  // Both options are phrased, in the offered order, so the exact-match order check passes and
  // the number loop reaches every phrased option — the invented number on slope cannot hide
  // behind an incomplete phrasing (that would fail the order check first, for a different
  // reason, and mask this one).
  expect(() =>
    verifyOffer(
      [
        { id: "slope", why: "La pente couvre 26 cantons." },
        {
          id: "dumbbell",
          why: "Marque l'écart aux deux bouts. Nécessite chart-native, qui n'est pas installé.",
          markAcknowledged: true,
        },
      ],
      OFFER,
    ),
  ).toThrow(/26/);
});

test("a marked form phrased without acknowledging the mark is refused", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "slope", why: "8 cantons, 2 dates." },
        { id: "dumbbell", why: "Marque l'écart aux deux bouts." }, // no markAcknowledged
      ],
      OFFER,
    ),
  ).toThrow(/marked|acknowledge/i);
});

test("markAcknowledged on an option that carries no readiness is refused — there is no mark to acknowledge", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "slope", why: "8 cantons, 2 dates.", markAcknowledged: true },
        {
          id: "dumbbell",
          why: "l'écart aux deux bouts",
          markAcknowledged: true,
        },
      ],
      OFFER,
    ),
  ).toThrow(/not marked|acknowledge/i);
});

test("grouped thousands (8 000) ground against a fact written without the separator (8000)", () => {
  const bigOffer: Offer = {
    options: [
      {
        id: "slope",
        nativeType: "slope",
        engine: "chart-native",
        format: "static",
        intent: ["change-over-time"],
        whySource: {
          sheet: "chart/types/slope.md",
          fragments: ["a before/after across a handful of categories"],
          facts: { rows: "8000", series: "2", points: "2" },
        },
      },
    ],
    excluded: [],
  };
  expect(() =>
    verifyOffer(
      [{ id: "slope", why: "La pente couvre 8 000 lignes de données." }],
      bigOffer,
    ),
  ).not.toThrow();
});

// Task 21 — a declared render limit must be acknowledged in the phrasing, exactly like a
// readiness mark, but as a SEPARATE flag (a limit is not a mark — see eligibility.ts).
test("should refuse a phrasing that does not acknowledge a declared limit", () => {
  const offer = buildOffer(inputForMapSymbolInteractive());
  const phrased = offer.options.map((o) => ({
    id: o.id,
    why: "…",
    markAcknowledged: undefined,
  }));
  expect(() => verifyOffer(phrased as never, offer)).toThrow(
    /limitsAcknowledged/,
  );
});

test("should refuse the flag on an option that declares none", () => {
  const offer = buildOffer(inputForChartStatic());
  const phrased = offer.options.map((o) => ({
    id: o.id,
    why: "…",
    limitsAcknowledged: true,
  }));
  expect(() => verifyOffer(phrased as never, offer)).toThrow(
    /limitsAcknowledged/,
  );
});

test("a genuinely invented grouped number still throws", () => {
  const bigOffer: Offer = {
    options: [
      {
        id: "slope",
        nativeType: "slope",
        engine: "chart-native",
        format: "static",
        intent: ["change-over-time"],
        whySource: {
          sheet: "chart/types/slope.md",
          fragments: ["a before/after across a handful of categories"],
          facts: { rows: "8000", series: "2", points: "2" },
        },
      },
    ],
    excluded: [],
  };
  expect(() =>
    verifyOffer(
      [{ id: "slope", why: "La pente couvre 9 000 lignes de données." }],
      bigOffer,
    ),
  ).toThrow(/9000/);
});
