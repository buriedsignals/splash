// preflight-cli.test.ts — the PROPOSITION-time readiness report the orchestrator runs
// before presenting engines to the journalist.
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../scripts/preflight.mjs");

describe("preflight CLI", () => {
  it("should report every named engine with ready flag + findings, exit 0", () => {
    const project = mkdtempSync(join(tmpdir(), "splash-preflight-cli-"));
    const out = execFileSync(
      "bun",
      [CLI, "dw-chart", "map-native", "--project", project],
      {
        env: { ...process.env, DATAWRAPPER_API_TOKEN: "" }, // force the dw finding
        encoding: "utf8",
      },
    );
    const report = JSON.parse(out);
    expect(report.engines["dw-chart"].ready).toBe(false);
    expect(report.engines["dw-chart"].findings[0].message).toContain(
      "DATAWRAPPER_API_TOKEN",
    );
    expect(report.engines["map-native"]).toBeDefined();
  });

  it("should default to ALL engines when no argument is given", () => {
    const project = mkdtempSync(join(tmpdir(), "splash-preflight-cli-"));
    const out = execFileSync("bun", [CLI, "--project", project], {
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    for (const p of [
      "dw-chart",
      "chart-native",
      "map-dw",
      "map-native",
      "scrolly",
    ])
      expect(report.engines[p]).toBeDefined();
  });

  it("should persist the tri-state map to <project>/.splash-preflight.json (Spotlight A2)", () => {
    const project = mkdtempSync(join(tmpdir(), "splash-preflight-cli-"));
    const out = execFileSync("bun", [CLI, "dw-chart", "--project", project], {
      env: { ...process.env, DATAWRAPPER_API_TOKEN: "" },
      encoding: "utf8",
    });
    const printed = JSON.parse(out);
    const file = join(project, ".splash-preflight.json");
    expect(existsSync(file)).toBe(true);
    const persisted = JSON.parse(readFileSync(file, "utf8"));
    expect(persisted.schemaVersion).toBe("1");
    expect(persisted.engines["dw-chart"].status).toBe(
      printed.engines["dw-chart"].status.status,
    );
    expect(persisted.engines["dw-chart"].checkedAt).toBeString();
  });

  it("should exit 1 on an unknown producer", () => {
    const project = mkdtempSync(join(tmpdir(), "splash-preflight-cli-"));
    expect(() =>
      execFileSync("bun", [CLI, "sankey-native", "--project", project], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).toThrow();
  });
});
