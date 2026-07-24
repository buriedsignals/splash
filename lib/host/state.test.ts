import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
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
    schemaVersion: 2,
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
    expect(report.elements[0].gateState.length).toBeGreaterThan(0);

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
