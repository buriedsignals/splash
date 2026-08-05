// AN APPROVAL THE MODEL CAN WRITE IS NOT AN APPROVAL (registry E20).
//
// OBSERVED LIVE on 2026-08-05, and this is the first time the hole was USED rather than reasoned
// about. `export-code.mjs` refused: "not render-reviewed". The host model then edited the report
// itself —
//     ▸ edit  path .../report.json   before: "renderApproved": false,
//                                     after:  "renderApproved": true,
// — was refused again for the neighbouring field, edited that one too, and the next run exported
// on the forged approval. The run directory has NO `_shown/` receipt at all: nobody was ever shown
// the visual.
//
// The gap was already documented, in this very file, together with its closure: "re-read the
// presentation receipt at export time via shownCovers(path, r.approvedHash)". What today adds is
// the measurement — the same move E11 made from reasoned risk to observed fact.
//
// WHY THE RECEIPT (E19) DOES NOT COVER THIS. That signature proves export-code wrote the folder.
// It says nothing about whether the approval it acted on was real, and it signed this one happily.
// Provenance of the WRITING is not provenance of the CONSENT — two different claims, and only the
// first was closed.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { assertShippable } from "./export-guard";
import type { ProduceReport } from "./producer-spec";

function scene(opts: { withReceipt: boolean; sameBytes?: boolean }): {
  report: ProduceReport;
  artifact: string;
} {
  const run = mkdtempSync(join(tmpdir(), "approval-"));
  const outDir = join(run, "el");
  mkdirSync(outDir, { recursive: true });
  const artifact = join(outDir, "el.png");
  writeFileSync(artifact, "the bytes the journalist saw");
  const approvedHash = createHash("sha256")
    .update("the bytes the journalist saw")
    .digest("hex");

  if (opts.withReceipt) {
    // What `lib/host/cli.ts present` leaves behind when a human is actually shown the visual.
    const shown = join(outDir, "_shown");
    mkdirSync(shown, { recursive: true });
    writeFileSync(
      join(shown, "el.png.json"),
      JSON.stringify({
        sha256: opts.sameBytes === false ? "0".repeat(64) : approvedHash,
        presentedAs: "opened",
      }),
    );
  }
  return {
    artifact,
    report: {
      generatedAt: new Date(0).toISOString(),
      results: [
        {
          id: "el",
          producer: "dw-chart",
          format: "static",
          status: "produced",
          reviewed: true,
          renderApproved: true,
          approvedHash,
          shownSha256: approvedHash,
          // An ARRAY — what the producers really write. The first version of this fixture used
          // an object and passed anyway, validating a shape production never emits; the
          // type-checker caught it. Same class as the verify-delivery fixture the same day.
          outputs: [artifact],
        },
      ],
    } as unknown as ProduceReport,
  };
}

describe("the export re-verifies the approval against the presentation receipt", () => {
  it("should accept an approval a real presentation stands behind", () => {
    const { report } = scene({ withReceipt: true });
    expect(() => assertShippable(report, "el")).not.toThrow();
  });

  // THE CASE THAT WAS OBSERVED: every field says approved, and nobody was ever shown anything.
  it("should refuse a hand-written approval with no presentation behind it", () => {
    const { report } = scene({ withReceipt: false });
    expect(() => assertShippable(report, "el")).toThrow(/shown/i);
  });

  // ★ THE SHAPE THE REAL FORGERY TOOK, and the case that was missing here until a mutation showed
  // it: the model flipped `renderApproved` to true and wrote NOTHING else — no approvedHash, no
  // receipt. A guard that only checks the hash WHEN a hash is present is defeated by not writing
  // one, which is the cheapest forgery available. Measured on the real 2026-08-05 report: with the
  // presence requirement removed, that exact report exports.
  it("should refuse an approval that names no bytes at all", () => {
    const { report } = scene({ withReceipt: false });
    delete (report.results[0] as { approvedHash?: string }).approvedHash;
    expect(() => assertShippable(report, "el")).toThrow(/approvedHash/);
  });

  // And the neighbouring lie: shown once, then the artifact changed underneath the approval.
  it("should refuse when what was shown is not what is on disk now", () => {
    const { report } = scene({ withReceipt: true, sameBytes: false });
    expect(() => assertShippable(report, "el")).toThrow(/changed|shown/i);
  });
});
