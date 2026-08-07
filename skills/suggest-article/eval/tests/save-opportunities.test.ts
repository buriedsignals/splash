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
      sourceHint: {
        name: "Insee",
        url: "https://www.insee.fr/fr/statistiques/1",
      },
    },
    {
      claim: "The budget overran by 40%",
      intent: "How far did the budget overrun?",
      noSourceNamed: true,
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

  // THE SOURCE THE ARTICLE NAMED, kept by the step that already reads it.
  //
  // `sourceHint` was captured at step 3, handed to this writer inside the very payload it
  // validates, and dropped on the floor — so "did the article name a source for this claim?" had
  // no answer any script could give, and the two source guards it feeds could be disarmed by
  // saying nothing. These tests are the receipt.
  it("refuses a proposal that says nothing about whether the article named a source", () => {
    expect(
      opportunitiesWriteErrors({
        proposals: [{ claim: "c", intent: "i" }],
      }).join(" "),
    ).toContain("sourceHint");
  });

  it("refuses a proposal that both names a source and declares none — the two cannot both be true", () => {
    expect(
      opportunitiesWriteErrors({
        proposals: [
          {
            claim: "c",
            intent: "i",
            sourceHint: { name: "Insee" },
            noSourceNamed: true,
          },
        ],
      }).join(" "),
    ).toContain("both");
  });

  it("refuses a sourceHint that carries neither a name nor a URL — a half-capture is not a citation", () => {
    expect(
      opportunitiesWriteErrors({
        proposals: [{ claim: "c", intent: "i", sourceHint: {} }],
      }).join(" "),
    ).toContain("sourceHint");
    expect(
      opportunitiesWriteErrors({
        proposals: [{ claim: "c", intent: "i", sourceHint: { name: "  " } }],
      }).join(" "),
    ).toContain("sourceHint");
  });

  it("accepts a name-only hint — the article named an org and gave no URL", () => {
    expect(
      opportunitiesWriteErrors({
        proposals: [{ claim: "c", intent: "i", sourceHint: { name: "Insee" } }],
      }),
    ).toEqual([]);
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
      sourceHints: 1,
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

  it("persists what the article named, so a later gate can hold the delivery to it", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-src-"));
    const out = save(dir, GOOD);
    const saved = JSON.parse(
      readFileSync(join(dir, "opportunities.json"), "utf8"),
    );
    expect(saved.opportunities[0].sourceHint).toEqual({
      name: "Insee",
      url: "https://www.insee.fr/fr/statistiques/1",
    });
    // The explicit "this article named nobody" is recorded as a STATEMENT, not as silence —
    // that is what makes it something a reader can later be wrong about.
    expect(saved.opportunities[1].noSourceNamed).toBe(true);
    expect(saved.opportunities[1].sourceHint).toBeUndefined();
    expect(JSON.parse(out).sourceHints).toBe(1);
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
