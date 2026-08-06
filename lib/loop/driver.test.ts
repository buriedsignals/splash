import { test, expect, beforeEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  cpSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import {
  advance,
  advanceStep,
  boundEventMessage,
  MAX_EVENT_MESSAGE_CHARS,
} from "./driver";
import { revise } from "./revise";
import {
  nextActions,
  provenanceHash,
  stalenessOf,
  writeManifest,
  readManifest,
  type RunManifest,
  fileArtifact,
} from "./manifest";
import { freezeInput } from "./freeze";
import { applyPhrasing } from "./phrase";
import { applyBeats } from "./beats";
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
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
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
  // The brain hands over an offer with every `why` empty (propose.ts), so the loop asks for the
  // desk's turn BEFORE the journalist's: nobody chooses from an offer nobody wrote.
  expect(nextActions(run)).toEqual(["phrase"]);

  // desk turn: write each form's why from its own grounding, through the one sanctioned writer.
  run = applyPhrasing(
    run,
    "e1",
    run.elements[0].proposal!.options.map((o) => ({
      id: o.id,
      why: `${o.nativeType} reads this comparison directly`,
      ...(o.readiness ? { markAcknowledged: true as const } : {}),
    })),
  );
  expect(nextActions(run)).toEqual(["choose-form"]);

  // human turn: choose a form — the brain's own top-ranked offer, not a hard-coded id, since
  // the offer itself now comes from the brain rather than a fixed slope/dumbbell rule. This is
  // the property the loop promises: whatever the brain offers FIRST, production can build.
  const firstOfferedId = run.elements[0].proposal!.options[0]!.id;
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        proposal: { ...run.elements[0].proposal!, chosenId: firstOfferedId },
      },
    ],
  };
  expect(nextActions(run)).toEqual(["produce"]);

  run = await advance(run, runDir, NEUTRAL_DECOR); // produce
  expect(run.events).toEqual([]); // no bounded produce failure
  expect(run.elements[0].artifact).toBeDefined(); // the top offer actually rendered
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

// Issue #8: the run dir must travel entire at handoff. Produce an artifact, DELIVER it, copy
// the WHOLE run dir to an unrelated path (as a journalist reopening on another machine would),
// and confirm both the artifact AND the delivered package still resolve — proving the stored
// paths are run-dir-relative, not absolute, for produce.ts's own artifact and for deliver.ts's
// package alike (the property a produce/deliver directory collision would have broken: see
// lib/loop/deliver.test.ts's "re-producing an element after it was delivered…" regression).
test("run dir handoff: copying the entire run dir elsewhere still resolves the artifact and the delivered package", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-handoff-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "handoff",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
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
  // desk turn before the journalist's: this run is WRITTEN to disk below, and assertInvariants
  // refuses a choice made on an option nobody phrased.
  run = applyPhrasing(
    run,
    "e1",
    run.elements[0].proposal!.options.map((o) => ({
      id: o.id,
      why: `${o.nativeType} reads this comparison directly`,
      ...(o.readiness ? { markAcknowledged: true as const } : {}),
    })),
  );
  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        proposal: {
          ...run.elements[0].proposal!,
          chosenId: run.elements[0].proposal!.options[0]!.id,
        },
      },
    ],
  };
  run = await advance(run, runDir, NEUTRAL_DECOR); // produce
  expect(run.elements[0].artifact).toBeDefined(); // the top offer actually rendered
  expect(stalenessOf(run, run.elements[0])).toBe(false);

  run = {
    ...run,
    elements: [
      {
        ...run.elements[0],
        delivery: { requested: ["zip"], delivered: [] },
        // Publishing needs an approval covering these exact bytes (the verification chain).
        // This test's subject is the run dir travelling whole, not the approval ceremony —
        // which lib/loop/approve.test.ts and lib/host/journey.test.ts drive for real — so the
        // approval is declared here as the precondition it is.
        approved: {
          signoffPath: "signoffs/e1.json",
          approvedProvenanceHash: provenanceHash(run, run.elements[0]!),
        },
      },
    ],
  };
  const zipDecor: Decor = {
    ...NEUTRAL_DECOR,
    state: {
      ...NEUTRAL_DECOR.state,
      capabilities: { zip: { enabled: true } },
    },
  };
  run = await advance(run, runDir, zipDecor); // deliver
  expect(run.elements[0].delivery!.delivered.map((d) => d.publisherId)).toEqual(
    ["zip"],
  );

  writeManifest(join(runDir, "run.json"), run);

  const newRunDir = mkdtempSync(join(tmpdir(), "loop-handoff-copy-"));
  cpSync(runDir, newRunDir, { recursive: true });

  const reopened = readManifest(join(newRunDir, "run.json"), newRunDir);
  const report = resumeReport(reopened, newRunDir);
  expect(report.elements[0].validation.artifact).toBe("ok");

  const packageRec = reopened.elements[0]!.delivery!.delivered[0]!;
  expect(existsSync(join(newRunDir, packageRec.artifact!.path))).toBe(true);
}, 90000);

