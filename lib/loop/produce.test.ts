import { test, expect } from "bun:test";
import {
  existsSync,
  statSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce, assembleNativeSpec } from "./produce";
import { provenanceHash, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";
import { draftBeats, applyBeats } from "./beats";
import { narrativeBeatErrors } from "../../skills/chart-native/src/chart-story";
import { rmSync } from "node:fs";

test("produce renders a real static PNG through the chart-native seam", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // Every run that reaches a render declares what its data IS (lib/source): a CSV the test
    // wrote into its own run dir is a `local` source — the file the journalist brought.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.",
          unit: "Monthly adult premium (CHF)",
          emphasis: "Genève",
        },
        proposal: {
          options: [
            { id: "slope", nativeType: "slope", why: "two points in time" },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  if (!result.ok) throw new Error(result.message);
  const after = result.value;
  const artifactAbs = join(runDir, after.artifact!.path);
  expect(after.artifact!.path).toBe(join("elements", "e1", "static.png"));
  expect(existsSync(artifactAbs)).toBe(true);
  expect(statSync(artifactAbs).size).toBeGreaterThan(5000);
  expect(after.artifact!.provenanceHash).toBe(
    provenanceHash(run, run.elements[0]),
  );
  expect(after.artifact!.sha256).toMatch(/^[0-9a-f]{64}$/);
}, 60000);

// A21 — end of the thread. The class the run declared has to arrive on the CONFIG the engine's
// conformance belt reads, not merely on the spec: the whole point is that one table decides the
// source rules at every layer, and a class that stops at the spec boundary decides nothing.
test("produce lands the declared source class on the rendered config", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-kind-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A PUBLIC source this time: the one class whose row demands a specific URL, so the belt
    // downstream is genuinely reading the requirements table rather than the flat old rule.
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "OFS",
        url: "https://www.bfs.admin.ch/asset/fr/12345",
      },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.",
          unit: "Monthly adult premium (CHF)",
          emphasis: "Genève",
        },
        proposal: {
          options: [
            { id: "slope", nativeType: "slope", why: "two points in time" },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  if (!result.ok) throw new Error(result.message);
  const config = JSON.parse(
    readFileSync(join(runDir, "elements", "e1", "config.json"), "utf8"),
  ) as { source: { name: string; url?: string; kind?: string } };
  expect(config.source.kind).toBe("public");
  expect(config.source.url).toBe("https://www.bfs.admin.ch/asset/fr/12345");
  rmSync(runDir, { recursive: true, force: true });
}, 60000);

// The manifest's proposal now records the FORMAT the brain offered (format threading,
// fix round 2/5) — before this, produce() hard-coded "static" regardless of what the
// chosen option promised, so an "interactive" offer silently delivered a static PNG: the
// manifest lied to the journalist about what they were given. This proves the promised
// format is what actually gets built, for the format chart-native's top offers on
// article-web most commonly carry.
test("produce renders the chosen option's own format, not a hard-coded static", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-interactive-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t-interactive",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // Every run that reaches a render declares what its data IS (lib/source): a CSV the test
    // wrote into its own run dir is a `local` source — the file the journalist brought.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.",
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "interactive",
              why: "two points in time",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  if (!result.ok) throw new Error(result.message);
  const after = result.value;
  // The recorded artifact path matches the format the manifest promised — an
  // interactive.html, not a static.png.
  expect(after.artifact!.path).toBe(join("elements", "e1", "interactive.html"));
  const artifactAbs = join(runDir, after.artifact!.path);
  expect(existsSync(artifactAbs)).toBe(true);
  expect(readFileSync(artifactAbs, "utf8")).toContain("<html");
}, 60000);

// The brain offers across engines, and today produce() only knows how to build through
// chart-native — wiring map-native / dw-chart / map-dw into this seam is a separate tranche.
// Before this guard, a chosen option naming another engine was silently rendered as if it
// were a chart-native spec (the option's nativeType handed to chart-native regardless of
// what engine it actually belongs to) — a WRONG artifact, not a missing one. A loud, typed
// refusal is the correct failure mode until that wiring exists.
test("produce refuses a chosen option whose engine is not chart-native, instead of rendering it wrong", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-wrong-engine-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,value\nGenève,449\nVaud,412");
  const run: RunManifest = {
    runId: "wrong-engine",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // Every run that reaches a render declares what its data IS (lib/source): a CSV the test
    // wrote into its own run dir is a `local` source — the file the journalist brought.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "value"],
        numericColumns: ["value"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Geneva pays more",
          altInsight: "Geneva's premium is higher than Vaud's.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "choropleth",
              nativeType: "choropleth",
              engine: "map-native",
              format: "static",
              why: "a map form",
            },
          ],
          excluded: [],
          chosenId: "choropleth",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("map-native");
  expect(result.message).toContain("static");
});

