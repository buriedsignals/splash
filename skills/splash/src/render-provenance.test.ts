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
import { assertChainProvenance } from "./render-provenance";
import { canonicalJson } from "./canonical-json";
import type {
  AcceptedProposal,
  ProduceReport,
  ProposalResult,
} from "./producer-spec";

// Mirrors produce-all.ts's own acceptedConfigHash computation exactly (sha256 of the
// canonicalized spec) — so tests can compute the SAME hash assertChainProvenance does.
function specHash(spec: unknown): string {
  return createHash("sha256").update(canonicalJson(spec)).digest("hex");
}

const SPEC = { nativeType: "bar", title: "Rents", source: { name: "INSEE" } };

// Fixture topology mirrors the REAL production layout (SKILL.md §5c/§6, produce-all.mjs's own
// `dirname(acceptedPath)` convention), NOT a convenience shortcut: accepted.json/candidates.json/
// report.json all live together in the RUN directory (exports/<slug>); outDir is a subdir of it
// (exports/<slug>/<id>); exportDir — the per-id DELIVERY folder export-code.mjs is invoked with
// (exports/<slug>/<id>-export) — is a SEPARATE sibling directory that never holds accepted.json.
// Keeping exportDir distinct from runDir in these fixtures proves assertChainProvenance resolves
// accepted.json/candidates.json via reportPath's directory, not via the exportDir argument.
describe("assertChainProvenance — export gate verifies the sanctioned candidates→accepted→produce chain", () => {
  let dir: string;
  let runDir: string;
  let exportDir: string;
  let outDir: string;
  let reportPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "splash-chain-provenance-"));
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

  function acceptedProposal(
    extra: Partial<AcceptedProposal> = {},
  ): AcceptedProposal {
    return {
      id: "p1",
      producer: "chart-native",
      format: "static",
      spec: SPEC,
      confirmedTakeaway: "Rents rose across the region",
      ...extra,
    };
  }

  function writeAccepted(list: AcceptedProposal[]): void {
    writeFileSync(join(runDir, "accepted.json"), JSON.stringify(list));
  }

  function writeCandidates(candidates: unknown): void {
    writeFileSync(join(runDir, "candidates.json"), JSON.stringify(candidates));
  }

  // Builds a report + a produced output file. `outputMtime` controls whether the artifact
  // predates (fresh, legitimate) or postdates (planted/stale) the report's generation anchor.
  function buildReport(
    hash: string,
    opts: { outputMtime?: Date; outputs?: string[]; publicUrl?: string } = {},
  ): ProduceReport {
    const generatedAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
    let outputs = opts.outputs;
    if (outputs === undefined) {
      const outputPath = join(outDir, "static.png");
      writeFileSync(outputPath, "fake-png-bytes");
      const mtime = opts.outputMtime ?? new Date("2025-12-31T23:59:00.000Z");
      utimesSync(outputPath, mtime, mtime);
      outputs = [outputPath];
    }
    const result: ProposalResult = {
      id: "p1",
      producer: "chart-native",
      format: "static",
      status: "produced",
      outputs,
      renderApproved: true,
      reviewed: true,
      acceptedConfigHash: hash,
      ...(opts.publicUrl ? { publicUrl: opts.publicUrl } : {}),
    };
    return { generatedAt, results: [result] };
  }

  it("does NOT throw on a valid chain: candidates.json lists the producer, accepted spec hashes to acceptedConfigHash, outputs fresh", () => {
    writeAccepted([acceptedProposal()]);
    writeCandidates({
      candidates: [{ type: "bar", producer: "chart-native" }],
    });
    const report = buildReport(specHash(SPEC));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).not.toThrow();
  });

  it("throws when the producer is not in candidates.json (hand-authored, non-direct)", () => {
    writeAccepted([acceptedProposal()]);
    // The menu only ever offered dw-chart — chart-native was never a candidate.
    writeCandidates({ candidates: [{ type: "line", producer: "dw-chart" }] });
    const report = buildReport(specHash(SPEC));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/candidate|menu|hand-authored/i);
  });

  it("throws when accepted.json's spec hash does not equal the result's acceptedConfigHash (spec swapped after acceptance)", () => {
    writeAccepted([acceptedProposal()]);
    writeCandidates({
      candidates: [{ type: "bar", producer: "chart-native" }],
    });
    // A hash that does not correspond to SPEC at all — simulates accepted.json being
    // hand-edited after produce-all stamped the original hash.
    const report = buildReport("f".repeat(64));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/hash/i);
  });

  it("throws when accepted.json is missing", () => {
    // No writeAccepted() call — accepted.json never written.
    writeCandidates({
      candidates: [{ type: "bar", producer: "chart-native" }],
    });
    const report = buildReport(specHash(SPEC));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/accepted\.json/);
  });

  it("delegates planted/stale detection to assertArtifactProvenance (does not reimplement it)", () => {
    writeAccepted([acceptedProposal()]);
    writeCandidates({
      candidates: [{ type: "bar", producer: "chart-native" }],
    });
    // Output file modified AFTER the report's generation anchor — assertArtifactProvenance's
    // own stale-report/hand-modified refusal message, proving delegation rather than a
    // separate reimplementation of the freshness check.
    const report = buildReport(specHash(SPEC), {
      outputMtime: new Date("2026-01-01T00:10:00.000Z"),
    });
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/modified AFTER this report's produce generation/);
  });

  it("exempts a direct-branch proposal (skillsInvoked includes splash:cadrage-direct) from the menu check even with no candidates.json", () => {
    writeAccepted([
      acceptedProposal({ skillsInvoked: ["splash:cadrage-direct"] }),
    ]);
    // Deliberately no writeCandidates() call — no candidates.json in exportDir at all.
    const report = buildReport(specHash(SPEC));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).not.toThrow();
  });

  it("skips the per-output artifact check for a hosted embed (publicUrl set, empty outputs) — menu + spec-hash still apply", () => {
    writeAccepted([acceptedProposal({ producer: "dw-chart" })]);
    writeCandidates({
      candidates: [{ type: "column-chart", producer: "dw-chart" }],
    });
    const report = buildReport(specHash(SPEC), {
      outputs: [],
      publicUrl: "https://datawrapper.dwcdn.net/abc123/",
    });
    report.results[0].producer = "dw-chart";
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).not.toThrow();
  });

  it("resolves accepted.json/candidates.json beside report.json, NOT inside the exportDir delivery folder", () => {
    // Plant a WOULD-BE-VALID accepted.json + candidates.json directly inside exportDir (the
    // per-id delivery folder) instead of runDir — mirrors a real topology where exportDir never
    // holds these files. If assertChainProvenance mistakenly looked under exportDir, this planted
    // pair would let it through; it must instead refuse (runDir's accepted.json is missing).
    writeFileSync(
      join(exportDir, "accepted.json"),
      JSON.stringify([acceptedProposal()]),
    );
    writeFileSync(
      join(exportDir, "candidates.json"),
      JSON.stringify({
        candidates: [{ type: "bar", producer: "chart-native" }],
      }),
    );
    const report = buildReport(specHash(SPEC));
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/accepted\.json/);
  });

  it("still throws for a hosted-embed-shaped result if the producer is not in the candidate menu", () => {
    writeAccepted([acceptedProposal({ producer: "dw-chart" })]);
    writeCandidates({
      candidates: [{ type: "line", producer: "chart-native" }],
    });
    const report = buildReport(specHash(SPEC), {
      outputs: [],
      publicUrl: "https://datawrapper.dwcdn.net/abc123/",
    });
    report.results[0].producer = "dw-chart";
    expect(() =>
      assertChainProvenance(report, "p1", exportDir, reportPath),
    ).toThrow(/candidate|menu|hand-authored/i);
  });
});
