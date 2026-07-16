// Doc-parity pins: SKILL.md prose must keep prescribing what the spine's code enforces.
// A drifted SKILL.md silently disarms prose-enforced emission (the orchestrator LLM reads
// the doc, not the gate source), so each pinned emission line is asserted here.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const splash = readFileSync(join(import.meta.dir, "..", "SKILL.md"), "utf8");

describe("A5 — skillsInvoked emission", () => {
  it("§5b prescribes emitting skillsInvoked like channel/confirmedTakeaway", () => {
    expect(splash).toContain("skillsInvoked");
    expect(splash).toContain("splash:cadrage-guided");
  });
});

// Mechanical pins for the canonical 12-step question flow (2026-07-16). SKILL.md is a
// prose CONTRACT the orchestrator LLM executes; these greps are the cheapest tripwire
// against a partial rewrite regressing to the old order (data truth after routing,
// single proposal, per-opportunity question loops).
const suggest = readFileSync(
  join(import.meta.dir, "../../suggest-chart/SKILL.md"),
  "utf8",
);

const input = splash.slice(
  splash.indexOf("### 1. INPUT"),
  splash.indexOf("### 2. ANALYSE"),
);
const cadrage = splash.slice(
  splash.indexOf("### 3. CADRAGE"),
  splash.indexOf("### 4. PROPOSITION"),
);
const proposition = splash.slice(
  splash.indexOf("### 4. PROPOSITION"),
  splash.indexOf("### 5. PRODUCTION"),
);

describe("C3 — the canonical 12-step order", () => {
  it("INPUT must ask for the article when none is supplied (step 2)", () => {
    expect(input).toContain("ask for the article");
  });

  it("CADRAGE ends on the channel question (step 7 — after takeaway, table, source, constraints)", () => {
    const posTakeaway = cadrage.indexOf("takeaway");
    const posTable = cadrage.indexOf("GATE 2b");
    const posSource = cadrage.indexOf("GATE 2c");
    const posConstraint = cadrage.indexOf("Constraint");
    const posChannel = cadrage.indexOf("Where will it be published");
    for (const pos of [
      posTakeaway,
      posTable,
      posSource,
      posConstraint,
      posChannel,
    ])
      expect(pos).toBeGreaterThan(-1);
    expect(posTakeaway).toBeLessThan(posTable);
    expect(posTable).toBeLessThan(posSource);
    expect(posSource).toBeLessThan(posConstraint);
    expect(posConstraint).toBeLessThan(posChannel);
  });

  it("source (GATE 2c) is asked ALWAYS, table (GATE 2b) prose-only, never bundled", () => {
    expect(cadrage).toContain("source is asked on EVERY run");
    expect(cadrage).toContain("two successive prompts");
  });

  it("no standalone format question exists — format derives and is announced for veto", () => {
    expect(splash).not.toContain("Où vivra-t-il");
    expect(proposition).toContain("derived from channel × type");
  });

  it("step 12: after export, splash proactively offers another format", () => {
    expect(splash).toContain("### Step 12 — offer another format");
    expect(splash).toContain("-<format>");
  });
});

describe("C4 — batched multi-proposals, each with its why", () => {
  it("PROPOSITION presents ALL opportunities' candidates in ONE message", () => {
    expect(proposition).toContain("ONE batched message");
    expect(proposition).toContain("never a per-opportunity question loop");
  });

  it("each candidate carries its editorial why, first one recommended", () => {
    expect(proposition).toContain("why it can be interesting");
    expect(proposition).toContain("first one recommended");
  });

  it("suggest-chart emits the candidates contract", () => {
    expect(suggest).toContain("## Output — candidates first");
    expect(suggest).toContain('"candidates"');
  });

  it("stale auto static-fallback prose is purged from suggest-chart", () => {
    expect(suggest).not.toContain(
      "always shipped with a self-contained static HTML",
    );
    expect(suggest).not.toContain(
      "a static fallback that carries the claim on its own is ALSO produced",
    );
  });
});

describe("orchestration hardening (Spotlight A1/A3/A4)", () => {
  it("has a context-recovery resume table keyed on artifact presence", () => {
    expect(splash).toContain("## Context recovery");
    expect(splash).toContain("accepted.json");
    expect(splash).toContain("report.json");
  });
  it("has the bounded-retry discipline (once, verbatim error, shape-only)", () => {
    expect(splash).toContain("retried ONCE");
    expect(splash).toContain("never worked around");
  });
  it("has the scripted stall protocol", () => {
    expect(splash).toContain("## Stall protocol");
    expect(splash).toContain("Je bloque sur");
  });
});