// A run whose chosen option's nativeType chart-native does not map. specToNativeConfig
// throws UnsupportedNativeType, produce-from-spec.mjs falls back with a distinct non-zero
// exit code — deterministic real subprocess rejection, not a stub.
function makeBrokenRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-broken-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "t-broken",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // Every run that reaches a render declares what its data IS (lib/source): a CSV the test
    // wrote into its own run dir is a `local` source — the file the journalist brought.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose",
          altInsight: "Between 2015 and 2024 the adult premium rose.",
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            {
              id: "bogus",
              nativeType: "not-a-real-native-type",
              why: "unsupported by design",
            },
          ],
          excluded: [],
          chosenId: "bogus",
        },
      },
    ],
    events: [],
  };
  return { run, runDir };
}

test("produce returns a descriptive typed failure and the caller logs a bounded event without advancing", async () => {
  const { run, runDir } = makeBrokenRun();
  const result = await produce(run, run.elements[0], runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message.length).toBeGreaterThan(0);
  // The element is untouched: a failure never advances state.
  expect(run.elements[0].artifact).toBeUndefined();
}, 30000);

// Structural, not textual: what must hold is that produce.ts owns no engine path of its
// own — it neither spawns a process nor IMPORTS skills/. So the import statements are
// parsed and checked as specifiers, rather than grepping the whole file for the substring
// "skills" (which any future comment mentioning a skills/ path would trip). That produce()
// actually reaches an engine through the verb is proven by the e2e tests above and by
// engines.test.ts, not by looking for the string "render(" in the source.
test("produce owns no engine path of its own — no subprocess, no skills/ import", () => {
  const src = readFileSync(join(import.meta.dir, "produce.ts"), "utf8");
  expect(src).not.toContain("execFileSync");

  const specifiers = [
    ...src.matchAll(/^import\s+(?:[^;'"]*?\sfrom\s+)?["']([^"']+)["']/gm),
  ].map((m) => m[1]);
  expect(specifiers.length).toBeGreaterThan(0);
  expect(specifiers.filter((s) => s.includes("skills"))).toEqual([]);
  // The registry wiring is reached through the loop's ONE composition root, never inlined.
  expect(specifiers).toContain("./engines");
});

test("a refused render becomes a typed failure, not a throw", async () => {
  const { run, runDir } = makeBrokenRun();
  const r = await produce(run, run.elements[0], runDir);
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("unreachable");
  expect(["engine-declined", "engine-failed"]).toContain(r.code);
}, 120_000);

// A chosen option can name engine "chart-native" and format "scrolly" — chart-native
// declares no "scrolly" format (it belongs to skills/scrolly, the shared mechanism that
// hosts a native engine's track; see lib/core/registry.ts's producerForFormat). Before
// this fix, produce.ts guarded on `chosen.engine` alone, so this option looked buildable
// (chart-native IS in LOOP_BUILDABLE_ENGINES) and was handed straight to chart-native,
// which refuses "scrolly" with its OWN engine-internal message — a different sentence
// than the one the brain's offer already marked it with (lib/brain/eligibility.ts). The
// invariant lib/loop/buildable.ts's header states is that the two must be the SAME
// sentence, so a journalist reads one story.
test("a chosen scrolly option is refused with the mark's own sentence, never handed to chart-native", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-scrolly-format-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t-scrolly-format",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // Every run that reaches a render declares what its data IS (lib/source): a CSV the test
    // wrote into its own run dir is a `local` source — the file the journalist brought.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.",
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            {
              id: "line",
              nativeType: "line",
              engine: "chart-native",
              format: "scrolly",
              why: "a trend over time",
            },
          ],
          excluded: [],
          chosenId: "line",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("not-implemented");
  expect(result.message).toContain("scrolly");
});

// --- the declared source is the credit ---------------------------------------------------
//
// produce.ts used to assemble `source: { name: "Provided by the newsroom" }` — a hard-coded
// placeholder, identical on every visual the loop has ever built, whatever the journalist
// actually brought. The attribution did not exist; it was simulated. These two tests are the
// two halves of closing that: what happens when nothing was declared, and what reaches the
// artifact when something was.

test("produce refuses a run that declared no source, instead of crediting a placeholder", async () => {
  // The deliberate behaviour change of this slice (design spec §4). A named default — the
  // placeholder, the newsroom's own name, "source not declared" — would make an undeclared run
  // and a declared one render IDENTICALLY, which is exactly the indistinction issue #7 opens
  // with, moved one step downstream. The refusal is a typed VerbResult, never a throw, and it
  // carries the domain code so a caller can tell it from any other invalid-request.
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-no-source-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "t-no-source",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight: "Premiums rose in both cantons shown.",
          unit: "CHF",
        },
        proposal: {
          options: [
            { id: "slope", nativeType: "slope", why: "two points in time" },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("invalid-request");
  expect(result.message).toContain("source-undeclared");
  // Nothing was written and nothing advanced.
  expect(run.elements[0].artifact).toBeUndefined();
  expect(existsSync(join(runDir, "elements", "e1", "static.png"))).toBe(false);
}, 30000);

test("the declared source reaches the produced artifact, and the placeholder is gone", async () => {
  // Measured on the DELIVERED file, not on the spec produce assembled: the whole point is what
  // a reader ends up looking at. (The rendered-DOM measurement of the same credit, plus the
  // staleness half, is lib/source/wiring-proof.test.ts — opt-in because it drives a browser.)
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-credit-"));
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  const run: RunManifest = {
    runId: "t-credit",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "Office fédéral de la santé publique",
        url: "https://www.bag.admin.ch/dam/bag/fr/dokumente/kuv-aufsicht/praemien/2024.csv",
      },
    },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown.",
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "interactive",
              why: "two points in time",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0], runDir);
  if (!result.ok) throw new Error(result.message);
  const html = readFileSync(join(runDir, result.value.artifact!.path), "utf8");
  expect(html).toContain("Office fédéral de la santé publique");
  expect(html).toContain(
    "https://www.bag.admin.ch/dam/bag/fr/dokumente/kuv-aufsicht/praemien/2024.csv",
  );
  expect(html).not.toContain("Provided by the newsroom");
}, 90000);

