import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("produce-all CLI", () => {
  it("reports needs-confirmation for an unconfirmed prose proposal without touching a producer", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-cli-"));
    const accepted = join(dir, "accepted.json");
    writeFileSync(
      accepted,
      JSON.stringify([
        {
          id: "p1",
          producer: "chart-native",
          format: "static",
          spec: {},
          confirmedTakeaway: "The confirmed takeaway for this fixture",
          provenance: "prose",
        },
      ]),
    );
    // Satisfy the candidate-provenance gate (it runs before the prose-confirmation gate): a
    // matching candidates.json sibling so this proposal reaches the prose gate under test.
    writeFileSync(
      join(dir, "candidates.json"),
      JSON.stringify({
        candidates: [
          {
            type: "d3-bars",
            producer: "chart-native",
            tier: "recommended",
            why: "x",
          },
        ],
      }),
    );
    const out = execFileSync(
      "bun",
      ["scripts/produce-all.mjs", accepted, join(dir, "out")],
      { cwd: join(import.meta.dir, ".."), encoding: "utf8" },
    );
    const report = JSON.parse(out);
    expect(report.results[0].status).toBe("needs-confirmation");
  });
});
