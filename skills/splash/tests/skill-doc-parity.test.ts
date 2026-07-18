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
    const posTakeaway = cadrage.indexOf("Takeaway — GATE 1b");
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

  it("a standalone format question is a Never-list violation (validation-run regression)", () => {
    expect(splash).toContain("Never ask the FORMAT as a standalone question");
  });

  it("the Stage-1 payload is written as candidates.json before presenting (mechanical trace)", () => {
    expect(splash).toContain("exports/<slug>/candidates.json");
    expect(splash).toContain("BEFORE presenting");
  });

  it("a candidates-less suggest-chart return is re-invoked once (mechanical fallback)", () => {
    expect(splash).toContain("re-invoke it ONCE");
    expect(suggest).toContain("YOUR FIRST OUTPUT IS THE CANDIDATES LIST");
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

  it("narrative is considered on every opportunity — present or explicitly ruled out", () => {
    expect(suggest).toContain("narrativeRuledOut");
    expect(suggest).toContain(
      "silent absence of the narrative option is not a possible state",
    );
    expect(splash).toContain("narrativeRuledOut");
  });

  it("image-scrolly appears with its requirement stated, never pre-filtered", () => {
    expect(suggest).toContain("never pre-filtered");
  });

  it("narrative potential is detected at ANALYSE across MODES (temporal/geographic/visual)", () => {
    const suggestArticle = readFileSync(
      join(import.meta.dir, "../../suggest-article/SKILL.md"),
      "utf8",
    );
    expect(suggestArticle).toContain("narrativePotential");
    expect(suggestArticle).toContain('"temporal"');
    expect(suggestArticle).toContain('"geographic"');
    expect(suggestArticle).toContain('"visual"');
    expect(suggestArticle).toContain("INDEPENDENT of data richness");
    expect(suggest).toContain("narrativePotential.visual.potential");
    expect(suggest).toContain("never only as a data-poor fallback");
  });

  it("image availability is never a CADRAGE question — resolved at candidate selection", () => {
    expect(suggest).toContain("Image availability is NEVER a CADRAGE question");
    expect(splash).toContain("NEVER a « do you have photos");
  });

  it("the Stage-1 narrative rule covers the whole family (scrolly/video/map-story), not just image-scrolly", () => {
    expect(suggest).toContain("the WHOLE family");
    expect(suggest).toContain("chart-video");
    expect(suggest).toContain("map-story");
    expect(suggest).toContain("map-scrolly");
  });

  it("narrative options (scrolly/story/image-scrolly) belong in the candidates menu", () => {
    expect(suggest).toContain("Narrative candidates belong in the menu");
    expect(suggest).toContain("does NOT govern whether it may APPEAR");
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

describe("key prerequisite (2026-07-17)", () => {
  it("missing keys are collected in the flow via the save-key seam", () => {
    expect(splash).toContain("save-key.mjs");
    expect(splash).toContain("PREREQUISITE");
    expect(splash).toContain("never hand-edit the file");
  });
  it("production never starts on a non-green engine", () => {
    expect(splash).toContain("Never start PRODUCTION on a non-green engine");
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

// C5 — image-scrolly enters the ranked list. The dead-end this closes (Tom's #3): a
// narrative text block with < 3 usable numbers used to end at a bare `no-chart`; now the
// SAME condition emits an image-scrolly candidate (producer image-native) stating what
// the journalist must supply. The chart refusal itself is unchanged — the candidate is
// the alternative, never a softening of the honest-data bar.
describe("C5 — image-scrolly recognition + suggest-image", () => {
  it("suggest-chart carries the recognition rule beside the no-chart decision", () => {
    expect(suggest).toContain("Image-scrolly recognition (C5)");
    expect(suggest).toContain("do NOT stop at `no-chart`");
    expect(suggest).toContain("producer `image-native`");
    expect(suggest).toContain("tu fournis 3-6 images");
  });

  it("the honest-data refusal stays (the candidate accompanies it, never replaces it)", () => {
    expect(suggest).toContain('"decision": "no-chart"');
    expect(suggest).toContain(
      "refusal stays exactly as-is when the journalist asks for a CHART",
    );
  });

  it("suggest-image: vision = matching/ordering ONLY, alt+credit collected, gate mandatory", () => {
    const suggestImage = readFileSync(
      join(import.meta.dir, "../../suggest-image/SKILL.md"),
      "utf8",
    );
    expect(suggestImage).toContain("matching + ordering ONLY");
    expect(suggestImage).toContain("NEVER generates");
    expect(suggestImage).toContain("MANDATORY");
    expect(suggestImage).toContain("non-skippable");
    // alt + credit are ASKED FOR (journalist-supplied), never derived from vision
    expect(suggestImage).toContain("asked for");
    // v1 format constraint is stated
    expect(suggestImage).toContain("scrolly");
    expect(suggestImage).toContain("image-story.json");
  });
});

// Survivor rules — the load-bearing prose that has NO mechanical backstop. Every guard
// documented in docs/splash/guardrails.md is enforced in code; these rules are NOT — only
// the SKILL.md prose stops the miss they guard. They are pinned FIRST (before any prose
// slim) so the moment a cut drops a survivor, its pin goes red. They must stay GREEN through
// the whole slim.
describe("survivor rules — load-bearing, no mechanical backstop, MUST survive any slim", () => {
  // Each pin asserts the ACTIONABLE CLAUSE of the rule, not a lone keyword whose token recurs
  // elsewhere — a gutted rule whose keyword survives in a comment/reference would keep a weak
  // pin green (adversarial review 2026-07-17). The clauses below are the specific sentences
  // that carry the instruction; deleting the rule removes them.
  // 1. Source-uncertainty: a hedged-but-real-looking citation passes every guard; only prose stops it.
  it("keeps the source-uncertainty rule (a confident citation over admitted uncertainty is a DEFECT)", () => {
    expect(splash).toContain("citation over admitted uncertainty is a DEFECT");
  });
  // 2. Takeaway must be EXPLICITLY confirmed, never inferred-and-skipped (GUARD 3 checks presence only).
  it("keeps 'never advance on an unconfirmed, silently-inferred takeaway'", () => {
    expect(splash).toContain("silently-inferred");
    expect(splash).toContain("EXPLICITLY confirmed");
  });
  // 3. Never fabricate a value — the HARD coordinate-provenance clause (validators cannot tell real from invented).
  it("keeps never-hand-type-a-coordinate + never-fabricate-attribution", () => {
    expect(suggest).toContain(
      "NEVER hand-type a coordinate from the model's own knowledge",
    );
    expect(splash).toContain("Never fabricate a dataset attribution");
  });
  // 4. Gate-3a render-review: the interaction-not-from-a-still clause specifically (the most droppable of the six).
  it("keeps the Gate-3a interaction-not-asserted-from-a-still criterion + part-by-part title check", () => {
    expect(splash).toContain(
      'never assert an interaction "works" from a still',
    );
    expect(splash).toContain("part by part");
  });
  // 5. WAIT-means-WAIT delivery gate — the actionable clause, not the bare word "wait".
  it("keeps WAIT-means-WAIT (--form MUST NOT run until a journalist message answers the proposal)", () => {
    expect(splash).toContain("MUST NOT run until a journalist message");
    expect(splash).toContain("Never auto-progress");
  });
  // Honorable mentions — the actionable clause.
  it("keeps one-element-one-takeaway SEMANTIC (never a shared combined string)", () => {
    expect(splash).toContain("never a shared combined string");
  });
  it("keeps 'always ask Q6 channel' + the permissive-default warning (absent → article-web)", () => {
    expect(splash).toContain("the LAST CADRAGE question");
    expect(splash).toContain("Never omit it");
  });
});
