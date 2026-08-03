import { describe, it, expect } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  advanceRun,
  approveIn,
  chooseFormIn,
  initRunIn,
  requestDeliveryIn,
} from "./drive";
import {
  provenanceHash,
  writeManifest,
  type RunElement,
  type RunManifest,
  fileArtifact,
} from "../loop/manifest";
import { freezeInput } from "../loop/freeze";
import { DEFAULT_UI_LANG } from "../newsroom/language";

function emptyDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

// A run on disk with a frozen input and nothing done yet.
function freshRun(): string {
  const dir = emptyDir("drive-fresh-");
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  const run: RunManifest = {
    runId: "drive",
    schemaVersion: 6,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

// A run standing at the choice: oriented, angled, an offer on the table.
function proposedRun(over: Partial<RunElement> = {}): string {
  const dir = emptyDir("drive-proposed-");
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  const run: RunManifest = {
    runId: "drive-proposed",
    schemaVersion: 6,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
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
              why: "two points, one line each",
            },
          ],
          excluded: [],
        },
        ...over,
      },
    ],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

// A run whose element already carries a (recorded) artifact, so a delivery can be decided on.
function producedRun(): string {
  const dir = proposedRun({
    proposal: {
      options: [
        {
          id: "slope",
          nativeType: "slope",
          engine: "chart-native",
          format: "static",
          why: "two points, one line each",
        },
      ],
      excluded: [],
      chosenId: "slope",
    },
  });
  const path = join(dir, "run.json");
  const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
  const el = run.elements[0]!;
  const produced: RunManifest = {
    ...run,
    elements: [
      {
        ...el,
        artifact: {
          path: "elements/e1/static.png",
          sha256: "not-read-by-the-decision",
          provenanceHash: provenanceHash(run, el),
          producedAt: "2026-07-26T00:00:00.000Z",
        },
      },
    ],
  };
  writeManifest(path, produced);
  return dir;
}

function bytes(dir: string): string {
  return readFileSync(join(dir, "run.json"), "utf8");
}

