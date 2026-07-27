import { test, expect } from "bun:test";
import { assertProseGrounded, figuresIn, ungroundedFigures } from "./prose";

const ARTICLE =
  "En 2024, la commune a enregistré 12 permis de construire, contre 30 l'année précédente. " +
  "Le budget des travaux atteint 17 600 euros par logement, soit 3,5 % du total.";

test("should ground a figure quoted verbatim in the article", () => {
  expect(ungroundedFigures(ARTICLE, "12 permis en 2024")).toEqual([]);
});

test("should refuse a figure derived from quoted figures", () => {
  // 12 + 30 = 42. The sum is arithmetically true and evidentially new: Splash re-presents a
  // prose figure, it does not compute with it.
  expect(ungroundedFigures(ARTICLE, "42 permis au total")).toEqual(["42"]);
});

test("should refuse a share the article never states", () => {
  expect(ungroundedFigures(ARTICLE, "soit 40 % de baisse")).toEqual(["40"]);
});

test("should read a french thousands-separated figure as one number", () => {
  expect(figuresIn("17 600 euros")).toEqual(["17600"]);
  expect(ungroundedFigures(ARTICLE, "17 600 euros par logement")).toEqual([]);
  // The same figure written without the separator is the same figure.
  expect(ungroundedFigures(ARTICLE, "17600 euros")).toEqual([]);
});

test("should collapse every thousands separator french typography uses", () => {
  // U+0020, U+00A0, U+202F — the narrow no-break space is what Intl and Datawrapper emit for fr.
  expect(figuresIn("17\u0020600")).toEqual(["17600"]);
  expect(figuresIn("17\u00a0600")).toEqual(["17600"]);
  expect(figuresIn("17\u202f600")).toEqual(["17600"]);
});

test("should treat a comma decimal and a period decimal as the same figure", () => {
  expect(ungroundedFigures(ARTICLE, "3.5 % du total")).toEqual([]);
  expect(figuresIn("3,5")).toEqual(["3.5"]);
});

test("should accept several rendered strings at once", () => {
  expect(ungroundedFigures(ARTICLE, ["12", "30", "3,5 %", "1968"])).toEqual([
    "1968",
  ]);
});

test("should report each ungrounded figure once, in order", () => {
  expect(ungroundedFigures(ARTICLE, "44 puis 44 puis 51")).toEqual([
    "44",
    "51",
  ]);
});

test("should throw naming the ungrounded figure", () => {
  expect(() => assertProseGrounded(ARTICLE, "42 permis")).toThrow(/42/);
  expect(() => assertProseGrounded(ARTICLE, "12 permis")).not.toThrow();
});
