import { describe, it, expect } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeState, describeNext, readOnlyUiLanguage } from "./state";
import { installRoot } from "../newsroom/decor";
import { writeManifest, nextActions, type RunManifest } from "../loop/manifest";
import { freezeInput } from "../loop/freeze";

const emptyDir = (): string => mkdtempSync(join(tmpdir(), "host-state-"));

describe("describeState / describeNext — never throw, always a typed response", () => {
  it("refuses a directory with no manifest instead of throwing", () => {
    const r = describeState(emptyDir());
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("no-run");
    expect(r.message).toContain("run.json");
  });

  it("refuses a corrupt manifest instead of throwing", () => {
    const dir = emptyDir();
    writeFileSync(join(dir, "run.json"), "{ not json");
    const r = describeState(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("invalid-run");
  });

  it("describeNext refuses the same way", () => {
    const r = describeNext(emptyDir());
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("no-run");
  });
});

// A real run on disk: one frozen input, one element, nothing done yet.
function makeRun(): { dir: string; run: RunManifest } {
  const dir = emptyDir();
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "host-state",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return { dir, run };
}

describe("describeState / describeNext over a real run", () => {
  it("reports the run's own state and the loop's own next actions", () => {
    const { dir, run } = makeRun();

    const s = describeState(dir);
    expect(s.ok).toBe(true);
    if (!s.ok) throw new Error(s.message);
    const report = s.value as {
      runId: string;
      elements: { id: string; gateState: string; nextActions: string[] }[];
    };
    expect(report.runId).toBe("host-state");
    expect(report.elements).toHaveLength(1);
    expect(report.elements[0].id).toBe("e1");
    // This run has an input and nothing else, so its gate state is exactly "empty" —
    // asserting only that the string is non-empty asserted nothing about the derivation.
    expect(report.elements[0].gateState).toBe("empty");

    const n = describeNext(dir);
    expect(n.ok).toBe(true);
    if (!n.ok) throw new Error(n.message);
    // The host invents no routing: it reports exactly what the manifest computes.
    expect(n.value).toStrictEqual({ nextActions: nextActions(run) });

    // I6 — every host response survives a JSON round trip without loss.
    expect(JSON.parse(JSON.stringify(s))).toStrictEqual(s);
    expect(JSON.parse(JSON.stringify(n))).toStrictEqual(n);
  });
});

describe("state and next are genuinely read-only", () => {
  // A v1 manifest: content INLINE, no elements[], no frozen input on disk. readManifest()
  // migrates it silently, and lib/loop/migrate.ts's migration WRITES — freezeInput created
  // `input/data-<hash>.csv` inside the run directory on a single `state --run`. The README
  // promises the façade only writes inside the paths a `verb` request names.
  function v1Run(): string {
    const dir = emptyDir();
    writeFileSync(
      join(dir, "run.json"),
      JSON.stringify({
        runId: "v1-run",
        schemaVersion: 1,
        input: { dataCsv: "canton,growth\nGeneva,4.1\nVaud,2.8\n" },
      }),
    );
    return dir;
  }

  it("state refuses a pre-v2 manifest with a typed code instead of migrating it", () => {
    const dir = v1Run();
    const r = describeState(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("stale-schema");
    expect(r.message).toContain("schemaVersion 1");
    // Nothing was written: the directory holds exactly what it held before.
    expect(readdirSync(dir)).toEqual(["run.json"]);
  });

  it("next refuses it the same way, and writes nothing either", () => {
    const dir = v1Run();
    const r = describeNext(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.code).toBe("stale-schema");
    expect(readdirSync(dir)).toEqual(["run.json"]);
  });

  it("reading a current run repeatedly leaves the directory byte-for-byte identical", () => {
    const { dir } = makeRun();
    const before = readdirSync(dir).sort();
    const beforeHashes = before.map((n) =>
      statSync(join(dir, n)).isFile()
        ? Bun.hash(readFileSync(join(dir, n))).toString()
        : "dir",
    );
    describeState(dir);
    describeNext(dir);
    describeState(dir);
    expect(readdirSync(dir).sort()).toEqual(before);
    expect(
      before.map((n) =>
        statSync(join(dir, n)).isFile()
          ? Bun.hash(readFileSync(join(dir, n))).toString()
          : "dir",
      ),
    ).toEqual(beforeHashes);
  });
});

// --- the intent question, and where the ORDER of an offer came from --------------------------
//
// `state` already carried the offer because "an element said nextActions: ['choose-form'] and
// carried no forms, so the host was told to make a decision it could not see the terms of". The
// intent is one gate earlier and had exactly the same hole: an element says
// nextActions: ['confirm-angle'] and nothing tells the host what the four answers are, let alone
// that one of them is a closed list a journalist must be asked EDITORIALLY.
//
// And once an angle exists, the report says WHAT ORDERED ITS OFFER. That is the defect this
// slice removes: an intent read out of prose by a keyword pass that frequently read nothing left
// the offer ranked by fit and readiness alone, and the run said nothing at all about it.
function runWithAngle(angle?: RunManifest["elements"][number]["angle"]): string {
  const dir = emptyDir();
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "host-intent",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    orient: {
      profile: { columns: ["canton", "prime"], numericColumns: ["prime"], rowCount: 7 },
      supportsPoint: true,
    },
    elements: [{ id: "e1", ...(angle ? { angle } : {}) }],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

const ANGLE = {
  confirmedTakeaway:
    "La prime varie de 115 francs entre le canton le plus cher et le moins cher",
  altInsight: "Genève affiche 583 francs, Fribourg 468.",
  unit: "CHF",
};

function stateOf(dir: string): Record<string, any> {
  const r = describeState(dir);
  if (!r.ok) throw new Error(r.message);
  return r.value as Record<string, any>;
}

describe("state serves the intent question, and says what ordered the offer", () => {
  it("carries the nine choices, phrased editorially, while confirm-angle is owed", () => {
    const value = stateOf(runWithAngle());
    expect(value.elements[0].nextActions).toEqual(["confirm-angle"]);
    expect(value.intentChoices.choices).toHaveLength(9);
    expect(value.intentChoices.question.trim()).not.toBe("");
    // Never the machine id: "is your intent part-to-whole?" is the technical question the socle
    // forbids, and this is the surface a host renders the question from.
    for (const choice of value.intentChoices.choices)
      expect(`${choice.label} ${choice.example}`).not.toContain(choice.id);
  });

  it("drops the question once every element has answered it", () => {
    const value = stateOf(runWithAngle({ ...ANGLE, intent: "distribution" }));
    expect(value.elements[0].nextActions).not.toContain("confirm-angle");
    expect("intentChoices" in value).toBe(false);
    expect(value.elements[0].intent).toEqual({
      basis: "declared",
      declared: "distribution",
    });
  });

  // The measured mis-fire, now VISIBLE. An angle written before the declaration existed carries
  // no intent, so the ordering falls back on the keyword pass — which reads this claim about
  // spread as geography, because "canton" is in it. The run says so instead of quietly offering
  // three maps as if the journalist had asked for them.
  it("says when the order rests on a guess, and which guess", () => {
    const value = stateOf(runWithAngle(ANGLE));
    expect(value.elements[0].intent).toEqual({
      basis: "guessed",
      guessed: ["spatial"],
    });
  });

  // The state the whole slice exists to stop being silent.
  it("says when the order rests on nothing at all", () => {
    const value = stateOf(
      runWithAngle({ ...ANGLE, confirmedTakeaway: "Les chats aiment le fromage" }),
    );
    expect(value.elements[0].intent).toEqual({ basis: "none", guessed: [] });
  });

  it("reports no intent for an element that has no angle yet", () => {
    expect("intent" in stateOf(runWithAngle()).elements[0]).toBe(false);
  });
});

// `state` and `next` are STRICTLY read-only — the promise in lib/host/README.md, and the reason
// they refuse to migrate a stale manifest rather than migrating it quietly. Resolving the
// newsroom's interface language put that promise at risk: `loadDecor()` called with NO directory
// is allowed to WRITE (it persists the one-time legacy decor migration into the install root),
// and `tryLoadDecor()` takes exactly that path. Naming the root explicitly is what makes the same
// answer arrive without the side effect — decor.ts: "with an explicit dir the decor is read and
// derived but NOTHING is written".
//
// Asserted at the seam, because the write only happens on an install that still carries the
// legacy files and no test may fabricate one inside the real install root.
describe("resolving the interface language cannot write", () => {
  it("asks the decor for a named root, which is the read-only shape", () => {
    const seen: (string | undefined)[] = [];
    readOnlyUiLanguage(((dir?: string) => {
      seen.push(dir);
      return { language: { ui: "fr", content: "fr" } } as never;
    }) as never);
    expect(seen).toEqual([installRoot()]);
  });

  it("falls back to no language rather than throwing, so a broken decor never hides the run", () => {
    expect(
      readOnlyUiLanguage((() => {
        throw new Error("unreadable install");
      }) as never),
    ).toBe("");
  });
});
