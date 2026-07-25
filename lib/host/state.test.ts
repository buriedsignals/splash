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
import { describeState, describeNext } from "./state";
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
    schemaVersion: 3,
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
