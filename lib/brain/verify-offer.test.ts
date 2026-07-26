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
        },
      ],
      OFFER,
    ),
  ).not.toThrow();
});

test("an option the brain never offered is refused", () => {
  expect(() =>
    verifyOffer([{ id: "sankey", why: "joli" }, ...[]], OFFER),
  ).toThrow(/not offered|sankey/i);
});

test("a discarded form presented as offered is refused", () => {
  expect(() =>
    verifyOffer([{ id: "pie", why: "un camembert" }], OFFER),
  ).toThrow(/discarded|pie/i);
});

test("reordering is refused — the ranking is not the model's to change", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "dumbbell", why: "l'écart aux deux bouts" },
        { id: "slope", why: "la pente entre deux dates" },
      ],
      OFFER,
    ),
  ).toThrow(/order/i);
});

test("a number that is in neither the facts nor the offer is refused", () => {
  expect(() =>
    verifyOffer([{ id: "slope", why: "La pente couvre 26 cantons." }], OFFER),
  ).toThrow(/26/);
});

test("a marked form phrased as if it were ready is refused", () => {
  expect(() =>
    verifyOffer(
      [
        { id: "slope", why: "8 cantons, 2 dates." },
        { id: "dumbbell", why: "Marque l'écart aux deux bouts." }, // says nothing about the gap
      ],
      OFFER,
    ),
  ).toThrow(/readiness|marked/i);
});
