import { test, expect } from "bun:test";
// The same side-effect import lib/brain/eligibility.test.ts and lib/brain/offer.test.ts use:
// the KB's `renderableSheets()` filters through lib/core/registry, empty until an engine
// self-registers on import.
import "./engines";
import { propose } from "./propose";
import type { RunManifest } from "./manifest";

function run(numericColumns: string[], rowCount = 8): RunManifest {
  return {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["label", ...numericColumns],
        numericColumns,
        rowCount,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Les écarts se creusent entre 2019 et 2024",
          altInsight: "…",
          unit: "CHF",
        },
      },
    ],
    events: [],
  };
}

test("it offers forms with an engine, a format and their grounding", () => {
  const { options } = propose(run(["2019", "2024"]));
  expect(options.length).toBeGreaterThan(0);
  expect(options.length).toBeLessThanOrEqual(3);
  for (const o of options) {
    expect(o.engine).toBeTruthy();
    expect(o.format).toBeTruthy();
    expect(o.whySource!.fragments.length).toBeGreaterThan(0);
  }
});

test("it reports what it discarded", () => {
  const { excluded } = propose(run(["2019", "2024"], 400));
  expect(excluded.length).toBeGreaterThan(0);
});

test("nothing before orient has run", () => {
  const m = run(["2019", "2024"]);
  const { options, excluded } = propose({ ...m, orient: undefined });
  expect(options).toEqual([]);
  expect(excluded).toEqual([]);
});

test("the channel constrains the offer", () => {
  const m = run(["2019", "2024"]);
  const { options } = propose({ ...m, channel: "social-vertical" });
  expect(options.every((o) => o.format !== "interactive")).toBe(true);
});
