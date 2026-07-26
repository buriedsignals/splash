import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { advance } from "./driver";
import { revise } from "./revise";
import {
  nextActions,
  provenanceHash,
  stalenessOf,
  writeManifest,
  readManifest,
  type RunManifest,
} from "./manifest";
import { freezeInput } from "./freeze";
import { resumeReport } from "./resume";
import type { Decor } from "../newsroom/decor";
import { registerAllPublishers } from "../delivery";
import { resetPublishersForTest } from "../core/publishers";

// The deliver branch dispatches through the publish verb's registry, same discipline as
// deliver.test.ts: bun test shares one process across files, so re-register here rather than
// depend on this file happening to run after one that already did.
beforeEach(() => {
  resetPublishersForTest();
  registerAllPublishers();
});

// A decor with nothing to check against the real filesystem: `advance()` defaults to
// `tryLoadDecor()`, which reads this checkout's own root — every test in this file passes
// this instead, so `bun test` can never depend on (or migrate) the real install's
// .env / newsroom.json, even on a machine carrying a legacy `.splash-runtime` with no
// `newsroom.json` yet. `tryLoadDecor()`'s own never-throws contract (success and thrown-
// resolver, both) is covered directly in decor.test.ts.
const NEUTRAL_DECOR: Decor = {
  root: "/nowhere",
  state: {
    schemaVersion: 1,
    runtime: "claude",
    uiLang: "en",
    capabilities: {},
  },
  language: { ui: "en", content: "en" },
  readiness: [],
  profile: { lang: "en" },
};

test("full loop: orient → (human) → propose → (human) → produce → revise → produce, state always coherent", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-e2e-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "e2e",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };

  run = await advance(run, runDir, NEUTRAL_DECOR); // orient
  expect(run.orient!.supportsPoint).toBe(true);
  expect(nextActions(run)).toEqual(["confirm-angle"]);

  // human turn: author the angle
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
      },
    ],
  };
  expect(nextActions(run)).toEqual(["propose"]);

  run = await advance(run, runDir, NEUTRAL_DECOR); // propose
  expect(run.elements[0].proposal!.options.length).toBeGreaterThan(0);
  expect(nextActions(run)).toEqual(["choose-form"]);

  // human turn: choose a form — from the brain's real offer, not a hard-coded id, since the
  // offer itself now comes from the brain rather than a fixed slope/dumbbell rule. "bump" is
  // skipped deliberately: it has no declared limits.maxSeries/maxCategories, so it wins the
  // ranking's fill tie-break on almost any dataset, but chart-native's own WCAG contrast snap
  // gate currently refuses to render it for this fixture (label-on-fill contrast) — a
  // pre-existing chart-native defect, unrelated to and out of scope for this wiring task.
  const chosenOption =
    run.elements[0].proposal!.options.find((o) => o.id !== "bump") ??
    run.elements[0].proposal!.options[0]!;
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        proposal: { ...run.elements[0].proposal!, chosenId: chosenOption.id },
      },
    ],
  };
  expect(nextActions(run)).toEqual(["produce"]);

  run = await advance(run, runDir, NEUTRAL_DECOR); // produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);
  expect(nextActions(run)).toEqual(["show"]);

  // back-edge: seeing the visual, the journalist changes the emphasis
  run = {
    ...run,
    elements: [
      revise(run.elements[0], { kind: "emphasis", emphasis: "Genève" }),
    ],
  };
  expect(stalenessOf(run, run.elements[0])).toBe(true); // never shown as current while stale
  expect(nextActions(run)).toEqual(["produce"]);

  run = await advance(run, runDir, NEUTRAL_DECOR); // re-produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);
  expect(nextActions(run)).toEqual(["show"]);
}, 90000);

// Issue #8: the run dir must travel entire at handoff. Produce an artifact, copy the WHOLE
// run dir to an unrelated path (as a journalist reopening on another machine would), and
// confirm the artifact still resolves — proving the stored path is run-dir-relative, not
// absolute.
test("run dir handoff: copying the entire run dir elsewhere still resolves the artifact", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-handoff-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "handoff",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };

  run = await advance(run, runDir, NEUTRAL_DECOR); // orient
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
      },
    ],
  };
  run = await advance(run, runDir, NEUTRAL_DECOR); // propose
  // "bump" is skipped deliberately — see the full-loop test above for why.
  const handoffOption =
    run.elements[0].proposal!.options.find((o) => o.id !== "bump") ??
    run.elements[0].proposal!.options[0]!;
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        proposal: {
          ...run.elements[0].proposal!,
          chosenId: handoffOption.id,
        },
      },
    ],
  };
  run = await advance(run, runDir, NEUTRAL_DECOR); // produce
  expect(stalenessOf(run, run.elements[0])).toBe(false);

  writeManifest(join(runDir, "run.json"), run);

  const newRunDir = mkdtempSync(join(tmpdir(), "loop-handoff-copy-"));
  cpSync(runDir, newRunDir, { recursive: true });

  const reopened = readManifest(join(newRunDir, "run.json"), newRunDir);
  const report = resumeReport(reopened, newRunDir);
  expect(report.elements[0].validation.artifact).toBe("ok");
}, 90000);

