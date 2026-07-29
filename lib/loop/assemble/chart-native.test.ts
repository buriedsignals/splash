import { test, expect } from "bun:test";
import { assembleChartNative } from "./chart-native";
import type { ProductionBrief } from "../../core/production-brief";

const BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "line",
  format: "static",
  angle: {
    confirmedTakeaway: "Summer sea ice has lost a third of its extent",
    altInsight: "A line falling from 7 to 4.3 million square kilometres",
    unit: "million km²",
    emphasis: "2007",
  },
  dataCsv: "year,extent\n1979,7.0\n2025,4.3",
  attribution: "NSIDC Sea Ice Index",
  sourceUrl: "https://nsidc.org/data/seaice_index",
};

test("the assembled spec is exactly the shape produce has always rendered", () => {
  const r = assembleChartNative(BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value).toEqual({
    nativeType: "line",
    title: "Summer sea ice has lost a third of its extent",
    altInsight: "A line falling from 7 to 4.3 million square kilometres",
    unit: "million km²",
    source: {
      name: "NSIDC Sea Ice Index",
      url: "https://nsidc.org/data/seaice_index",
    },
    highlight: "2007",
    format: "static",
    data: "year,extent\n1979,7.0\n2025,4.3",
  });
});

test("no url, no unit, no emphasis, no beats — the optional fields stay absent, not empty", () => {
  const r = assembleChartNative({
    ...BRIEF,
    sourceUrl: undefined,
    angle: { confirmedTakeaway: "t", altInsight: "a" },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const spec = r.value as Record<string, unknown>;
  expect(spec.source).toEqual({ name: "NSIDC Sea Ice Index" });
  expect("highlight" in spec).toBe(false);
  expect("beats" in spec).toBe(false);
  expect(spec.unit).toBe("");
});

test("carries the run's language onto the engine spec", () => {
  const r = assembleChartNative({ ...BRIEF, lang: "de" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as { lang?: string }).lang).toBe("de");
});

test("omits lang entirely when the run has none — byte-identical to before", () => {
  const r = assembleChartNative(BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect("lang" in (r.value as object)).toBe(false);
});

test("the moved assembler produces the spec the pre-move code produced, field for field", () => {
  // The expected object is the one recorded from the pre-move implementation, pasted here
  // rather than recomputed: a regression proof compares against HISTORY, not against itself.
  const r = assembleChartNative(BRIEF);
  expect(r.ok && JSON.stringify(r.value)).toBe(
    JSON.stringify({
      nativeType: "line",
      title: "Summer sea ice has lost a third of its extent",
      altInsight: "A line falling from 7 to 4.3 million square kilometres",
      unit: "million km²",
      source: {
        name: "NSIDC Sea Ice Index",
        url: "https://nsidc.org/data/seaice_index",
      },
      highlight: "2007",
      format: "static",
      data: "year,extent\n1979,7.0\n2025,4.3",
    }),
  );
});