test("advance() records a produce failure as a bounded event without advancing state", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-broken-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "broken",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
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
    schemaVersion: 7,
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
      schemaVersion: 7,
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
      schemaVersion: 7,
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
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
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
  // Which forms the brain picks and ranks first is its own business (lib/brain/rank.test.ts
  // covers the ordering) — this test cares that advance() threads a real, USABLE offer
  // through: not empty, never a throw, and its top-ranked option is something production can
  // actually build (the property the driver exists to deliver on).
  expect(options.length).toBeGreaterThan(0);
  // Annotated against a real decor, or unannotated under the neutral fallback — never a
  // dropped option, and never a throw. The status itself is the machine's business.
  for (const o of options)
    if (o.readiness)
      expect(["ready", "missing", "unverified", "disabled"]).toContain(
        o.readiness.status,
      );

  const chosen = {
    ...after,
    elements: [
      {
        ...after.elements[0],
        proposal: { ...after.elements[0].proposal!, chosenId: options[0]!.id },
      },
    ],
  };
  const produced = await advance(chosen, runDir, NEUTRAL_DECOR);
  expect(produced.events).toEqual([]); // no bounded produce failure
  expect(produced.elements[0].artifact).toBeDefined();
}, 90000);

// lib/loop/propose.ts (task 9) carries a refusal computed by the brain (lib/brain/
// eligibility.ts, task 8) through its return value — but advance()'s "propose" case was the
// ONLY production caller of propose(), and it destructured just `{ options, excluded }`, with
// nowhere on RunElementSchema's `proposal` to put a refusal even if it had read one. A run
// driven through advance() persisted `options: []` indistinguishable from "nothing to offer" —
// the exact silent degradation this slice exists to remove.
test("advance() persists the brain's refusal on the element when the requested format is off-channel", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-refusal-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "refusal",
    schemaVersion: 7,
    route: "embed",
    channel: "social-vertical", // allows only static/video (lib/core/channel-policy.ts)
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
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
        requestedFormat: "scrolly", // not in social-vertical's allowed set
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

  expect(after.elements[0].proposal!.options).toEqual([]);
  expect(after.elements[0].proposal!.refusal).toBeTruthy();
  expect(after.elements[0].proposal!.refusal).toContain("social-vertical");
  expect(after.elements[0].proposal!.refusal).toContain("scrolly");
});