test("advance() records a produce failure as a bounded event without advancing state", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-broken-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "broken",
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
  expect(nextActions(run)).toEqual(["produce"]);

  const after = await advance(run, runDir, NEUTRAL_DECOR);

  expect(after.events.length).toBe(1);
  expect(after.events[0].kind).toBe("failure");
  expect(after.elements[0].artifact).toBeUndefined(); // state did not advance
  expect(nextActions(after)).toEqual(["produce"]);
}, 30000);

// Regression: an unreadable FROZEN INPUT is a bounded failure, not an exception. produce()
// read the frozen CSV with an unguarded readFileSync, so a run dir missing its input threw
// ENOENT straight out of advance() — past the driver, which no longer catches anything
// because the verb contract promises never to throw. The failure event is the contract.
test("advance() records a MISSING FROZEN INPUT as a bounded failure, never a throw", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-missing-input-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const frozen = freezeInput(runDir, src, "data");
  const run: RunManifest = {
    runId: "missing-input",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: frozen },
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
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
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
  expect(nextActions(run)).toEqual(["produce"]);

  // The run dir travelled without its frozen input (a partial copy, a cleaned temp dir).
  rmSync(join(runDir, frozen.path));

  const after = await advance(run, runDir, NEUTRAL_DECOR);

  expect(after.events.length).toBe(1);
  expect(after.events[0].kind).toBe("failure");
  expect(after.events[0].action).toBe("produce");
  expect(after.events[0].message).toContain("frozen input");
  expect(after.elements[0].artifact).toBeUndefined(); // state did not advance
  expect(nextActions(after)).toEqual(["produce"]);
}, 30000);

// A run whose frozen input is referenced by the manifest but gone from disk — the shape a
// run takes when its directory is moved, restored partially, or hand-edited. No orient
// yet, so nextActions() routes to `orient`.
function makeRunMissingFrozenInput(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-missing-input-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const data = freezeInput(runDir, src, "data");
  rmSync(join(runDir, data.path)); // the manifest still points at it
  return {
    run: {
      runId: "missing-input",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data },
      elements: [{ id: "e1" }],
      events: [],
    },
    runDir,
  };
}

test("a missing frozen input at the orient step is a bounded event, not a throw", async () => {
  // Same guarantee the produce step already has. Build a run whose frozen data file has
  // been removed, with NO orient yet so nextActions() routes to `orient`.
  const { run, runDir } = makeRunMissingFrozenInput();
  const after = await advance(run, runDir, NEUTRAL_DECOR);
  expect(after.orient).toBeUndefined();
  const failures = after.events.filter((e) => e.kind === "failure");
  expect(failures).toHaveLength(1);
  expect(failures[0].action).toBe("orient");
  expect(failures[0].message).toMatch(/ENOENT|cannot read/i);
});

// `elements: []` is VALID per RunManifestSchema (lib/loop/manifest.ts) and nextActions()
// routes such a run to `orient` regardless — so the orient guard's own failure event has to
// survive a run with no live element. It built `elementId: run.elements[0].id`.
test("a run with no elements orients without throwing, and its failure event carries no elementId", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-no-elements-"));
  const after = await advance(
    {
      runId: "no-elements",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
    },
    runDir,
    NEUTRAL_DECOR,
  );
  const failures = after.events.filter((e) => e.kind === "failure");
  expect(failures).toHaveLength(1);
  expect(failures[0].action).toBe("orient");
  expect(failures[0].message).toContain("frozen data input");
  expect(failures[0].elementId).toBeUndefined();
  expect(after.orient).toBeUndefined();
});

