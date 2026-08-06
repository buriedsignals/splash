// Doc-parity pins: SKILL.md prose must keep prescribing what the spine's code enforces.
// A drifted SKILL.md silently disarms prose-enforced emission (the orchestrator LLM reads
// the doc, not the gate source), so each pinned emission line is asserted here.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { flowProse } from "../src/flow-prose";

const splash = flowProse();

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
// Placement at delivery — NO LONGER a survivor rule. It was one until 2026-07-29: the anchor
// (producer-spec.ts) had no reader, so only this prose stood between the journalist and a visual
// with no idea where it goes. It now has a mechanical backstop — skills/splash/src/placement.ts
// resolves it, export-code.mjs emits it at every hand-over, and an undeclared placement on an
// article run is REFUSED. These pins guard the prose that must stay in step with that code: what
// the orchestrator relays, and what §5b must carry for it to work.
describe("placement at delivery (mechanical since 2026-07-29)", () => {
  it("§6 relays the emitted block and never composes the sentence itself", () => {
    expect(splash).toContain("SPLASH_PLACEMENT");
    expect(splash).toContain("END_SPLASH_PLACEMENT");
    expect(splash).toContain("Relay it VERBATIM");
  });
  it("§6 names the quote as authoritative and the paragraph number as an indication", () => {
    expect(splash).toContain("the quote is what to trust");
  });
  it("§5b carries BOTH declarations — an anchor, or an explicit free-standing", () => {
    expect(splash).toMatch(/\*\*`anchor`\*\*/);
    expect(splash).toMatch(/\*\*`freeStanding/);
    expect(splash).toContain("never invent a paragraph");
  });
  it("§5b states that silence is refused at export once an article was read", () => {
    expect(splash).toContain("the export REFUSES");
  });
});

// Journalist-facing voice (2026-07-28) — the four misses from the first hand-run of the flow on
// a real article. Every one of them is prose-only by nature (nothing mechanical can tell "Gate
// 1b — je te relis…" from a well-worded message), so these pins ARE the enforcement.
describe("journalist-facing voice (2026-07-28)", () => {
  const voice = splash.slice(
    splash.indexOf("## Voice — what the journalist reads"),
    splash.indexOf("## The flow"),
  );

  it("has a Voice section before the flow", () => {
    expect(voice.length).toBeGreaterThan(0);
  });

  it("the progress map is the loop's six real steps, marked, short, re-shown every turn", () => {
    // "every turn" is undefined for an orchestrator whose turns are mostly tool calls the
    // journalist never sees — the map belongs on the messages he actually reads.
    expect(voice).toContain("re-shown in EVERY message to the journalist");
    expect(voice).not.toContain("re-shown EVERY turn");
    for (const step of [
      "lire l'article",
      "cadrer l'angle",
      "choisir la forme",
      "produire",
      "vérifier",
      "livrer",
    ])
      expect(voice).toContain(step);
    // the map is the flow's own phases, not a parallel invention
    expect(voice).toContain("`PROPOSITION` → *choisir la forme*");
    expect(splash).toContain("never let it grow: six short lines");
  });

  it("internal gate names are kept internally and mapped to journalist words", () => {
    expect(voice).toContain("The internal names never reach the journalist");
    expect(voice).toContain("le message à retenir"); // Gate 1b
    expect(voice).toContain("d'où viennent les chiffres"); // Gate 2c
    expect(voice).toContain("presentation change, never a rename");
    expect(splash).toContain("Never emit an internal name to the journalist");
  });

  it("emitted text is a message FOR the journalist, never self-narration or a machine line", () => {
    expect(voice).toContain(
      "Say what happened and what is asked — never what you are doing to yourself",
    );
    expect(splash).toContain("Never narrate your own process");
    expect(splash).toContain("SIGNOFF:");
  });

  it("the GREEN preflight path is scripted: what he HAS and what it lets him make", () => {
    expect(input).toContain("The GREEN path has a script too");
    expect(input).toContain("ENGINE_LABELS");
    expect(splash).toContain("Never let a green preflight pass in silence");
  });

  it("a missing NEWSROOM-PROFILE.md is a question owed, asked once, never a gate", () => {
    expect(cadrage).toContain(
      "The absence of a FILE is not the absence of a FACT",
    );
    expect(cadrage).toContain("ta rédaction a une charte");
    expect(cadrage).toContain("This is NOT a gate — it never blocks");
    expect(splash).toContain(
      "Never read the absence of a DECLARATION as the absence of the FACT",
    );
  });
});

describe("declared render limits reach the offer (2026-07-29)", () => {
  it("should document the declared-limit rule in the phrasing contract", () => {
    expect(splash).toContain("limitsAcknowledged");
  });
});

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

// Family-B closing pins (2026-07-29 plan, task 18): four passages the SKILL.md prose gained to
// match what the carrier/reader code now actually does. Each pins the ACTIONABLE clause, not a
// keyword alone — the same discipline as the block above.
describe("Family B — carrier/reader passages match the code", () => {
  it("language is declared at INPUT and never asked as a CADRAGE question", () => {
    expect(cadrage).toContain("Language is never one of these six");
    expect(cadrage).toContain("DECLARED at INPUT");
    expect(cadrage).toContain("never as its own question");
  });

  it("the language authority order is explicit signal > article > house profile, profile never overwrites", () => {
    expect(cadrage).toContain(
      "explicit signal from the journalist wins over the article's own declared language, which wins",
    );
    expect(cadrage).toContain(
      "never overwrites a language the other two already",
    );
  });

  it("a fifth language is refused at the offer, pointing at language-debt.md", () => {
    expect(proposition).toContain(
      "A fifth language is refused HERE, at the offer",
    );
    expect(proposition).toContain("docs/splash/language-debt.md");
  });

  it("the unit is stated once in the subtitle, cited at its real BarChart.tsx location", () => {
    expect(splash).toContain("The unit is stated ONCE, in the subtitle");
    expect(splash).toContain("BarChart.tsx:98-101");
    expect(splash).toContain("valueUnit");
  });

  it("D16: splash ships and juxtaposes title+takeaway; no forced moment in prose is a family-A dependency", () => {
    expect(splash).toContain("still SHIPS it and shows BOTH");
    expect(splash).toContain("juxtaposeTitleAndTakeaway");
    expect(splash).toContain("no forced moment");
    expect(splash).toContain("family-A dependency");
  });
});

// Task 12 (2026-07-28 plan, "refusals that bite") — the prose CALLS the new commands
// (precheck/present/probe/--reviewer) instead of restating the rules three mechanisms (Tasks
// 3-11) now enforce on disk. These pins are the mechanical-parity test for that rewrite: a
// SKILL.md that reverted to prose-only wording (or dropped the command names) goes red here.
describe("Task 12 — the flow calls the gates instead of restating them", () => {
  it("the surfacing rule names the command that performs it, not just the duty", () => {
    expect(splash).toContain("bun lib/host/cli.ts present --path");
  });

  it("the surfacing rule no longer claims that no mechanical signal exists", () => {
    expect(splash).not.toContain(
      'No live mechanical "the user saw it" signal exists',
    );
    expect(splash).not.toContain("no live mechanical");
  });

  it("the hand-over step checks the folder before naming it to the journalist", () => {
    expect(splash).toContain("bun lib/host/cli.ts precheck --stage export");
  });

  it("the render-review hands over commands, and names who read the editorial half", () => {
    expect(splash).toContain("--reviewer");
    expect(splash).toContain('kind: "mechanical"');
  });
});

// The bridge between the two chains, first production segment beyond the guarantees family A laid.
// INPUT's readiness now comes from the LOOP (`lib/host/cli.ts newsroom`) rather than from
// `preflight.mjs`, because the loop's answer is strictly larger and the difference is one the
// journalist feels: preflight reports six production engines, `newsroom` reports eleven
// capabilities — the same six PLUS the five delivery routes, each with a status. Without that, INPUT
// could say what he can MAKE and nothing about how he can PUBLISH, so a missing delivery route
// surfaced at EXPORT, on a finished visual.
//
// Key COLLECTION deliberately stays in the prose: the loop has no command for it (measured in
// docs/splash/two-chains-gap-2026-07-28.md, "INPUT — collecter une clé manquante: aucune commande").
// The skin stays where it is better; only the gate descends.
describe("INPUT readiness comes from the loop (bridge, 2026-07-30)", () => {
  it("names the loop command, not preflight, as the readiness source", () => {
    expect(splash).toContain("bun lib/host/cli.ts newsroom");
  });
  it("states the measured reason — eleven capabilities against six engines", () => {
    expect(splash).toContain("eleven");
    expect(splash).toContain("embed-cloudflare");
  });
  it("still collects keys through save-key.mjs, which the loop cannot do", () => {
    expect(splash).toContain("save-key.mjs");
  });
  it("says the publishing line at INPUT, not at EXPORT", () => {
    expect(splash).toContain("Then one line on PUBLISHING");
  });
});

// Feedback from a real manual run, 2026-07-30. Three of its eight points were rules that already
// existed and were simply not applied — those got mechanical checks in the harness instead of more
// prose. These three had no rule at all, or one too weak to bind, so they are stated here. The
// distinction matters: restating a rule that is already ignored is how a document grows without
// changing anything.
describe("what the journalist reads at PROPOSITION (manual-run feedback, 2026-07-30)", () => {
  it("each option must say what it SHOWS, not only what it is", () => {
    expect(splash).toContain("what it SHOWS that the others do not");
    // The failure it replaces: two options described correctly and indistinguishably.
    expect(splash).toContain("A description is not a reason");
  });
  it("a narrative format is offered on the same footing, not as an afterthought", () => {
    expect(splash).toContain(
      "A narrative format is an option, not an afterthought",
    );
    expect(splash).toContain("ON THE SAME FOOTING");
  });
  it("a ruled-out narrative is said, not silently dropped", () => {
    expect(splash).toContain("If narrative was ruled out, say so");
  });
  it("INPUT says the key check RAN, not only what it found", () => {
    expect(splash).toContain("Say that the check RAN");
  });
});

// ── REGISTRY E24 (the second half) ───────────────────────────────────────────────────────────
// A tool failure reaches the journalist as a FACT and a NEXT ACTION, never as a diagnosis, and
// never as a decision he is asked to arbitrate. Observed 2026-08-05 on a real run: the export
// refusal was relayed to him with the offending file and line numbers, three sha256 digests, and
// a choice between "take the file as-is" and "fix the defect first" — none of which is a
// journalist's to read or to make.
//
// These are STRING PINS, and they are worth exactly what a string pin is worth: they catch a
// rewrite that DROPS the rule, not a run that ignores it. Nothing mechanical can read a chat
// message and tell a fact from a diagnosis; this is a prose contract the orchestrator executes.
describe("E24 — a failure is told, its internals are not", () => {
  it("§Voice states that the failure reaches him but the diagnosis does not", () => {
    expect(splash).toContain(
      "A FAILURE is never hidden and never softened — but it is not a bug report handed to the",
    );
    expect(splash).toContain("he will never fix a Splash defect");
    expect(splash).toContain("the fact and the next action, never the cause");
  });

  it("the Never list forbids handing him a diagnosis or asking him to arbitrate a defect", () => {
    expect(splash).toContain(
      "Never hand the journalist a technical diagnosis, and never ask him to arbitrate a Splash defect",
    );
  });

  it("the PRODUCTION and EXPORT hard stops say what 'surfaced' means", () => {
    // Both phases used to say a failure is surfaced "AS-IS", which is what licensed pasting the
    // engine's internals at him. Each now scopes that word.
    expect(splash).toContain(
      '**"Surfaced" means the FACT and the NEXT ACTION, not the engine\'s internals**',
    );
    expect(splash).toContain(
      "**Tell him the FACT and the NEXT ACTION, never the engine's internals**",
    );
  });

  it("keeps the diagnosis written down somewhere — suppressed from the chat, not from the record", () => {
    expect(splash).toContain(
      "Suppressing the technical detail from the CHAT is not suppressing it from the RECORD",
    );
  });
});

// ★ THE NARRATIVE KIND IS PROPOSED, NOT DEFAULTED. The guard refuses a video that was never told
// its kind (`narrative-walk-gate.ts`), so meeting that refusal means the question was skipped —
// and the question lives in prose alone. These pins are the tripwire against a rewrite that drops
// it: a proposal step nobody prescribes is a step that stops happening, which is exactly how the
// walk proposal was lost on this chain before.
describe("the narrative kind is asked before a video is produced", () => {
  it("the flow prescribes proposing the kinds, read from the registry", () => {
    expect(splash).toContain("bun lib/host/cli.ts narrative-kinds --producer");
    expect(splash).toContain("A VIDEO IS NOT ONE THING");
  });

  it("it says what a reveal costs — no sentence at all, known BEFORE choosing", () => {
    expect(splash).toContain("shows **no sentence at all**");
  });

  it("it says where the answer is written down — both places, or the render drops it", () => {
    expect(splash).toContain("`narrativeKind` on the proposal");
    expect(splash).toContain("`cameraMode` on the spec");
  });

  it("it chains: a narrating kind owes the storyboard, a reveal does not", () => {
    const kind = splash.slice(splash.indexOf("A VIDEO IS NOT ONE THING"));
    expect(kind).toContain("the storyboard is proposed straight away");
    expect(kind).toContain("nothing is owed: produce");
  });
});
