import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("produce-all CLI", () => {
  it("reports needs-confirmation for an unconfirmed prose proposal without touching a producer", () => {
    const dir = mkdtempSync(join(tmpdir(), "atelier-cli-"));
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
    const out = execFileSync(
      "bun",
      ["scripts/produce-all.mjs", accepted, join(dir, "out")],
      { cwd: join(import.meta.dir, ".."), encoding: "utf8" },
    );
    const report = JSON.parse(out);
    expect(report.results[0].status).toBe("needs-confirmation");
  });
});