test("produce refuses a social deliverable whose aspect has not been confirmed", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-aspect-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "t",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        deliverable: { destination: "social" },
        angle: {
          confirmedTakeaway: "Premiums rose",
          altInsight: "…",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static",
              why: "w",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
  const result = await produce(run, run.elements[0]!, runDir);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe("invalid-request");
    // Never rendered at the run's article-web default: 9:16 or 1:1 is the journalist's answer.
    expect(result.message).toMatch(/aspect ratio/);
  }
});

// ---------------------------------------------------------------------------
// The narrative plan reaches the spec (article beats) — see docs/superpowers/specs/
// 2026-07-27-article-beats-design.md
// ---------------------------------------------------------------------------

const SEA_ICE =
  "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3";

function scrollyRunOnDisk(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-produce-beats-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, SEA_ICE);
  return {
    runDir,
    run: {
      runId: "t-beats",
      schemaVersion: 4,
      route: "article",
      channel: "article-web",
      input: { data: freezeInput(runDir, src, "data") },
      sources: {
        mode: "real",
        data: { kind: "public", label: "NSIDC Sea Ice Index" },
      },
      orient: {
        profile: {
          columns: ["year", "extent"],
          numericColumns: ["year", "extent"],
          rowCount: 7,
        },
        supportsPoint: true,
      },
      elements: [
        {
          id: "e1",
          angle: {
            confirmedTakeaway:
              "The Arctic's September sea ice has not recovered",
            altInsight:
              "September minimum sea-ice extent fell from 7 to 4.3 million km² between 1979 and 2025.",
            unit: "million km²",
          },
          proposal: {
            options: [
              {
                id: "line-scrolly",
                nativeType: "line",
                engine: "chart-native",
                format: "scrolly",
                why: "a series a reader can be walked through",
              },
            ],
            excluded: [],
            chosenId: "line-scrolly",
          },
        },
      ],
      events: [],
    },
  };
}