// A requestedFormat can be channel-legal (article-web carries scrolly) — this used to STRAND
// the run: every surviving candidate was a scrolly, and LOOP_BUILDABLE_ENGINES had no scrolly
// host, so choosing one and calling produce() refused forever while nextActionsForElement kept
// routing back to choose-form — no NextAction verb existed to get out (revise.ts's
// clear-requested-format was the escape that dead end needed; it is still covered on its own
// terms in revise.test.ts). Task 9 closes the dead end itself: scrolly composes whichever host
// engine's track the chosen nativeType belongs to, so a scrolly candidate is genuinely
// choosable now. This proves the strand is gone — requesting scrolly here is no longer a dead
// end reachable through advance(); it is the start of the narrative flow (draft-beats).
test("a channel-legal requested scrolly format is offered unstranded, and starts the narrative flow", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-scrolly-request-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "scrolly-request",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web", // scrolly IS allowed on this channel
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
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
        requestedFormat: "scrolly",
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

  run = await advance(run, runDir, NEUTRAL_DECOR); // propose
  const proposal = run.elements[0].proposal!;
  // The rows are OFFERED, and at least one of them CLEAN. Until 2026-07-28 every row here
  // carried a readiness note, because the whole-article-branch mark fired unconditionally on
  // format:"scrolly" — a mark whose sentence ("not built yet, and it changes what gets
  // delivered") was measured false end to end (lib/loop/scrolly-e2e.test.ts). What remains
  // marked is only what is genuinely unbuildable, per track.
  expect(proposal.options.length).toBeGreaterThan(0);
  expect(proposal.options.every((o) => o.format === "scrolly")).toBe(true);
  expect(proposal.refusal).toBeUndefined();
  expect(proposal.options.some((o) => !o.readiness)).toBe(true);

  const chosen = proposal.options.find((o) => o.engine === "chart-native")!;
  expect(chosen).toBeDefined();
  run = {
    ...run,
    elements: [
      { ...run.elements[0], proposal: { ...proposal, chosenId: chosen.id } },
    ],
  };
  // Not "choose-form" — the narrative flow starts instead of bouncing back to the offer.
  expect(nextActions(run)).toEqual(["draft-beats"]);
});

test("the element-driven branches never dereference a missing element", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-no-elements-2-"));
  const oriented: RunManifest = {
    runId: "no-elements-oriented",
    schemaVersion: 7,
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
    schemaVersion: 7,
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
  // Approved for exactly this provenance: publishing has a gate now (lib/loop/deliver.ts, the
  // verification chain in nextActions), and these two tests are about the DELIVER branch of
  // the driver, so they hand it an element a journalist has signed off on.
  return {
    run: base,
    el: {
      ...el,
      artifact,
      approved: {
        signoffPath: "signoffs/e1.json",
        approvedProvenanceHash: artifact.provenanceHash,
      },
    },
  };
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
  // "embed-nowhere" names no delivery capability at all — deliver() refuses it before any
  // credential or network check runs (the `!cap` branch, lib/loop/deliver.ts), so this
  // failure path can't flake on whatever happens to be in the real environment. (embed-s3
  // used to be usable for this; it is implemented now, so its refusal here would come from
  // `enabled !== true`. Fly.io, the registry's last declared-but-unimplemented capability,
  // was dropped — nothing in the real registry exercises that branch any more, only the local
  // NewsroomCapability stub in readiness.test.ts does.)
  const run: RunManifest = {
    ...base,
    elements: [
      { ...el, delivery: { requested: ["embed-nowhere"], delivered: [] } },
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

// --- advanceStep: the same step, reporting what it did ------------------------------------
//
// advance() records a refusal as a bounded EVENT and returns a manifest, so from the outside a
// refused produce is indistinguishable from a successful one. A host that loops on "advance
// until nextActions is empty" therefore spins forever, silently. advanceStep answers what ran
// and what it met; advance() is its wrapper, unchanged for every existing caller.

test("advanceStep names the deterministic step it ran", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-step-orient-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "step",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    elements: [{ id: "e1" }],
    events: [],
  };
  const outcome = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(outcome.ran).toBe("orient");
  expect(outcome.failure).toBeUndefined();
  expect(outcome.run.orient).toBeDefined();
});

test("advanceStep reports a human turn as nothing run, leaving the manifest untouched", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-step-human-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "human",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
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
    elements: [{ id: "e1" }],
    events: [],
  };
  expect(nextActions(run)).toEqual(["confirm-angle"]);
  const outcome = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(outcome.ran).toBeNull();
  expect(outcome.failure).toBeUndefined();
  expect(outcome.run).toStrictEqual(run);
});