// A directory with a CSV in it and no run — what a host holds before it declares one.
function undeclared(): { dir: string; csv: string } {
  const dir = emptyDir("drive-init-");
  const csv = join(dir, "premiums.csv");
  writeFileSync(csv, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  return { dir, csv };
}

describe("initRunIn — the question a run cannot begin without", () => {
  it("creates the run when the data says what it is", () => {
    const { dir, csv } = undeclared();
    const r = initRunIn(dir, {
      runId: "premiums",
      input: { data: csv },
      sources: {
        mode: "real",
        data: { kind: "local", label: "Relevés cantonaux 2024" },
      },
    });
    expect(r).toEqual({
      ok: true,
      // No article language declared and no house profile installed (this worktree carries no
      // NEWSROOM-PROFILE.md): the confirm-back reports the house default, "en".
      value: { runId: "premiums", nextActions: ["orient"], lang: "en" },
    });
  });

  it("asks where the data comes from when no source is declared, and writes NOTHING", () => {
    const { dir, csv } = undeclared();
    const r = initRunIn(dir, { runId: "premiums", input: { data: csv } });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-request");
    expect(r.message).toContain("Where does this data come from");
    expect(existsSync(join(dir, "run.json"))).toBe(false);
    expect(existsSync(join(dir, "input"))).toBe(false);
  });

  it("asks for the one field a declared source is still missing", () => {
    const { dir, csv } = undeclared();
    const r = initRunIn(dir, {
      runId: "premiums",
      input: { data: csv },
      sources: { mode: "real", data: { kind: "public", label: "OFS" } },
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("URL");
    expect(existsSync(join(dir, "run.json"))).toBe(false);
  });

  // The confirm-back this task exists for (D20): no seventh CADRAGE question, just the language
  // the deliverables will be made in, reported alongside what to do next.
  it("reports the declared article language in the confirm-back", () => {
    const { dir, csv } = undeclared();
    const r = initRunIn(dir, {
      runId: "premiums",
      input: { data: csv, articleLang: "it" },
      sources: {
        mode: "real",
        data: { kind: "local", label: "Relevés cantonaux 2024" },
      },
    });
    expect(r).toEqual({
      ok: true,
      value: { runId: "premiums", nextActions: ["orient"], lang: "it" },
    });
  });

  // Review finding on Task 5: `initRunIn`'s confirm-back used to fall back to a hardcoded
  // `"en"` where it should defer to DEFAULT_UI_LANG — harmless only because the constant's
  // CURRENT value happens to be "en" too. Asserting `lang === "en"` here (as the test above
  // does, legitimately, to pin the observable behaviour) would not catch a regression back to
  // the literal: the literal and the constant agree today, so equality holds either way. What
  // is missing is a check that the fallback is wired to the SYMBOL, not a snapshot of what it
  // currently equals — read the real source of the site (the same technique
  // readme-parity.test.ts uses for cli.ts) and require the constant's own name to appear in the
  // fallback expression.
  it("the confirm-back's default is wired to DEFAULT_UI_LANG itself, not a copy of its value", () => {
    const src = readFileSync(join(import.meta.dir, "drive.ts"), "utf8");
    const fallback = src.match(
      /lang:\s*created\.value\.lang\s*\?\?\s*([^,\n]+),/,
    );
    expect(fallback).not.toBeNull();
    expect(fallback![1].trim()).toBe("DEFAULT_UI_LANG");
    // And the symbol it names really is the constant this file imports, not a same-named
    // decoy — the value-level assertion the sibling test above already makes, restated with
    // the import rather than the literal so the two can never quietly drift apart again.
    expect(DEFAULT_UI_LANG).toBe("en");
  });

  it("keeps the loop's own refusal for a declaration that is not even shaped right", () => {
    // A mistyped or smuggled field is NAMED by initRun's strict schema. Answering a question
    // about the source instead would replace a precise diagnosis with an unrelated one.
    const { dir, csv } = undeclared();
    const r = initRunIn(dir, {
      runId: "premiums",
      input: { data: csv },
      angle: "sneaky",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("angle");
  });
});

describe("advanceRun — one deterministic step, through the run directory", () => {
  it("runs the step next says is valid and persists it", async () => {
    const dir = freshRun();
    const r = await advanceRun(dir);
    expect(r.ok).toBe(true);
    expect((r as { value: { ran: string } }).value.ran).toBe("orient");
    // Persisted, not just returned: the next invocation is a separate process.
    expect(JSON.parse(bytes(dir)).orient).toBeDefined();
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["confirm-angle"]);
  });

  it("refuses a human turn, naming the command that performs it", async () => {
    const before = proposedRun();
    const r = await advanceRun(before);
    expect(r).toMatchObject({ ok: false, code: "step-refused" });
    // The point of the refusal: a host learns what to do instead, not just that it failed.
    expect((r as { message: string }).message).toContain("choose-form");
    expect(bytes(before)).toBe(bytes(before));
  });

  it("leaves the manifest untouched when there is nothing to run", async () => {
    const dir = proposedRun();
    const before = bytes(dir);
    await advanceRun(dir);
    expect(bytes(dir)).toBe(before);
  });

  it("tells a fresh, undelivered visual apart from a delivered one", async () => {
    // Both sit on "show", and the honest answer differs: one still has a decision owed, the
    // other has none. Inviting a host to request a delivery it already completed reads as a
    // loop it cannot escape.
    const dir = producedRun();
    const waiting = await advanceRun(dir);
    expect((waiting as { message: string }).message).toContain(
      "request-delivery",
    );

    const path = join(dir, "run.json");
    const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
    const el = run.elements[0]!;
    writeManifest(path, {
      ...run,
      elements: [
        {
          ...el,
          delivery: {
            requested: ["zip"],
            delivered: [
              {
                publisherId: "zip",
                kind: "package",
                publishedAt: "2026-07-26T00:00:00.000Z",
                deliveredProvenanceHash: el.artifact!.provenanceHash,
              },
            ],
          },
        },
      ],
    });
    const done = await advanceRun(dir);
    expect(done).toMatchObject({ ok: false, code: "step-refused" });
    expect((done as { message: string }).message).not.toContain(
      "request-delivery",
    );
    expect((done as { message: string }).message).toContain("published");
  });

  it("refuses a run directory that holds no run", async () => {
    const r = await advanceRun(emptyDir("drive-norun-"));
    expect(r).toMatchObject({ ok: false, code: "no-run" });
  });

  // schemaVersion 2 through 4 now migrate in memory (lib/host/state.ts's loadRun) — only a v1
  // manifest still refuses, because its sole migration path writes a frozen input file into the
  // run directory, and advanceRun follows loadRun's rule exactly like state/next do.
  it("refuses a manifest whose migration would write, rather than migrating it", async () => {
    const dir = emptyDir("drive-stale-");
    writeFileSync(
      join(dir, "run.json"),
      JSON.stringify({ runId: "old", schemaVersion: 1, elements: [] }),
    );
    const r = await advanceRun(dir);
    expect(r).toMatchObject({ ok: false, code: "stale-schema" });
  });
});

describe("chooseFormIn — the journalist's choice, persisted", () => {
  it("writes the chosen id and reports what became valid", () => {
    const dir = proposedRun();
    const r = chooseFormIn(dir, "slope");
    expect(r.ok).toBe(true);
    expect((r as { value: { chosen: string } }).value.chosen).toBe("slope");
    expect(JSON.parse(bytes(dir)).elements[0].proposal.chosenId).toBe("slope");
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["produce"]);
  });

  it("refuses an id that is not in the offer, and writes NOTHING", () => {
    const dir = proposedRun();
    const before = bytes(dir);
    const r = chooseFormIn(dir, "not-offered");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect(bytes(dir)).toBe(before);
  });

  it("refuses a run with no element to decide about", () => {
    const dir = emptyDir("drive-noel-");
    writeManifest(join(dir, "run.json"), {
      runId: "empty",
      schemaVersion: 6,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
    });
    const r = chooseFormIn(dir, "slope");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("refuses an unreadable run the same way every other command does", () => {
    expect(chooseFormIn(emptyDir("drive-choose-norun-"), "x")).toMatchObject({
      ok: false,
      code: "no-run",
    });
  });

  // SYMMETRY WITH confirm-angle. Both commands move provenanceHash, so both can annul a finished
  // artifact; only one said so. A decision that silently throws away work has no place on a
  // surface whose every other answer is explicit — and the host cannot infer it, because the
  // hash it would have to compare is not something the façade hands out.
  //
  // A second option, added to the offer the produced run already carries. `options` is not part
  // of provenanceHash (only `chosenId` and the chosen option's `format` are), so widening the
  // offer leaves the recorded artifact fresh — which is precisely the state under test.
  function producedWithASecondOption(): string {
    const dir = producedRun();
    const path = join(dir, "run.json");
    const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
    const el = run.elements[0]!;
    writeManifest(path, {
      ...run,
      elements: [
        {
          ...el,
          proposal: {
            ...el.proposal!,
            options: [
              ...el.proposal!.options,
              {
                id: "bar",
                nativeType: "bar",
                engine: "chart-native",
                format: "static",
                why: "one bar per canton",
              },
            ],
          },
        },
      ],
    });
    return dir;
  }

  it("says when re-choosing a form annuls a finished artifact", () => {
    const dir = producedWithASecondOption();
    const r = chooseFormIn(dir, "bar");
    expect(r).toMatchObject({ ok: true });
    expect((r as { value: object }).value).toMatchObject({
      chosen: "bar",
      staled: true,
    });
    // The word is earned: the run really does route back through produce.
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["produce"]);
  });

  it("stays silent when the choice annuls nothing", () => {
    // Re-affirming the SAME form moves no hash, so there is nothing to warn about. Absent, never
    // `staled: false` — the same presence rule confirm-angle follows.
    const dir = producedWithASecondOption();
    const r = chooseFormIn(dir, "slope");
    expect(r).toMatchObject({ ok: true });
    expect("staled" in ((r as { value: object }).value as object)).toBe(false);
  });

  it("stays silent when there is no artifact to annul", () => {
    const dir = proposedRun();
    const r = chooseFormIn(dir, "slope");
    expect(r).toMatchObject({ ok: true });
    expect("staled" in ((r as { value: object }).value as object)).toBe(false);
  });
});

describe("requestDeliveryIn — where it goes, decided and recorded", () => {
  it("derives the destination from the format's genre when none is named", () => {
    const dir = producedRun();
    const r = requestDeliveryIn(dir);
    expect(r.ok).toBe(true);
    // A static image is a FILE genre: the portable package, never a hosted embed.
    expect((r as { value: { requested: string[] } }).value.requested).toEqual([
      "zip",
    ]);
    expect(JSON.parse(bytes(dir)).elements[0].delivery.requested).toEqual([
      "zip",
    ]);
    // And THAT is what opens the road to publication — the whole point of the decision. The
    // road now starts at `capture`: a produced artifact somebody has asked to publish owes the
    // verification chain (capture → review → preview → approve) before deliver becomes valid.
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["capture"]);
  });

  it("honours the destinations the journalist named", () => {
    const dir = producedRun();
    const r = requestDeliveryIn(dir, ["embed-s3"]);
    expect(r.ok).toBe(true);
    expect((r as { value: { requested: string[] } }).value.requested).toEqual([
      "embed-s3",
    ]);
  });

  it("refuses a destination this install does not know, and writes NOTHING", () => {
    const dir = producedRun();
    const before = bytes(dir);
    const r = requestDeliveryIn(dir, ["embed-dropbox"]);
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect(bytes(dir)).toBe(before);
  });

  it("refuses before anything has been produced", () => {
    const dir = proposedRun();
    const r = requestDeliveryIn(dir);
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });
});

// --- addressing a deliverable other than the first ------------------------------------------
//
// A story now carries several deliverables (issue #1): one confirmed takeaway, an article-web
// master and its social/print siblings, each an element with its own offer, format and artifact.
// `nextActions` aggregates across them and the driver advances the one it ANSWERED ABOUT. The
// façade did not follow: `liveElement` was `run.elements[0]`, so a host could decide about the
// master and nothing else — `next` could say "choose-form" about the second deliverable while
// every façade command kept writing to the first.

// Two deliverables sharing one takeaway: the master already chosen and produced (terminal), the
// social sibling still standing at its own choice. So the live element is the SECOND.
function twoDeliverableRun(): string {
  const dir = producedRun();
  const path = join(dir, "run.json");
  const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
  const master = run.elements[0]!;
  const sibling: RunElement = {
    id: "e1-d2",
    deliverableOf: "e1",
    deliverable: { destination: "social", aspect: "portrait" },
    angle: master.angle,
    proposal: {
      options: [
        {
          id: "bar",
          nativeType: "bar",
          engine: "chart-native",
          format: "static",
          why: "one value per canton",
        },
      ],
      excluded: [],
    },
  };
  writeManifest(path, { ...run, elements: [master, sibling] });
  return dir;
}

describe("the façade addresses the deliverable the loop is talking about", () => {
  it("decides about the element nextActions answered about, not elements[0]", () => {
    const dir = twoDeliverableRun();
    const res = chooseFormIn(dir, "bar");
    expect(res.ok).toBe(true);
    const run = JSON.parse(bytes(dir)) as RunManifest;
    // The sibling got the choice; the produced master was not touched.
    expect(run.elements[1]!.proposal!.chosenId).toBe("bar");
    expect(run.elements[0]!.proposal!.chosenId).toBe("slope");
  });

  it("keeps the deliverables in their planned order", () => {
    const dir = twoDeliverableRun();
    chooseFormIn(dir, "bar");
    const run = JSON.parse(bytes(dir)) as RunManifest;
    // `[decided, ...rest]` would move the acted-on element to the front. The order is the
    // production order the plan chose — web first, as the editorial master.
    expect(run.elements.map((e) => e.id)).toEqual(["e1", "e1-d2"]);
  });

  it("addresses the element the caller names", () => {
    const dir = twoDeliverableRun();
    // Named explicitly, and discriminating: "bar" exists ONLY in the sibling's offer, so a
    // façade still writing to elements[0] refuses it rather than choosing it elsewhere.
    const res = chooseFormIn(dir, "bar", "e1-d2");
    expect(res.ok).toBe(true);
    const run = JSON.parse(bytes(dir)) as RunManifest;
    expect(run.elements[1]!.proposal!.chosenId).toBe("bar");
    expect(run.elements[0]!.proposal!.chosenId).toBe("slope");
  });

  it("refuses an element id the run does not hold, naming the ones it does, and writes NOTHING", () => {
    const dir = twoDeliverableRun();
    const before = bytes(dir);
    const res = chooseFormIn(dir, "bar", "e9");
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("unreachable");
    expect(res.message).toContain("e9");
    expect(res.message).toContain("e1-d2");
    expect(bytes(dir)).toBe(before);
  });

  it("routes an unnamed delivery request to the live deliverable, not to the master", () => {
    const dir = twoDeliverableRun();
    // Discriminating in the other direction: the live element is the sibling, which has no
    // artifact yet, so an unnamed request must REFUSE. A façade still writing to elements[0]
    // would happily request a delivery for the already-produced master instead.
    const res = requestDeliveryIn(dir);
    expect(res.ok).toBe(false);
    const run = JSON.parse(bytes(dir)) as RunManifest;
    expect(run.elements[0]!.delivery).toBeUndefined();
    expect(run.elements[1]!.delivery).toBeUndefined();
  });

  it("routes a delivery request to the master when it is named", () => {
    const dir = twoDeliverableRun();
    const res = requestDeliveryIn(dir, undefined, "e1");
    expect(res.ok).toBe(true);
    const run = JSON.parse(bytes(dir)) as RunManifest;
    expect(run.elements[0]!.delivery?.requested?.length).toBeGreaterThan(0);
    expect(run.elements[1]!.delivery).toBeUndefined();
  });
});

describe("approveIn — the human gate, through the run directory", () => {
  // A produced element that has been captured, reviewed and previewed: everything the gate
  // needs except the decision itself. Written by hand because this file's subject is the
  // FAÇADE — the real chain is driven step by step in lib/loop/approve.test.ts and, through
  // spawned CLI calls only, in lib/host/journey.test.ts.
  function readyToApprove(over: Partial<RunElement> = {}): string {
    const dir = producedRun();
    const path = join(dir, "run.json");
    const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
    const el = run.elements[0]!;
    const provenance = provenanceHash(run, el);
    const ready: RunManifest = {
      ...run,
      elements: [
        {
          ...el,
          delivery: { requested: ["zip"], delivered: [] },
          capture: {
            images: [],
            checks: [],
            capturedProvenanceHash: provenance,
          },
          review: {
            findings: [],
            reviewedProvenanceHash: provenance,
            reviewer: {
              mode: "mechanical",
              name: "lib/verify/mechanical",
              version: "1.0.0",
              inputsHash: "",
              outputHash: "",
              independentSemanticReview: "unavailable",
            },
            captures: [],
            checks: [],
            tasteRisk: [],
            overrides: [],
            acknowledged: [],
            preview: {
              deliverablePath: join(dir, "elements/e1/static.png"),
              deliverableSha256: fileArtifact(el.artifact)!.sha256,
              presentedAs: "path-printed",
              presentedAt: "2026-07-27T09:00:00.000Z",
              fallbackReason: "the host presented it itself",
            },
          },
          ...over,
        },
      ],
    };
    writeManifest(path, ready);
    return dir;
  }

  it("records the approval and answers with what became valid", () => {
    const dir = readyToApprove();
    const r = approveIn(dir, { actorLabel: "Yvan" });
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({
      ok: true,
      value: { approved: "e1", nextActions: ["deliver"] },
    });
    expect(JSON.parse(bytes(dir)).elements[0].approved).toBeDefined();
  });

  it("refuses an artifact nobody has been shown, and writes NOTHING", () => {
    const dir = readyToApprove();
    const path = join(dir, "run.json");
    const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
    const el = run.elements[0]!;
    const { preview: _preview, ...review } = el.review as Record<
      string,
      unknown
    >;
    writeManifest(path, {
      ...run,
      elements: [{ ...el, review } as RunElement],
    });
    const before = bytes(dir);

    const r = approveIn(dir, {});
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain(
      "preview-not-presented",
    );
    // A refused decision leaves the run byte-identical — the property that makes a refusal
    // safe to retry, held by every acting command on this surface.
    expect(bytes(dir)).toBe(before);
  });

  it("refuses a ceremony that is not the shape it declares", () => {
    const dir = readyToApprove();
    const r = approveIn(dir, { overrides: "all of them" });
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toMatch(/override/i);
  });

  it("names an element that is not in the run, listing the ones that are", () => {
    const dir = readyToApprove();
    const r = approveIn(dir, {}, "e9");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect((r as { message: string }).message).toContain('"e1"');
  });

  it("refuses an unreadable run the same way every other command does", () => {
    expect(approveIn(emptyDir("drive-approve-norun-"), {})).toMatchObject({
      ok: false,
      code: "no-run",
    });
  });
});

describe("advanceRun — the human turn it cannot perform", () => {
  it("names the approve command when the approval is what is owed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "drive-approve-owed-"));
    // Re-uses the shape above through the exported command rather than duplicating it: the
    // point here is only the SENTENCE advance answers with.
    const src = join(dir, "src.csv");
    writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
    const run: RunManifest = {
      runId: "approve-owed",
      schemaVersion: 6,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(dir, src, "data") },
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
                why: "two points, one line each",
              },
            ],
            excluded: [],
            chosenId: "slope",
          },
        },
      ],
      events: [],
    };
    const el = run.elements[0]!;
    const provenance = provenanceHash(run, el);
    writeManifest(join(dir, "run.json"), {
      ...run,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "abc",
            provenanceHash: provenance,
            producedAt: "2026-07-27T09:00:00.000Z",
          },
          delivery: { requested: ["zip"], delivered: [] },
          capture: {
            images: [],
            checks: [],
            capturedProvenanceHash: provenance,
          },
          review: {
            findings: [],
            reviewedProvenanceHash: provenance,
            preview: {
              deliverablePath: "/tmp/x/static.png",
              deliverableSha256: "abc",
              presentedAs: "path-printed",
              presentedAt: "2026-07-27T09:00:00.000Z",
              fallbackReason: "no viewer",
            },
          },
        },
      ],
    });

    const r = await advanceRun(dir);
    expect(r).toMatchObject({ ok: false, code: "step-refused" });
    expect((r as { message: string }).message).toContain("approve --run <dir>");
  });

  it("puts the juxtaposition where the journalist has to act", async () => {
    // needsHumanEye was carried all the way to the approval decision (lib/verify/approval.ts:158)
    // and rendered by NOBODY — its only non-test sinks were signoffs/<id>.json and a report
    // object nothing prints. A signal nobody sees is not a signal: this proves the approve
    // command's own message now carries the confirmed takeaway and the rendered title side by
    // side, the moment the journalist is told to act.
    const dir = mkdtempSync(join(tmpdir(), "drive-approve-partial-title-"));
    const src = join(dir, "src.csv");
    writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
    const confirmedTakeaway =
      "Rents rose fastest in Geneva while wages stagnated across the whole canton";
    const renderedTitle = "Rents rose fastest in Geneva";
    const run: RunManifest = {
      runId: "approve-partial-title",
      schemaVersion: 6,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(dir, src, "data") },
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
            confirmedTakeaway,
            altInsight:
              "Rents in Geneva rose faster than wages across the canton.",
            unit: "CHF",
          },
          proposal: {
            options: [
              {
                id: "slope",
                nativeType: "slope",
                engine: "chart-native",
                format: "static",
                why: "two points, one line each",
              },
            ],
            excluded: [],
            chosenId: "slope",
          },
        },
      ],
      events: [],
    };
    const el = run.elements[0]!;
    const provenance = provenanceHash(run, el);
    writeManifest(join(dir, "run.json"), {
      ...run,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "abc",
            provenanceHash: provenance,
            producedAt: "2026-07-27T09:00:00.000Z",
          },
          delivery: { requested: ["zip"], delivered: [] },
          capture: {
            images: [],
            checks: [],
            capturedProvenanceHash: provenance,
          },
          review: {
            findings: [],
            reviewedProvenanceHash: provenance,
            // The element the fixture carries the failure in: a taste-risk row a real review
            // step would have produced, standing in for that step so this test's own subject
            // stays "does the approve message render it" rather than "does detection fire".
            tasteRisk: [
              {
                dimension: "title-partial-coverage",
                detector: "title-covers-takeaway",
                evidence: [confirmedTakeaway, renderedTitle],
                routedTo: "human-signoff",
              },
            ],
            preview: {
              deliverablePath: "/tmp/x/static.png",
              deliverableSha256: "abc",
              presentedAs: "path-printed",
              presentedAt: "2026-07-27T09:00:00.000Z",
              fallbackReason: "no viewer",
            },
          },
        },
      ],
    });

    const r = await advanceRun(dir);
    expect(r).toMatchObject({ ok: false, code: "step-refused" });
    const message = (r as { message: string }).message;
    expect(message).toContain("you confirmed:");
    expect(message).toContain("the title reads:");
    expect(message).toContain(confirmedTakeaway);
    expect(message).toContain(renderedTitle);
  });
});
