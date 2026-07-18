import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produceAll } from "./produce-all.ts";
import type { AcceptedProposal } from "./producer-spec.ts";

// A pass-through validator so these tests exercise the id gate in isolation, not the
// full spec validator. The real CLI uses validateAccepted (unchanged).
const passValidate = () => ({ ok: true as const, warnings: [] as string[] });
// preflight OK for any producer (hermetic — no env/deps consulted).
const noPreflight = () => [];

function proposal(id: string): AcceptedProposal {
  return {
    id,
    producer: "chart-native",
    format: "static",
    spec: { nativeType: "bar" },
    confirmedTakeaway: "x",
    channel: "article-web",
  };
}

const MALICIOUS = ["../../evil", "/etc", "a/b", "", "..", "a\\b"];

for (const id of MALICIOUS) {
  test(`rejects malicious id ${JSON.stringify(id)} as a failed result, dispatch never runs`, async () => {
    let dispatchCalled = false;
    const dispatch = async () => {
      dispatchCalled = true;
      return { status: "produced" as const, outputs: [] };
    };
    const report = await produceAll(
      [proposal(id)],
      "/tmp/splash-id-safety-should-not-be-used",
      dispatch,
      passValidate,
      null,
      noPreflight,
    );
    expect(dispatchCalled).toBe(false);
    expect(report.results).toHaveLength(1);
    expect(report.results[0].status).toBe("failed");
    expect(report.results[0].error).toMatch(/not a safe slug/i);
  });
}

test("a normal slug id passes the gate and reaches dispatch unchanged", async () => {
  let seenOutDir = "";
  const dispatch = async (_p: AcceptedProposal, outDir: string) => {
    seenOutDir = outDir;
    return { status: "produced" as const, outputs: ["x.png"] };
  };
  const report = await produceAll(
    [proposal("rents-2026")],
    "/tmp/splash-base",
    dispatch,
    passValidate,
    null,
    noPreflight,
  );
  expect(report.results[0].status).toBe("produced");
  expect(seenOutDir).toBe("/tmp/splash-base/rents-2026");
});

// The escape-proof: the REAL dispatch resolves+rmSyncs `${outDir}/${p.id}`. A traversal
// id must never let that delete escape the base outDir. We plant a sentinel OUTSIDE the
// base dir, run produceAll with a `../../` id, and assert the sentinel survives (the gate
// fired before any freshOutDir ran).
test("escape-proof: a traversal id cannot delete a sibling of outDir", async () => {
  const root = mkdtempSync(join(tmpdir(), "splash-escape-"));
  const base = join(root, "out"); // the outDir passed to produceAll
  mkdirSync(base, { recursive: true });
  const victimDir = join(root, "precious"); // a sibling that MUST survive
  mkdirSync(victimDir, { recursive: true });
  const sentinel = join(victimDir, "keep.txt");
  writeFileSync(sentinel, "do not delete");

  // `../precious` from `${base}/<id>` resolves to victimDir. If the gate were absent,
  // freshOutDir would rmSync it recursively.
  const { realDispatch } = await import("./adapters.ts");
  const report = await produceAll(
    [proposal("../precious")],
    base,
    realDispatch,
    passValidate,
    null,
    noPreflight,
  );

  expect(report.results[0].status).toBe("failed");
  expect(report.results[0].error).toMatch(/not a safe slug/i);
  expect(existsSync(sentinel)).toBe(true);
});