test("advanceStep reports an off-ramp — nothing valid to do — as nothing run", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-step-offramp-"));
  const run: RunManifest = {
    runId: "offramp",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: {},
    orient: {
      profile: { columns: ["a"], numericColumns: [], rowCount: 1 },
      supportsPoint: false,
    },
    elements: [{ id: "e1" }],
    events: [],
  };
  expect(nextActions(run)).toEqual([]);
  const outcome = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(outcome.ran).toBeNull();
  expect(outcome.run).toStrictEqual(run);
});

test("advanceStep surfaces a refused step with the very message it recorded as an event", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-step-refused-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "refused",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
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
          unit: "CHF",
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

  const outcome = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(outcome.ran).toBe("produce");
  expect(outcome.failure).toBeDefined();
  expect(outcome.failure!.action).toBe("produce");
  // ONE truth, not two wordings: the message handed back is the message written to the ledger.
  const failures = outcome.run.events.filter((e) => e.kind === "failure");
  expect(failures).toHaveLength(1);
  expect(outcome.failure!.message).toBe(failures[0]!.message);
  expect(outcome.run.elements[0].artifact).toBeUndefined();
}, 30000);

test("advance() is exactly advanceStep's manifest — the wrapper adds nothing", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-step-wrapper-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "wrapper",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // A CSV the test wrote into its own run dir: a `local` source (lib/source) — the file the
    // journalist brought. produce() refuses an undeclared run rather than crediting a
    // placeholder, so every fixture that reaches a render says what its data is.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
    elements: [{ id: "e1" }],
    events: [],
  };
  const viaWrapper = await advance(run, runDir, NEUTRAL_DECOR);
  const viaStep = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(viaWrapper).toStrictEqual(viaStep.run);
});

// A refusal that fits is recorded whole — most of them are one sentence a verb wrote itself
// (produce: need an angle and a chosen form), and bounding must not touch those.
test("a refusal short enough to fit is recorded exactly as the verb worded it", () => {
  const short = "produce: need an angle and a chosen form";
  expect(boundEventMessage(short)).toBe(short);
  expect(boundEventMessage("x".repeat(MAX_EVENT_MESSAGE_CHARS))).toHaveLength(
    MAX_EVENT_MESSAGE_CHARS,
  );
});

// Regression, from a real hour lost: an ENGINE refusal does not arrive as a sentence, it arrives
// as a subprocess dump (lib/core/verbs/exec.ts tails 30 lines of stdout and 30 of stderr) whose
// REASON is its last lines — everything above is the producer's ordinary progress log. The
// ledger used to keep `raw.slice(0, 200)`, i.e. exactly the uninformative head: a failed
// connected-scatter video render was recorded as "conformance: OK (0 violations)" followed by an
// informational render-size line, and the sentence naming the cause never made it into the
// manifest at all. Reading that event sent the diagnosis at the wrong file for an hour. Bounded
// from the END is what makes a recorded failure diagnosable.
test("a long engine dump is bounded from the END, so the reason a producer prints last survives", () => {
  const noise = Array.from(
    { length: 400 },
    (_, i) => `[produce connected-scatter] step ${i}: OK`,
  ).join("\n");
  const reason =
    "Error: Command failed: bun scripts/produce.mjs connected-scatter config.json out video";
  const raw = `${noise}\n${reason}`;
  expect(raw.length).toBeGreaterThan(MAX_EVENT_MESSAGE_CHARS);

  const bounded = boundEventMessage(raw);
  expect(bounded).toContain(reason);
  expect(bounded).not.toContain("step 0: OK");
  // Bounded means bounded: a manifest is persisted JSON and an unbounded dump would bloat it.
  expect(bounded.length).toBeLessThanOrEqual(MAX_EVENT_MESSAGE_CHARS);
  // And it SAYS it was cut, so nobody reads a tail as if it were the whole story.
  expect(bounded.startsWith("…")).toBe(true);
});