test("assembleNativeSpec threads the authored beats onto the spec", () => {
  const { run, runDir } = scrollyRunOnDisk();
  const drafted = draftBeats(run, run.elements[0]!, runDir);
  expect(drafted.ok).toBe(true);
  if (!drafted.ok) return;
  const withPlan: RunManifest = { ...run, elements: [drafted.value] };
  const authored = applyBeats(
    withPlan,
    "e1",
    drafted.value.narrative!.beats.map((b) => ({
      id: b.id,
      role: b.role,
      text: `Claim ${b.id}.`,
    })),
  );
  const spec = assembleNativeSpec(
    authored,
    authored.elements[0]!,
    SEA_ICE,
    "NSIDC Sea Ice Index",
  );
  expect(spec.beats).toBeDefined();
  expect(spec.beats!.map((b) => b.text)).toEqual(
    drafted.value.narrative!.beats.map((b) => `Claim ${b.id}.`),
  );
  // A LINE beat anchors on `x` — the shape narrativeBeatErrors accepts, never `category`.
  expect(spec.beats!.every((b) => typeof b.x === "string")).toBe(true);
  expect(spec.beats!.every((b) => b.category === undefined)).toBe(true);
  expect(spec.beats!.map((b) => b.role)).toEqual(
    drafted.value.narrative!.beats.map((b) => b.role),
  );
  // …and the engine agrees the plan is valid against the data it was drafted from.
  expect(narrativeBeatErrors(spec as never)).toEqual([]);
  rmSync(runDir, { recursive: true, force: true });
});

test("assembleNativeSpec leaves an element with no plan byte-identical — no `beats` key", () => {
  const { run, runDir } = scrollyRunOnDisk();
  const spec = assembleNativeSpec(
    run,
    run.elements[0]!,
    SEA_ICE,
    "NSIDC Sea Ice Index",
  );
  expect("beats" in spec).toBe(false);
  rmSync(runDir, { recursive: true, force: true });
});

// A21 — the engine is told WHAT the figures are, not only who to credit. The class the run
// declared (lib/source) reaches chart-native's conformance belt through the spec; without it,
// every chart the loop ever built was checked on the flat "name required, url optional" rule
// whatever its data actually was.
test("assembleNativeSpec carries the run's declared source class onto the spec", () => {
  const { run, runDir } = scrollyRunOnDisk();
  const spec = assembleNativeSpec(
    run,
    run.elements[0]!,
    SEA_ICE,
    "NSIDC Sea Ice Index",
    "https://nsidc.org/data/g02135",
    undefined,
    "public",
  );
  expect(spec.sourceKind).toBe("public");
  rmSync(runDir, { recursive: true, force: true });
});

test("assembleNativeSpec omits `sourceKind` when no class is passed — byte-identical spec", () => {
  const { run, runDir } = scrollyRunOnDisk();
  const spec = assembleNativeSpec(
    run,
    run.elements[0]!,
    SEA_ICE,
    "NSIDC Sea Ice Index",
  );
  expect("sourceKind" in spec).toBe(false);
  rmSync(runDir, { recursive: true, force: true });
});

test("produce refuses a walk whose beats nobody authored, naming them", async () => {
  const { run, runDir } = scrollyRunOnDisk();
  // A BUILDABLE form, so the refusal under test is the beats one and not the article branch's.
  // The guard is deliberately not format-gated: whatever created a plan, an unwritten one must
  // not be rendered.
  const buildable: RunManifest = {
    ...run,
    elements: [
      {
        ...run.elements[0]!,
        proposal: {
          ...run.elements[0]!.proposal!,
          options: [
            { ...run.elements[0]!.proposal!.options[0]!, format: "static" },
          ],
        },
      },
    ],
  };
  const drafted = draftBeats(buildable, buildable.elements[0]!, runDir);
  if (!drafted.ok) throw new Error(drafted.message);
  const r = await produce(
    { ...buildable, elements: [drafted.value] },
    drafted.value,
    runDir,
  );
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("beat-1");
  rmSync(runDir, { recursive: true, force: true });
});

// ORDER. lib/loop/buildable.ts's header states the invariant its three readers must hold: a
// journalist reads ONE sentence for a form nothing can build, the one the offer already marked
// it with. So the buildability refusal comes FIRST — telling someone to write their beats when
// their chosen form cannot be built at all sends them to fix the wrong thing.
test("a form nothing can build is refused with the offer's sentence, before its beats are judged", async () => {
  const { run, runDir } = scrollyRunOnDisk();
  const drafted = draftBeats(run, run.elements[0]!, runDir);
  if (!drafted.ok) throw new Error(drafted.message);
  const r = await produce(
    { ...run, elements: [drafted.value] },
    drafted.value,
    runDir,
  );
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("not-implemented");
  expect(r.message).toContain("scrolly");
  expect(r.message).not.toContain("beat-1");
  rmSync(runDir, { recursive: true, force: true });
});
