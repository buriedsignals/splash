import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { opportunitiesWriteErrors } from "../../scripts/save-opportunities.mjs";

const script = join(import.meta.dir, "../../scripts/save-opportunities.mjs");

const GOOD = {
  proposals: [
    {
      anchor: {
        paragraphIndex: 3,
        quote: "cross-border workers nearly doubled since 2015",
      },
      claim: "Cross-border workers grew from ~40k to ~73k since 2015",
      intent: "How did cross-border worker numbers grow since 2015?",
    },
    {
      claim: "The budget overran by 40%",
      intent: "How far did the budget overrun?",
    },
  ],
};

function save(runDir: string, payload: unknown) {
  return execFileSync(
    "bun",
    [script, runDir, "--payload", JSON.stringify(payload)],
    {
      encoding: "utf8",
    },
  );
}

describe("opportunitiesWriteErrors", () => {
  it("accepts a proposal set with and without anchors", () => {
    expect(opportunitiesWriteErrors(GOOD)).toEqual([]);
  });

  it("refuses a payload with no proposals array", () => {
    expect(opportunitiesWriteErrors({}).join(" ")).toContain("proposals");
    expect(opportunitiesWriteErrors({ proposals: "x" }).join(" ")).toContain(
      "proposals",
    );
  });

  it("refuses an empty proposal set — an analysed article yields opportunities or a refusal, never a blank file", () => {
    expect(opportunitiesWriteErrors({ proposals: [] }).join(" ")).toContain(
      "empty",
    );
  });

  it("refuses a proposal with no claim", () => {
    expect(
      opportunitiesWriteErrors({ proposals: [{ intent: "q?" }] }).join(" "),
    ).toContain("claim");
  });

  it("refuses an anchor that carries neither a quote nor a usable paragraph index", () => {
    expect(
      opportunitiesWriteErrors({
        proposals: [{ claim: "c", intent: "i", anchor: {} }],
      }).join(" "),
    ).toContain("anchor");
    expect(
      opportunitiesWriteErrors({
        proposals: [{ claim: "c", intent: "i", anchor: { paragraphIndex: 0 } }],
      }).join(" "),
    ).toContain("anchor");
  });
});

describe("save-opportunities CLI", () => {
  it("writes opportunities.json into the run directory and reports the counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-"));
    const out = save(dir, GOOD);
    const written = join(dir, "opportunities.json");
    expect(existsSync(written)).toBe(true);
    expect(JSON.parse(out)).toEqual({
      written,
      opportunities: 2,
      anchored: 1,
    });
    const saved = JSON.parse(readFileSync(written, "utf8"));
    expect(saved.opportunities).toHaveLength(2);
    expect(saved.opportunities[0].anchor).toEqual({
      paragraphIndex: 3,
      quote: "cross-border workers nearly doubled since 2015",
    });
    expect(saved.opportunities[1].anchor).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses a malformed payload non-zero and writes nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-bad-"));
    let failed = false;
    try {
      save(dir, { proposals: [] });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(existsSync(join(dir, "opportunities.json"))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses a run directory that does not exist rather than creating one", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-missing-"));
    const missing = join(dir, "not-a-run");
    let failed = false;
    try {
      save(missing, GOOD);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(existsSync(missing)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});