// --- the verification chain, carried by advance() -----------------------------------------
//
// capture and review are DETERMINISTIC steps, so the same `advance` that orients, proposes,
// produces and delivers is what runs them. Before this, a produced artifact went straight to
// deliver and the whole of lib/verify had no production caller at all.
test("advance() carries capture then review on the road to a requested delivery", async () => {
  // No journalist is sitting in front of a test process, so no viewer is launched — the same
  // flag a host that presents the deliverable itself sets (lib/loop/preview.ts). Scoped and
  // restored: `bun test` shares one process across files.
  const priorNoViewer = process.env.SPLASH_NO_VIEWER;
  process.env.SPLASH_NO_VIEWER = "1";
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-verify-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  let run: RunManifest = {
    runId: "verify-chain",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
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
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "The adult premium rose in both cantons, 2015 to 2024.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static" as const,
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

  run = await advance(run, runDir, NEUTRAL_DECOR); // produce
  expect(run.elements[0]!.artifact).toBeDefined();
  run = {
    ...run,
    elements: [
      { ...run.elements[0]!, delivery: { requested: ["zip"], delivered: [] } },
    ],
  };

  // A requested delivery does not reach `deliver`: the artifact owes the chain first.
  expect(nextActions(run)).toEqual(["capture"]);
  let step = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(step.failure).toBeUndefined();
  expect(step.ran).toBe("capture");
  run = step.run;
  expect(run.elements[0]!.capture!.images).toHaveLength(1);

  expect(nextActions(run)).toEqual(["review"]);
  step = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(step.failure).toBeUndefined();
  expect(step.ran).toBe("review");
  run = step.run;
  expect(run.elements[0]!.review!.reviewer!.independentSemanticReview).toBe(
    "unavailable",
  );

  expect(nextActions(run)).toEqual(["preview"]);
  step = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(step.failure).toBeUndefined();
  expect(step.ran).toBe("preview");
  run = step.run;
  expect(run.elements[0]!.review!.preview!.deliverableSha256).toBe(
    fileArtifact(run.elements[0]!.artifact)!.sha256,
  );

  // …and it stops at the approval, which is where the human turn begins. `advance` cannot
  // perform it, and says so rather than doing nothing quietly.
  expect(nextActions(run)).toEqual(["approve"]);
  step = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(step.ran).toBeNull();

  if (priorNoViewer === undefined) delete process.env.SPLASH_NO_VIEWER;
  else process.env.SPLASH_NO_VIEWER = priorNoViewer;
}, 300_000);

// ---------------------------------------------------------------------------
// The article branch's two turns (article beats) — see docs/superpowers/specs/
// 2026-07-27-article-beats-design.md §8.
//
// BOTH are reachable, and they are reachable in different registers. `draft-beats` is
// DETERMINISTIC: scrolly is in LOOP_BUILDABLE_ENGINES (lib/loop/assemble/scrolly.ts composes the
// chosen host engine's track), so a chosen chart-track scrolly with no plan lands on it and the
// driver runs it like propose. `author-beats` is the JOURNALIST's: any element carrying a plan
// with an unwritten claim routes to it, and the driver deliberately runs nothing.
//
// This block used to say the opposite — that `draft-beats` was unreachable, so advanceStep was
// "deliberately" left without a case for it. That justification outlived the fact: with scrolly
// buildable, `nextActions` answered `draft-beats` and NOTHING could perform it, so the run froze
// with no error at all. The proof below drives the DRIVER precisely because the existing beats
// proof calls produce() directly and therefore never met the missing arm.
// ---------------------------------------------------------------------------

// A chosen chart-track scrolly with no plan — the state that used to freeze the loop.
function scrollyAwaitingItsWalk(runDir: string): RunManifest {
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "year,extent\n1979,7.05\n1990,6.24\n2000,6.32\n2007,4.28\n2012,3.57\n2020,3.92\n2025,4.31\n",
  );
  return {
    runId: "d-draft-beats",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "NSIDC Sea Ice Index",
        url: "https://nsidc.org/data/seaice_index",
      },
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
            "La banquise arctique de septembre ne s'est jamais reconstituée",
          altInsight:
            "L'étendue minimale de septembre est passée de 7 à 4,3 millions de km² entre 1979 et 2025.",
          unit: "million km²",
        },
        proposal: {
          options: [
            {
              id: "line-scrolly",
              nativeType: "line",
              engine: "chart-native",
              format: "scrolly",
              why: "une série dont la forme se raconte au fil du défilement",
            },
          ],
          excluded: [],
          chosenId: "line-scrolly",
        },
      },
    ],
    events: [],
  };
}

