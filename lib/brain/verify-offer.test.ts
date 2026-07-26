import { test, expect } from "bun:test";
import { verifyOffer } from "./verify-offer";
import type { Offer } from "./offer";

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
