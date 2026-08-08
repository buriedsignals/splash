import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed before
// the run; `git checkout --` restored between them):
//   - resolving the date columns by header word (`/^(start|begin)/i`) instead of structurally
//     → "finds the interval structurally, not by the header word" FAILS on the French headers.
//   - dropping the end<start refusal → "refuses a row that runs backwards, by name" FAILS.
//   - taking the row label out of that message → the same test FAILS on /Land acquisition/.
//   - accepting three date columns (taking the first two) → "refuses a CSV it cannot tell the
//     interval from" FAILS.
//   - emitting the raw row order instead of the first-appearance category order → "derives the
//     workstreams in first-appearance order" FAILS.

const base: Omit<NativeSpec, "data"> = {
  nativeType: "gantt",
  title: "Riverton's flood defences will not be finished until 2028",
  unit: "flood-defence programme timeline",
  source: { name: "Riverton flood programme office" },
};

const spec = (data: string, extra: Partial<NativeSpec> = {}): NativeSpec =>
  ({ ...base, data, ...extra }) as NativeSpec;

const EN = `phase,start,end,workstream
Feasibility survey,2023-01,2023-06,Planning
Detailed design,2023-05,2023-12,Planning
Construction — east bank,2024-06,2026-06,Construction`;

describe("the gantt mapper — how a CSV declares an interval", () => {
  it("finds the interval structurally, not by the header word", () => {
    // The same CSV in French. A `start`/`end` word list would find nothing here — which is
    // exactly why there is not one.
    const fr = `phase,début,fin,chantier
Étude de faisabilité,2023-01,2023-06,Planification
Conception détaillée,2023-05,2023-12,Planification`;
    const { type, config } = specToNativeConfig(spec(fr, { lang: "fr" }));
    expect(type).toBe("gantt");
    const items = config.items as { label: string; start: string }[];
    expect(items[0]).toMatchObject({
      label: "Étude de faisabilité",
      start: "2023-01",
      end: "2023-06",
      category: "Planification",
    });
  });

  it("derives the workstreams in first-appearance order", () => {
    const { config } = specToNativeConfig(spec(EN));
    expect(config.categories).toEqual(["Planning", "Construction"]);
  });

  it("carries the time-axis caption, because length here is duration", () => {
    const { config } = specToNativeConfig(spec(EN));
    expect(config.unit).toBe("flood-defence programme timeline");
  });

  it("keeps the house hue off the bars", () => {
    // Furniture only: one hue over the bars would collapse the workstreams the colour encodes.
    const { config } = specToNativeConfig(spec(EN, { baseColor: "#009E73" }));
    expect(config.baseColor).toBe("#009E73");
    expect(config.items).toBeDefined();
  });

  it("refuses a row that runs backwards, by name", () => {
    const bad = `phase,start,end
Land acquisition,2024-08,2024-01
Detailed design,2023-05,2023-12`;
    expect(() => specToNativeConfig(spec(bad))).toThrow(/Land acquisition/);
    expect(() => specToNativeConfig(spec(bad))).toThrow(
      /ends before it starts/,
    );
  });

  it("refuses an ambiguous numeric date rather than picking a reading", () => {
    const bad = `phase,start,end
Land acquisition,03/04/2024,12/09/2024
Detailed design,04/04/2024,13/09/2024`;
    // Refused by the SHAPE floor (those columns are not dates at all under the big-endian
    // rule), so the journalist is told before the mapper even runs.
    expect(() => specToNativeConfig(spec(bad))).toThrow(/gantt/);
  });

  it("refuses a CSV it cannot tell the interval from", () => {
    const three = `phase,start,end,review,workstream
A,2023-01,2023-06,2023-03,Planning
B,2023-05,2023-12,2023-08,Planning`;
    expect(() => specToNativeConfig(spec(three))).toThrow(
      /exactly two date columns/,
    );
    // …and naming them settles it.
    const { config } = specToNativeConfig(
      spec(three, {
        ganttStart: "start",
        ganttEnd: "end",
        ganttCategory: "workstream",
      } as Partial<NativeSpec>),
    );
    expect((config.items as { label: string }[]).length).toBe(2);
    expect(config.categories).toEqual(["Planning"]);
  });

  it("refuses a named column that is not in the CSV", () => {
    expect(() =>
      specToNativeConfig(
        spec(EN, { ganttStart: "beginning" } as Partial<NativeSpec>),
      ),
    ).toThrow(/beginning/);
  });

  it("refuses a CSV with no interval in it at all", () => {
    const flat = `phase,budget
Planning,120
Construction,4200`;
    expect(() => specToNativeConfig(spec(flat))).toThrow(
      /needs a label column plus a START and an END/,
    );
  });
});