test("the driver drafts the walk, stops at the authoring turn, and reaches produce once it is written", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-draft-beats-"));
  let run = scrollyAwaitingItsWalk(runDir);

  // 1. THE STATE THAT FROZE. `next` says draft-beats, and the driver PERFORMS it.
  expect(nextActions(run)).toEqual(["draft-beats"]);
  const drafted = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(drafted.failure).toBeUndefined();
  expect(drafted.ran).toBe("draft-beats");
  run = drafted.run;

  // The plan is on the element, and every claim is UNWRITTEN — the whole point of the seam.
  const plan = run.elements[0]!.narrative!.beats;
  expect(plan.length).toBeGreaterThanOrEqual(3);
  expect(plan.every((b) => b.text === "")).toBe(true);
  expect(plan.every((b) => b.draftText.length > 0)).toBe(true);

  // 2. THE AUTHORING TURN IS THE JOURNALIST'S. The driver runs nothing and changes nothing —
  //    an unwritten plan must never slide into produce.
  expect(nextActions(run)).toEqual(["author-beats"]);
  const human = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(human.ran).toBeNull();
  expect(human.failure).toBeUndefined();
  expect(human.run).toEqual(run);

  // 3. THE JOURNALIST WRITES IT, through the one production caller of the guard.
  run = applyBeats(
    run,
    "e1",
    plan.map((b, i) => ({
      id: b.id,
      role: b.role,
      text:
        i === 0
          ? "En 1979, la banquise de septembre couvrait encore 7.05 millions de km²."
          : i === plan.length - 1
            ? "En 2025 elle plafonne à 4.31 : la reconstitution n'a jamais eu lieu."
            : `Le recul se creuse : ${b.beatSource.facts.value}.`,
    })),
  );

  // 4. …and the run is at produce, which is where a plan nobody wrote could never arrive.
  expect(nextActions(run)).toEqual(["produce"]);
  expect(run.elements[0]!.narrative!.beats.every((b) => b.text !== "")).toBe(
    true,
  );
  rmSync(runDir, { recursive: true, force: true });
});

test("author-beats is a human turn — the driver runs nothing and changes nothing", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-beats-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "d-beats",
    schemaVersion: 7,
    route: "article",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
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
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static",
              why: "two points in time",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
        narrative: {
          beats: [
            {
              id: "beat-1",
              anchor: { kind: "category", value: "Genève" },
              role: "establish",
              text: "",
              draftText: "Genève — 583",
              beatSource: {
                facts: { category: "Genève", value: "583" },
                shared: { rows: "2" },
              },
            },
          ],
        },
      },
    ],
    events: [],
  };
  expect(nextActions(run)).toEqual(["author-beats"]);
  const out = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(out.ran).toBeNull();
  expect(out.failure).toBeUndefined();
  expect(out.run).toEqual(run);
  rmSync(runDir, { recursive: true, force: true });
});

// A DEAD END IS NOT A HUMAN TURN.
//
// A chosen form nothing can build routes back to "choose-form" (manifest.ts), which the driver's
// `default:` arm treated exactly like an offer waiting to be chosen from: `ran: null`, no failure,
// nothing written. So an autonomous runner looping on advance saw "waiting for the journalist"
// forever, and a manifest re-read afterwards showed `chosen → choose-form` with no trace of why —
// the run stagnated without ever saying so. The ledger is meant to be the whole story of a run.
function strandedOnUnbuildableChoice(): RunManifest {
  return {
    runId: "dead-end",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: {},
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
            // A FICTIONAL engine, declared by this test. The fixture used to point at
            // whichever real engine was not wired yet (map-native, then map-dw), and had to
            // be re-pointed each time one became buildable (tasks 7, 13) — every engine the
            // brain offers is now assembled, so a dead-ended choice is something a test
            // constructs rather than borrows.
            {
              id: "unbuildable-form",
              nativeType: "choropleth",
              engine: "crayon",
              format: "static",
              why: "one value per canton",
            },
          ],
          excluded: [],
          chosenId: "unbuildable-form",
        },
      },
    ],
    events: [],
  };
}

