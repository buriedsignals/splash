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

test("the element's requested format reaches the brain — every option honours it", () => {
  const m = run(["2019", "2024"]);
  m.elements[0]!.requestedFormat = "video";
  const { options } = propose(m);
  expect(options.length).toBeGreaterThan(0);
  expect(options.every((o) => o.format === "video")).toBe(true);
});

// lib/loop/propose.ts used to drop `offer.refusal` on the floor — the brain names the exact
// reason a requested format was refused, and this layer's return type simply had no slot for
// it, so a refused offer arrived at the caller looking identical to "nothing to offer" (empty
// options, no sentence). This is the silent degradation the whole slice exists to remove.
test("a refusal computed by the brain arrives at propose()'s caller, with its sentence", () => {
  const m = run(["2019", "2024"]);
  m.elements[0]!.requestedFormat = "scrolly";
  const { options, refusal } = propose({ ...m, channel: "social-vertical" });
  expect(options).toEqual([]);
  expect(refusal).toBeTruthy();
  expect(refusal).toContain("social-vertical");
  expect(refusal).toContain("scrolly");
});

test("a print deliverable is offered static forms only, and never through Datawrapper", () => {
  const m = run(["2019", "2024"]);
  const withPrint: RunManifest = {
    ...m,
    elements: [
      {
        ...m.elements[0]!,
        deliverable: { destination: "print" },
        requestedFormat: "static",
      },
    ],
  };
  const { options, excluded } = propose(withPrint, undefined, withPrint.elements[0]);
  expect(options.length).toBeGreaterThan(0);
  for (const o of options) {
    expect(o.format).toBe("static");
    expect(o.engine).not.toBe("dw-chart");
    expect(o.engine).not.toBe("map-dw");
  }
  expect(excluded.map((e) => e.reason).join(" | ")).toMatch(/print/i);
});

test("two deliverables of one run are offered at their own channels", () => {
  const m = run(["2019", "2024"]);
  const web = { ...m.elements[0]!, deliverable: { destination: "article-web" as const } };
  const social = {
    ...m.elements[0]!,
    id: "e2",
    deliverableOf: "e1",
    deliverable: { destination: "social" as const, aspect: "portrait" as const },
  };
  const two: RunManifest = { ...m, elements: [web, social] };
  const webOffer = propose(two, undefined, web);
  const socialOffer = propose(two, undefined, social);
  // article-web is the only channel that carries an interactive; a Stories post cannot.
  expect(socialOffer.options.every((o) => o.format !== "interactive")).toBe(true);
  expect(socialOffer.options.every((o) => o.format !== "scrolly")).toBe(true);
  expect(webOffer.options.length).toBeGreaterThan(0);
});