// Every element-driven branch reads elements[0]. `produce` is unreachable with an empty
// elements array today (nextActions routes to confirm-angle), but the branch must not depend
// on that routing detail to be safe.
// This mirrors production shape (a proposal built against a decor), still through
// NEUTRAL_DECOR: `advance()`'s real default parameter resolves this install's own root via
// tryLoadDecor, which cannot throw — but exercising that for real here would make `bun test`
// depend on (and possibly migrate) whatever install root happens to run it. That never-throws
// contract is covered directly in decor.test.ts instead.
test("advance() builds a proposal annotated against a decor, and never throws doing it", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-default-decor-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "default-decor",
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
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
      },
    ],
    events: [],
  };
  expect(nextActions(run)).toEqual(["propose"]);

  const after = await advance(run, runDir, NEUTRAL_DECOR);

  const options = after.elements[0].proposal!.options;
  // Which forms the brain picks is its own business (lib/brain/rank.test.ts covers that) —
  // this test only cares that advance() threads a real offer through, never an empty or
  // thrown one.
  expect(options.length).toBeGreaterThan(0);
  // Annotated against a real decor, or unannotated under the neutral fallback — never a
  // dropped option, and never a throw. The status itself is the machine's business.
  for (const o of options)
    if (o.readiness)
      expect(["ready", "missing", "unverified", "disabled"]).toContain(
        o.readiness.status,
      );
});

test("the element-driven branches never dereference a missing element", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-no-elements-2-"));
  const oriented: RunManifest = {
    runId: "no-elements-oriented",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: {},
    orient: {
      profile: { columns: ["a"], numericColumns: [], rowCount: 1 },
      supportsPoint: true,
    },
    elements: [],
    events: [],
  };
  expect(nextActions(oriented)).toEqual(["confirm-angle"]);
  const after = await advance(oriented, runDir, NEUTRAL_DECOR);
  expect(after).toEqual(oriented); // a human turn, returned untouched
});

// Task 9's own deliverable (the `deliver` case in advance()'s switch) had no coverage of its
// own — every assertion above exercises produce, not deliver. Builds a manifest whose live
// element already carries a fresh artifact plus a requested destination, so nextActions()
// routes straight to "deliver" without going through the rest of the loop first.
function deliverableRun(runDir: string): {
  run: RunManifest;
  el: RunManifest["elements"][0];
} {
  mkdirSync(join(runDir, "elements", "e1"), { recursive: true });
  writeFileSync(join(runDir, "elements", "e1", "static.png"), "not-a-real-png");
  const base: RunManifest = {
    runId: "deliver-branch",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "T", altInsight: "A", unit: "u" },
        proposal: {
          options: [{ id: "o1", nativeType: "line", why: "w" }],
          excluded: [],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  };
  const el = base.elements[0]!;
  const artifact = {
    path: "elements/e1/static.png",
    sha256: "d",
    provenanceHash: provenanceHash(base, el),
    producedAt: "1980-01-01T00:00:00.000Z",
  };
  return { run: base, el: { ...el, artifact } };
}

test("advance() delivers a requested destination, merging the delivery record onto the element", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-deliver-ok-"));
  const { run: base, el } = deliverableRun(runDir);
  const run: RunManifest = {
    ...base,
    elements: [{ ...el, delivery: { requested: ["zip"], delivered: [] } }],
  };
  expect(nextActions(run)).toEqual(["deliver"]);

  const decorWithZip: Decor = {
    ...NEUTRAL_DECOR,
    state: { ...NEUTRAL_DECOR.state, capabilities: { zip: { enabled: true } } },
  };
  const after = await advance(run, runDir, decorWithZip);

  expect(after.events).toHaveLength(0); // no bounded failure recorded
  const delivered = after.elements[0].delivery!.delivered;
  expect(delivered).toHaveLength(1);
  expect(delivered[0]).toMatchObject({ publisherId: "zip", kind: "package" });
  expect(nextActions(after)).toEqual(["show"]);
});

test("advance() records a deliver failure as a bounded event, without advancing the element's delivery", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-deliver-fail-"));
  const { run: base, el } = deliverableRun(runDir);
  // "embed-fly" is DECLARED in NEWSROOM_CAPABILITIES but not yet implemented — readiness
  // refuses it deterministically, with no dependency on credentials or the network, so this
  // failure path can't flake on whatever happens to be in the real environment. (embed-s3
  // used to be this case; it is implemented now, so its refusal here would come from
  // `enabled !== true`, not from the declared-but-unimplemented branch this test means to
  // exercise.)
  const run: RunManifest = {
    ...base,
    elements: [
      { ...el, delivery: { requested: ["embed-fly"], delivered: [] } },
    ],
  };
  expect(nextActions(run)).toEqual(["deliver"]);

  const after = await advance(run, runDir, NEUTRAL_DECOR);

  expect(after.events).toHaveLength(1);
  expect(after.events[0]).toMatchObject({
    kind: "failure",
    action: "deliver",
    elementId: "e1",
  });
  expect(after.elements[0].delivery!.delivered).toHaveLength(0); // state did not advance
  expect(nextActions(after)).toEqual(["deliver"]); // still pending, unresolved
});