test("a run dead-ended on an unbuildable choice says so, once, instead of reporting a human turn", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-deadend-"));
  const run = strandedOnUnbuildableChoice();
  expect(nextActions(run)).toEqual(["choose-form"]);

  const first = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(first.ran).toBeNull();
  expect(first.failure?.action).toBe("choose-form");
  expect(first.failure?.message).toContain("crayon");
  // Written down, not only returned: the next reader of this manifest is a resume, not this call.
  expect(first.run.events).toHaveLength(1);
  expect(first.run.events[0]).toMatchObject({
    kind: "failure",
    elementId: "e1",
    action: "choose-form",
    message: first.failure!.message,
  });

  // ONCE. A runner loops on advance, and the ledger is capped at 50 entries — a refusal that
  // re-appends on every turn evicts the run's real history with copies of one fact.
  const second = await advanceStep(first.run, runDir, NEUTRAL_DECOR);
  expect(second.failure?.message).toBe(first.failure!.message);
  expect(second.run.events).toHaveLength(1);
  rmSync(runDir, { recursive: true, force: true });
});

test("an offer still waiting to be chosen from is a human turn, and stays silent", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-human-turn-"));
  const stranded = strandedOnUnbuildableChoice();
  const el = stranded.elements[0]!;
  // The same run, minus the choice: "choose-form" now means what it has always meant.
  const run: RunManifest = {
    ...stranded,
    elements: [{ ...el, proposal: { ...el.proposal!, chosenId: undefined } }],
  };
  expect(nextActions(run)).toEqual(["choose-form"]);
  const out = await advanceStep(run, runDir, NEUTRAL_DECOR);
  expect(out.ran).toBeNull();
  expect(out.failure).toBeUndefined();
  expect(out.run.events).toEqual([]);
  rmSync(runDir, { recursive: true, force: true });
});

// A RUN THAT CANNOT ADVANCE MUST NOT EAT ITS OWN HISTORY.
//
// A destination nobody has configured, an input that is not on disk: `nextActions` keeps
// answering the same action, the step keeps refusing the same way, and an autonomous runner
// appends the identical failure event on every turn. The ledger is capped at 50 entries and the
// loop is not, so the cap does not merely bound the noise — it EVICTS the run's real history and
// leaves fifty copies of one fact where the transitions used to be.
//
// Collapsing them loses nothing. The reason is a pure function of a state that has not changed,
// and StepOutcome.failure still carries it to the caller on every single turn — which is the
// signal a runner looping on "advance until there is nothing left" terminates on.
test("a refusal that repeats identically is one ledger entry, not one per turn", async () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-driver-repeat-refusal-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const frozen = freezeInput(runDir, src, "data");
  const run: RunManifest = {
    runId: "repeat-refusal",
    schemaVersion: 7,
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
  rmSync(join(runDir, frozen.path));

  let current = run;
  const messages: string[] = [];
  for (let turn = 0; turn < 4; turn++) {
    const out = await advanceStep(current, runDir, NEUTRAL_DECOR);
    // Reported EVERY turn — the collapse is about the ledger, never about what the caller is
    // told. A runner that stops on `failure` stops on the first one.
    expect(out.failure?.action).toBe("produce");
    messages.push(out.failure!.message);
    current = out.run;
    expect(nextActions(current)).toEqual(["produce"]); // the loop, still turning
  }
  expect(new Set(messages).size).toBe(1); // the same refusal, four times over
  expect(current.events).toHaveLength(1);

  // A DIFFERENT refusal is a different fact and still appends: only an exact repeat of the
  // ledger's LAST entry collapses, so nothing that actually happened is dropped.
  const elsewhere = await advanceStep(
    { ...current, input: {} },
    runDir,
    NEUTRAL_DECOR,
  );
  expect(elsewhere.run.events).toHaveLength(2);
  rmSync(runDir, { recursive: true, force: true });
}, 30000);
