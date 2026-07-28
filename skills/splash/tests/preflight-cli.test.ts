// preflight-cli.test.ts — the PROPOSITION-time readiness report the orchestrator runs
// before presenting engines to the journalist.
//
// A3: the CLI REPORTS, it does not record. The record of "when was this capability last
// checked, and what came back" has one home — `newsroom.json.capabilities[id].lastVerified`,
// written by the setup page, which is the only caller that performs a live provider check.
// The env/deps half this CLI computes is re-derived on every read by lib/newsroom/readiness.ts
// from the same manifest, so persisting it was a cache nothing read.
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../scripts/preflight.mjs");

function project(): string {
  return mkdtempSync(join(tmpdir(), "splash-preflight-cli-"));
}

describe("preflight CLI", () => {
  it("should report every named engine with ready flag + findings, exit 0", () => {
    const out = execFileSync("bun", [CLI, "dw-chart", "map-native"], {
      cwd: project(),
      env: { ...process.env, DATAWRAPPER_API_TOKEN: "" }, // force the dw finding
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    expect(report.engines["dw-chart"].ready).toBe(false);
    expect(report.engines["dw-chart"].findings[0].message).toContain(
      "DATAWRAPPER_API_TOKEN",
    );
    expect(report.engines["map-native"]).toBeDefined();
  });

  it("should default to ALL engines when no argument is given", () => {
    const out = execFileSync("bun", [CLI], {
      cwd: project(),
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

  // The GREEN path's raw material. A report keyed only on producer ids is what let a real run
  // announce « les six moteurs sont prêts (préflight vert) » — a count and a self-report, telling
  // the journalist nothing about what he can make. The newsroom label travels with every entry,
  // ready or not, and it comes from the capability registry so engine naming keeps one home.
  it("should carry each engine's newsroom label, never only the producer id", () => {
    const out = execFileSync("bun", [CLI], {
      cwd: project(),
      encoding: "utf8",
    });
    const report = JSON.parse(out);
    for (const [id, engine] of Object.entries(report.engines)) {
      expect(typeof engine.label).toBe("string");
      expect(engine.label.length).toBeGreaterThan(0);
      expect(engine.label).not.toBe(id);
    }
    expect(report.engines["scrolly"].label).toBe("Scrollytelling stories");
  });

  it("should exit 1 on an unknown producer", () => {
    expect(() =>
      execFileSync("bun", [CLI, "sankey-native"], {
        cwd: project(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).toThrow();
  });
});

// A3 — one fact, one home. The tri-state used to be persisted to `.splash-preflight.json`
// beside the decor, which held the same fact under `lastVerified`: two writers of one record.
describe("the CLI records nothing (A3)", () => {
  it("writes no file at all — not the legacy status map, not the decor", () => {
    const dir = project();
    execFileSync("bun", [CLI, "dw-chart"], { cwd: dir, encoding: "utf8" });
    expect(existsSync(join(dir, ".splash-preflight.json"))).toBe(false);
    expect(existsSync(join(dir, "newsroom.json"))).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("leaves a legacy status map untouched, so the migration can still absorb it", () => {
    const dir = project();
    const legacy = join(dir, ".splash-preflight.json");
    const before = JSON.stringify({
      schemaVersion: "1",
      engines: {
        "dw-chart": {
          status: "green",
          checkedAt: "2026-07-01T00:00:00.000Z",
          reason: "",
        },
      },
    });
    writeFileSync(legacy, before);
    execFileSync("bun", [CLI, "dw-chart"], {
      cwd: dir,
      env: { ...process.env, DATAWRAPPER_API_TOKEN: "" }, // a finding must not rewrite it
      encoding: "utf8",
    });
    expect(readFileSync(legacy, "utf8")).toBe(before);
  });
});
