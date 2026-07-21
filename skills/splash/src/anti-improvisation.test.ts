import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { assertShippable } from "./export-guard";
import { assertChainProvenance } from "./render-provenance";
import { canonicalJson } from "./canonical-json";
import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";

// Regression for the observed certification critical: the actor hand-authored a chart-native
// producer spec, bypassed produce-all (and therefore suggest-chart's candidates menu), and
// shipped it straight to export. This test replays that exact maneuver against the REAL export
// path — assertShippable() then assertChainProvenance(), exactly as export-code.mjs calls them
// (skills/splash/scripts/export-code.mjs) — and pins that it is now REFUSED. A control case
// proves the same artifact ships when it DOES trace to a candidates.json menu entry, so the
// guard is not a blanket refusal of chart-native.
//
// Fixture topology mirrors render-provenance.test.ts (Task 2): accepted.json/candidates.json/
// report.json live together in the RUN directory beside report.json; exportDir is a separate
// per-id delivery folder that assertChainProvenance never reads accepted.json/candidates.json
// from (see render-provenance.ts's own comment on this).
function specHash(spec: unknown): string {
  return createHash("sha256").update(canonicalJson(spec)).digest("hex");
}

// The hand-authored chart-native spec — exactly the shape an improviser would type directly,
// no suggest-chart candidate behind it.
const HAND_AUTHORED_SPEC = {
  nativeType: "bar",
  title: "Rents in Annemasse",
  source: { name: "INSEE" },
};

describe("anti-improvisation regression — hand-authored chart-native spec is unshippable", () => {
  let dir: string;
  let runDir: string;
  let exportDir: string;
  let outDir: string;
  let reportPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "splash-anti-improvisation-"));
    runDir = join(dir, "run");
    outDir = join(runDir, "p1");
    exportDir = join(runDir, "p1-export");
    mkdirSync(outDir, { recursive: true });
    mkdirSync(exportDir, { recursive: true });
    reportPath = join(runDir, "report.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function acceptedProposal(): AcceptedProposal {
    // Hand-authored: producer is chart-native, and NOT the direct-branch exemption (the
    // journalist did not name this visual — the actor typed the spec themselves).
    return {
      id: "p1",
      producer: "chart-native",
      format: "static",
      spec: HAND_AUTHORED_SPEC,
      confirmedTakeaway: "Rents rose across the region",
    };
  }

  function writeAccepted(): void {
    writeFileSync(
      join(runDir, "accepted.json"),
      JSON.stringify([acceptedProposal()]),
    );
  }

  function writeCandidatesWithoutChartNative(): void {
    // The menu the suggester actually persisted only ever offered dw-chart — chart-native
    // was never proposed for this opportunity.
    writeFileSync(
      join(runDir, "candidates.json"),
      JSON.stringify({
        candidates: [{ type: "column-chart", producer: "dw-chart" }],
      }),
    );
  }

  function writeCandidatesWithChartNative(): void {
    writeFileSync(
      join(runDir, "candidates.json"),
      JSON.stringify({
        candidates: [{ type: "bar", producer: "chart-native" }],
      }),
    );
  }

  // Builds a report + a produced, reviewed, approved output — i.e. everything downstream of
  // "hand-author a spec" that a bypass would still need to fabricate to reach export: a
  // produced status, a render-review pass, and a fresh (non-planted, non-stale) artifact.
  function buildReport(hash: string): ProduceReport {
    const generatedAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
    const outputPath = join(outDir, "static.png");
    writeFileSync(outputPath, "fake-png-bytes");
    const mtime = new Date("2025-12-31T23:59:00.000Z");
    utimesSync(outputPath, mtime, mtime);
    const result: ProposalResult = {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      outputs: [outputPath],
      renderApproved: true,
      reviewed: true,
      acceptedConfigHash: hash,
    };
    return { generatedAt, results: [result] };
  }

  it("REFUSAL — the certification critical: candidates.json never proposed chart-native, so the hand-authored spec is unshippable", () => {
    writeAccepted();
    writeCandidatesWithoutChartNative();
    const report = buildReport(specHash(HAND_AUTHORED_SPEC));

    // assertShippable alone is not the guard under test — it only checks produced/reviewed/
    // renderApproved, all of which an improviser can fabricate. It must still pass here so the
    // refusal below is proven to come from the chain-provenance check specifically.
    expect(() => assertShippable(report, "p1")).not.toThrow();

    let thrown: unknown;
    try {
      assertChainProvenance(report, "p1", exportDir, reportPath);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    // Pins that the refusal is assertChainProvenance's candidate-menu message, not some other
    // failure mode (e.g. a hash mismatch or a missing-file error).
    expect(message).toMatch(/candidate|menu|hand-authored|never proposed/i);
  });

  it("CONTROL — the same artifact ships when candidates.json DOES list chart-native for this opportunity", () => {
    writeAccepted();
    writeCandidatesWithChartNative();
    const report = buildReport(specHash(HAND_AUTHORED_SPEC));

    expect(() => assertShippable(report, "p1")).not.toThrow();
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).not.toThrow();
  });

  it("reinforces red-if-the-guard-is-removed: swapping the control's candidates.json for the menu-less one turns the SAME artifact back into a refusal", () => {
    writeAccepted();
    writeCandidatesWithChartNative();
    const report = buildReport(specHash(HAND_AUTHORED_SPEC));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).not.toThrow();

    // Swap the menu for the one that never proposed chart-native — nothing else about the
    // artifact changes.
    writeCandidatesWithoutChartNative();
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/candidate|menu|hand-authored|never proposed/i);
  });
});
