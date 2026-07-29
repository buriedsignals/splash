# Family D — the delivery says WHERE (placement) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the placement of each delivered element (WHERE it goes in the article) a thing the CODE says at hand-over, and make the anchor a fact on disk instead of a sentence in the model's context — plus stop a chart scrolly from opening on the same sentence it closes on.

**Architecture:** Three seams, in this order. (1) A pure placement module (`skills/splash/src/placement.ts`) turns an `AcceptedProposal` entry into a resolved placement, and a copy layer (`lib/newsroom/ui-copy.ts`) turns that into the journalist's sentences — so nothing about placement is composed by the orchestrator any more. (2) `export-code.mjs` emits that block at every hand-over, beside the `EXPORT_FORMS_PROPOSAL` block it already emits, and REFUSES to deliver an element whose run read an article but whose proposal declares no placement — the obligation of §6 of the spec biting where it is owed. (3) `suggest-article` gains a sanctioned writer that persists its opportunities (with their anchors) into the run directory, exactly as `candidates.json` is persisted for `suggest-chart`, so "an article existed" and "the article carried anchors" become facts on disk. D09 is a separate, narrow change at the end: the scrolly's opening line gets its own field, its default stops being the title, and the takeaway stops borrowing the intro's text.

**Tech Stack:** Bun, TypeScript, `bun:test`, plain `.mjs` CLI scripts (the repo's convention for the splash spine's scripts), React/TSX for the scrolly renderer.

**Source spec:** `docs/superpowers/specs/2026-07-28-family-d-delivery-design.md`
**Register:** `docs/splash/sweep-2026-07-28-triage.md` § 8 (family D: D03, D09)
**Dependency:** family A (`docs/superpowers/specs/2026-07-28-refusals-that-bite-design.md`) makes refusals terminal. Until it lands, every refusal added here is a refusal a free orchestrator can still step around; the refusals below are written to be *costly and visible*, never to claim they are impossible to skip.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Runtime is Bun, exclusively.** Never `npm`, never `node`. Tests are `bun:test`. The gate is `bun run check` (from the repo root; 21 checks after this plan — see Task 4).
- **Code, comments, identifiers, commit messages, branch names: English, without exception.** Journalist-facing COPY STRINGS may be French/German/Italian inside the locale tables (`lib/newsroom/ui-copy.ts`), which is the existing convention — the identifiers around them stay English.
- **No mention of Claude/Anthropic in any published artifact** — commits, PR bodies, docs, code comments.
- **No mocks for an external API** — real keys, real failures. Nothing in this plan calls an external API; if a step ever reaches one, it uses the real credential or the suite self-skips (the repo's existing pattern, `scripts/check.mjs` header).
- **Mutation verification is mandatory.** Every task that lays a guard includes a step that puts the buggy behaviour BACK, runs the test, and records the count of failing assertions observed. This repo measured a verification path that avoided the breaking site three times in one day (`memory: feedback-verification-path-avoids-the-break`). A green test that does not go red when the code is reverted has proved nothing.
- **No numeric claim without the command that establishes it.** "24/83" is an UPPER BOUND, not a measurement (see "Numbers you may not quote" below) — no task may be justified by it as if it were exact.
- **Verify the delivered thing, not the proof.** Grepping a single-file bundle is not evidence (`CLAUDE.md`, colour false-alarm). Where a step asserts on rendered output, it reads the DOM or the file that ships.

### Numbers you may not quote as measurements

- **D03's `24 / 83` is a HIGH BOUND.** The harness check arms on any `\banchor\b` in a serialized tool input (`../splash-harness/src/checks.ts:1321-1372`), including a beat's DATA anchor (`lib/loop/manifest.ts:183`) and any file that merely contains the word. The defect and its cause are established (see below); its prevalence must be re-sampled before it is cited. No task in this plan is sized by that number.
- **D09 is 1 / 83.** Its mechanism is deterministic (Task 7), which is why it is worth closing at all.

### What was verified in the code before this plan was written (and where the spec is wrong)

Read this before Task 1 — three of these change what the tasks do.

1. **`export-code.mjs` never opens `accepted.json` itself.** The spec says "l'ancre est lue sur `accepted.json` — que le script résout déjà" (§ 3) and cites `:197`. Line 197 is `assertChainProvenance(report, id, exportDir, resultsPath)` (`skills/splash/scripts/export-code.mjs:196`); the file is resolved and parsed INSIDE `skills/splash/src/render-provenance.ts` (`const acceptedPath = join(runDir, "accepted.json")`, where `runDir = dirname(resolve(reportPath))`). `export-code.mjs` has no accepted.json path resolution of its own. **Consequence: Task 2 must provide the reader; Task 3 cannot "just read what the script already has."**
2. **`lib/host/path-safety.ts` does NOT need a new entry for `opportunities.json`.** Its allowlist (`PRODUCIBLE_NAMES`) guards the destructive `rmSync` on a per-element **outDir** (`exports/<slug>/<id>/`), and the file itself records that `report.json` is deliberately absent from it "because it belongs to the RUN directory, the parent of outDir". `accepted.json` and `candidates.json` are absent for the same reason. `opportunities.json` lands in that same run directory, so it is out of that guard's scope. **Task 4 adds nothing to `path-safety.ts`.** (The brief that commissioned this plan asked for this to be checked; it was, and the answer is no.)
3. **`Scrolly.tsx:187` is a MAP branch, not the chart branch.** The spec's § 4 chain lists `insight: config.insight ?? config.title` at `:187/:209/:270/:293` as part of the chart-scrolly mechanism. Those four sites are the symbol / hex-grid / dot-density / locator map branches. The CHART branch is `skills/scrolly/src/Scrolly.tsx:158-161` and passes `(config as {insight?: string}).insight` with **no title fallback**.
4. **The spec's D09 chain is incomplete: it stops one module short of the rendered DOM.** `chart-story.ts:346` and `:524` are correct as quoted, but neither produces the text a reader sees. The card prose is built in `skills/scrolly/src/chart-chapters.ts:15-20`, where `const desc = meta.description?.trim() ? meta.description : meta.title` is (a) the fallback that puts the TITLE in the opening card and (b) the fallback the TAKEAWAY card lands on when its copy is empty — which is how intro and takeaway become the same string. Fixing only `chart-story.ts` would not change one pixel.
5. **A deterministic guard for D09 already exists and has never run on the produce path.** `auditDistinctBookends` (`skills/scrolly/src/conformance.ts`) compares the first and last step's prose and reports "intro and takeaway are identical". It is called only by `skills/scrolly/scripts/audit-scrolly.mjs`, a `bun run audit:scrolly` dev script hard-wired to a choropleth sample (`computeChoropleth` + `deriveMapStory`) — it cannot audit a chart scrolly at all, and `skills/scrolly/scripts/produce.mjs` never invokes it. Task 7 uses it as the test ORACLE rather than writing a second comparator.
6. **`checkScrollyConformance` already requires a non-empty `description`** (`skills/scrolly/src/conformance.ts:22-24`), and `skills/scrolly/SKILL.md:38-41` states the furniture rule "the insight title in a persistent header, the description as the intro step caption". `skills/scrolly/src/Scrolly.tsx:538` states it again: *"Shown once here; never repeated as a step caption."* And `skills/scrolly/tests/chart-chapters.test.ts` names the invariant in a test title — "the title is never a caption" — which passes only because its fixture happens to carry a description. **Three declarations of a rule the code breaks the moment a description is missing.**
7. **`assertDelivered` is as strict as the spec says.** `skills/splash/src/export-guard.ts:125-128` and `:138-141`: a static or video delivery must be "exactly the media file, no extra files". This is why decision 1 is option (a) and no placement FILE is written into the delivered folder.
8. **`AcceptedProposal.anchor` is a sibling of `spec`, not a field inside it** (`skills/splash/src/producer-spec.ts:61`, spec at `:20`). This matters: `assertChainProvenance` hashes `canonicalJson(ap.spec)` (`render-provenance.ts`), so adding or correcting an entry-level `anchor` / `freeStanding` after acceptance does NOT invalidate the chain hash. A journalist can be unblocked from Task 5's refusal without re-producing.
9. **The delivery has exactly six hand-over points.** `done({...})` in `skills/splash/scripts/export-code.mjs` at lines 261, 275, 338, 377, 399, 501 (static, video, html, code-source ×2, embed). Task 3 wraps `done` once rather than editing six call sites.
10. **`exportProposalCopy` ships two languages (en, fr)**; `signoffCopy` ships four (en, fr, de, it). The placement copy joins the export block, so it follows `exportProposalCopy`: **en + fr, English fallback** (`lib/newsroom/ui-copy.ts:65-70`).

### Decisions carried in from the brief (§ 7 of the spec, now closed)

1. **The placement travels in the MESSAGE, not in the delivered folder** (option a). Option (b) would amend `assertDelivered`, one of the few guards in this repo that genuinely bites (`skills/splash/tests/export-guard.test.ts:76` — a `README.txt` beside a `chart.png` throws). What changes is that the message stops being prose-enforced: it is emitted by code (Task 3).
2. **Both grains are kept, and the message says which one is authoritative: the QUOTE.** A paragraph index rots the moment the article is edited between analysis and delivery, which is the normal life of a live article; a quotation survives a reorganisation. The copy says so (Task 1).
3. **The anchor becomes a fact on disk** (option b): `suggest-article` persists its opportunities (Task 4). Without it, family D stays prose-enforced — the very illness it claims to cure.
4. **D09 gets option (c) in its narrow form: stop opening a scrolly on its title.** NOT (b): a mechanical refusal of `intro === takeaway` would refuse the product's DEFAULT composition (`lib/loop/assemble/chart-native.ts:20` sets `title = brief.angle.confirmedTakeaway`), which is a self-inflicted wound. NOT (a): the finding keeps coming back. The opening gets its own field with a distinct default, and equality is left unrefused (Task 7).

### Decisions taken while writing this plan (no answer was available)

- **The placement block is emitted at DELIVERY, not at the a/b/c proposal.** `emitProposal` (phase 1, `export-code.mjs:517`) builds nothing and delivers nothing; the placement is the hand-over's sentence. So `done()` is where it goes — which also means the interactive/scrolly path emits it once, after the chosen form is materialised.
- **"An article existed" is decided by two signals, and the file wins.** Hard: `opportunities.json` present in the run directory (Task 4). Declared: `skillsInvoked` lists `suggest-article` (`producer-spec.ts:53`, already validated by GUARD 5). One predicate, `articleEvidence()`, reports which one fired, so a refusal always names its own evidence.
- **The obligation bites at EXPORT, not at the spine's validation gate.** Failing `produce-all` for a missing placement declaration would block a correct visual over a hand-over field. Export is where the placement is owed, and the fix there is cheap (edit the entry, re-run export — the chain hash is over `spec`, see finding 8).
- **D09 stays on the CHART track.** `skills/scrolly/src/chapters.ts:71` carries the byte-identical `desc` fallback for the MAP track, but its opening step also sets an OVERVIEW camera; dropping or re-pointing it is a rendered-behaviour change that a unit test cannot certify. It is written up as a follow-up with its line reference, not smuggled into a "narrow" task.
- **A step with no prose is dropped from `steps`, not rendered empty.** `chartStoryToChapters` filters after mapping, so `ref` stays the BEAT index and every downstream consumer (`Scrolly.tsx`'s `currentBeatRef`, `lineCardTargets`) keeps working off `s.ref`.

### Follow-ups — write these down, do NOT implement them here

- **Durability of the placement, when the loop becomes the delivery path: option (c).** The right vector is the zip README (`lib/delivery/adapters/zip.ts:52-79`, `zipReadme`) with the anchor added to `DeliveryMetadata` (`lib/core/publishers.ts:14-24`, which today carries `title, altText, source, credit, lang, width, height`). That path has no anchor at all today, and giving it one re-opens § 5 of the spec (the loop has no ANALYSE stage — `docs/splash/two-chains-gap-2026-07-28.md:236-241`). Not in this plan.
- **The MAP track's identical opening fallback**, `skills/scrolly/src/chapters.ts:71`. Same one-line pattern as the chart track, but the title/establish steps also carry the overview camera — needs a rendered proof, not a unit test.
- **Wiring `auditDistinctBookends` into `skills/scrolly/scripts/produce.mjs` as a non-blocking warning** for both tracks (today it runs only in `scripts/audit-scrolly.mjs`, choropleth-only). Task 7 uses it as a test oracle; putting it on the produce path is a separate, behaviour-visible change.
- **Hardening the harness check** `check:placement-told-at-delivery` (`../splash-harness/src/checks.ts:1321-1372`) so the prevalence number can be re-sampled honestly. Other repo, other spec.
- **Linking an accepted proposal back to its opportunity by id**, so a DROPPED anchor can be told apart from a legitimately unanchored opportunity. Task 5 deliberately does not need it (it requires a DECLARATION either way), but it is what would make the observability warning precise instead of honest-but-blunt.

---

## File Structure

**Created**
- `skills/splash/src/placement.ts` — pure: resolve a placement from an accepted entry, decide whether an article existed, build the refusal. No fs, no I/O except one narrowly-scoped reader.
- `skills/splash/tests/placement.test.ts` — unit tests for the above.
- `skills/suggest-article/scripts/save-opportunities.mjs` — the sanctioned writer for `opportunities.json`, validating at write time (mirrors `skills/splash/scripts/save-decision.mjs`).
- `skills/suggest-article/eval/tests/save-opportunities.test.ts` — CLI tests for it. **It lives under `eval/tests/` because `skills/suggest-article/eval` is the directory `scripts/check.mjs` runs `bun test` in** (`TEST_DIRS`); a test placed beside the script would never run in the gate.

**Modified**
- `lib/newsroom/ui-copy.ts` — `PlacementCopy` + `placementCopy(lang)` (en, fr).
- `lib/newsroom/ui-copy.test.ts` — its tests.
- `skills/splash/src/producer-spec.ts` — `AcceptedProposal.freeStanding?: true`, and the `anchor` comment stops saying it has no reader.
- `skills/splash/scripts/export-code.mjs` — read the entry, refuse an undeclared placement, emit the block from `done`.
- `skills/splash/scripts/export-code.test.ts` — CLI-level coverage.
- `skills/splash/SKILL.md` — §5b (`freeStanding`, the writer step), §6 (relay the emitted block; never compose it).
- `skills/suggest-article/SKILL.md` — step 6 persists the opportunities.
- `skills/splash/tests/skill-doc-parity.test.ts` — placement leaves the "survivor rules" block (it now has a mechanical backstop) and is pinned to the new prose.
- `docs/splash/guardrails.md` — one row per new guard.
- `skills/scrolly/src/ScrollyChart.tsx` — `ChartScrollyConfig.opening?: string`.
- `skills/scrolly/src/chart-chapters.ts` — the opening resolution; the title leaves the fallback chain; empty-prose steps are dropped.
- `skills/scrolly/src/Scrolly.tsx` — thread `config.opening`.
- `skills/scrolly/tests/chart-chapters.test.ts` — the two failing cases.
- `skills/scrolly/SKILL.md` — the furniture rule names `opening`.

**Task order, and why it is forced**

1 → 2 → 3 are a straight dependency chain: the copy is data the pure module formats, and the pure module is what the script calls. 4 (the file on disk) must precede 5 (the obligation), because 5's hard signal IS that file — implementing 5 first would leave it resting on the declared signal alone, which is the prose-enforcement family D exists to end. 6 (docs, parity pins, guardrails) comes after 3 and 5 because it documents what those two actually shipped, and because `skill-doc-parity.test.ts` may not move the placement rule out of the "survivor" block until the backstop exists. 7 (D09) is independent of all of it and goes last: it is the 1/83 defect, and a reviewer must be able to reject it without touching the 24-case one.

---

## Task 1: The placement, as journalist-facing copy

The sentences a person reads. Kept in the locale layer, beside the export-forms block they will be printed next to, because "an emitted block is code, and code cannot be told to answer in English" (`lib/newsroom/ui-copy.ts:1-6`).

**Files:**
- Modify: `lib/newsroom/ui-copy.ts` (add after the `ExportProposalCopy` section, before "── The source question ──" at `:72`)
- Test: `lib/newsroom/ui-copy.test.ts`

**Interfaces:**
- Consumes: nothing (leaf).
- Produces:
  - `export type PlacementCopy = { intro: string; anchored: (paragraphIndex: number, quote: string) => string; anchoredQuoteOnly: (quote: string) => string; anchoredIndexOnly: (paragraphIndex: number) => string; freeStanding: string; advisory: string; }`
  - `export function placementCopy(lang: string): PlacementCopy`

- [ ] **Step 1: Write the failing test**

Append to `lib/newsroom/ui-copy.test.ts`:

```ts
// WHERE the element goes in the article, said to a person. Emitted by export-code beside the
// delivery-form block, so it lives in the same locale layer as that block's copy.
describe("the placement, said to a person", () => {
  it("answers in English for an unknown language", () => {
    expect(placementCopy("rm-CH").intro).toBe(placementCopy("en").intro);
  });

  it("resolves a regional tag to its base language", () => {
    expect(placementCopy("fr-CH").intro).toBe(placementCopy("fr").intro);
  });

  it("offers the same set of lines in every language it declares", () => {
    const en = Object.keys(placementCopy("en")).sort();
    expect(Object.keys(placementCopy("fr")).sort()).toEqual(en);
  });

  it("names the quote as what to trust and the paragraph number as an indication", () => {
    const en = placementCopy("en").anchored(5, "cross-border workers nearly doubled");
    expect(en).toContain("5");
    expect(en).toContain("cross-border workers nearly doubled");
    expect(en.toLowerCase()).toContain("indicative");
    expect(en.toLowerCase()).toContain("quote");
    const fr = placementCopy("fr").anchored(5, "les frontaliers ont presque doublé");
    expect(fr).toContain("§5");
    expect(fr.toLowerCase()).toContain("indication");
    expect(fr.toLowerCase()).toContain("citation");
  });

  it("says free-standing without inventing a paragraph", () => {
    for (const lang of ["en", "fr"]) {
      expect(placementCopy(lang).freeStanding).not.toMatch(/§|\bparagraph\b/i);
      expect(placementCopy(lang).freeStanding.length).toBeGreaterThan(20);
    }
  });

  it("keeps the placement advisory — the journalist positions it", () => {
    expect(placementCopy("en").advisory.toLowerCase()).toContain("advisory");
    expect(placementCopy("fr").advisory.toLowerCase()).toContain("indicatif");
  });
});
```

And extend the import at the top of the file:

```ts
import {
  exportProposalCopy,
  placementCopy,
  signoffCopy,
  sourceQuestionCopy,
} from "./ui-copy";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test newsroom/ui-copy.test.ts`
Expected: FAIL — `placementCopy` is not exported from `./ui-copy` (import error, whole file red).

- [ ] **Step 3: Write minimal implementation**

Insert into `lib/newsroom/ui-copy.ts` immediately after `exportProposalCopy` (i.e. after line 70, before the `── The source question ──` banner):

```ts
// ── Where it goes in the article ─────────────────────────────────────────────────────────────
//
// The hand-over's other sentence. `suggest-article` computes an anchor per opportunity
// ({ paragraphIndex, quote }); until now nothing but the orchestrator's memory carried it to the
// journalist, and memory is exactly what failed. export-code prints these lines from the accepted
// proposal, beside the delivery-form block.
//
// TWO GRAINS, ONE AUTHORITY. Both are kept, and the copy says which one to trust: the QUOTE. A
// paragraph number rots the moment the article is edited between the analysis and the delivery —
// the normal life of a live article — while a quotation survives a reorganisation. So the number
// is offered as an indication and the sentence as the thing to look for.
export type PlacementCopy = {
  /** Header line of the block. */
  intro: string;
  /** Both grains present. */
  anchored: (paragraphIndex: number, quote: string) => string;
  /** A quote but no paragraph number. */
  anchoredQuoteOnly: (quote: string) => string;
  /** A paragraph number but no quote — the weakest case, and it says so. */
  anchoredIndexOnly: (paragraphIndex: number) => string;
  /** The opportunity is bound to no passage. Never a made-up paragraph. */
  freeStanding: string;
  /** Splash says where; the journalist decides. */
  advisory: string;
};

const EN_PLACEMENT: PlacementCopy = {
  intro: "Where this goes in your article:",
  anchored: (paragraphIndex, quote) =>
    `  around §${paragraphIndex} (indicative), next to « ${quote} » — the quote is what to trust: if the article has moved since, look for that sentence, not the number.`,
  anchoredQuoteOnly: (quote) =>
    `  next to « ${quote} » — look for that sentence in your article; the quote is what to trust.`,
  anchoredIndexOnly: (paragraphIndex) =>
    `  around §${paragraphIndex} — a paragraph number from the article as it was read, and nothing quoted to confirm it: check it against your current draft.`,
  freeStanding:
    "  free-standing — this element is not tied to any passage; place it wherever it serves the piece.",
  advisory: "Placement is advisory — you position it.",
};

const FR_PLACEMENT: PlacementCopy = {
  intro: "Où placer cet élément dans votre article :",
  anchored: (paragraphIndex, quote) =>
    `  autour du §${paragraphIndex} (indication), près de « ${quote} » — c'est la citation qui fait foi : si l'article a bougé depuis, cherchez la phrase, pas le numéro.`,
  anchoredQuoteOnly: (quote) =>
    `  près de « ${quote} » — cherchez cette phrase dans votre article ; c'est la citation qui fait foi.`,
  anchoredIndexOnly: (paragraphIndex) =>
    `  autour du §${paragraphIndex} — un numéro de paragraphe issu de l'article tel qu'il a été lu, sans citation pour le confirmer : vérifiez-le sur votre version actuelle.`,
  freeStanding:
    "  élément autonome — il n'est rattaché à aucun passage ; placez-le là où il sert le récit.",
  advisory: "Le placement est indicatif — c'est vous qui positionnez.",
};

const PLACEMENT_TABLE: Record<string, PlacementCopy> = {
  en: EN_PLACEMENT,
  fr: FR_PLACEMENT,
};

export function placementCopy(lang: string): PlacementCopy {
  const base = (lang || DEFAULT_UI_LANG).toLowerCase().split("-")[0]!;
  return PLACEMENT_TABLE[base] ?? EN_PLACEMENT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test newsroom/ui-copy.test.ts`
Expected: PASS — the six new `it()` cases green, and the pre-existing cases in the file still green.

- [ ] **Step 5: Typecheck**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bunx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add lib/newsroom/ui-copy.ts lib/newsroom/ui-copy.test.ts
git commit -m "feat(placement): journalist-facing copy for where an element goes in the article"
```

---

## Task 2: `placement.ts` — resolve a placement from the accepted proposal

The pure half. Decides what the delivery has to say, and refuses to invent anything it was not given.

**Files:**
- Create: `skills/splash/src/placement.ts`
- Test: `skills/splash/tests/placement.test.ts`

**Interfaces:**
- Consumes: `PlacementCopy`, `placementCopy` from Task 1 (`lib/newsroom/ui-copy.ts`); `AcceptedProposal` from `skills/splash/src/producer-spec.ts`.
- Produces:
  - `export type Placement = { kind: "anchored"; paragraphIndex?: number; quote?: string } | { kind: "free-standing" } | { kind: "undeclared" }`
  - `export function resolvePlacement(entry: unknown): Placement`
  - `export function placementLines(placement: Placement, copy: PlacementCopy): string[]`
  - `export function placementBlock(proposalId: string, placement: Placement, copy: PlacementCopy): string`

- [ ] **Step 1: Write the failing test**

Create `skills/splash/tests/placement.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  placementBlock,
  placementLines,
  resolvePlacement,
} from "../src/placement";
import { placementCopy } from "../../../lib/newsroom/ui-copy";

const en = placementCopy("en");

describe("resolvePlacement", () => {
  it("reads both grains off an anchor", () => {
    expect(
      resolvePlacement({ anchor: { paragraphIndex: 5, quote: "the shutters closed" } }),
    ).toEqual({ kind: "anchored", paragraphIndex: 5, quote: "the shutters closed" });
  });

  it("keeps a quote-only anchor (the grain that survives an edit)", () => {
    expect(resolvePlacement({ anchor: { quote: "the shutters closed" } })).toEqual({
      kind: "anchored",
      quote: "the shutters closed",
    });
  });

  it("keeps an index-only anchor", () => {
    expect(resolvePlacement({ anchor: { paragraphIndex: 3 } })).toEqual({
      kind: "anchored",
      paragraphIndex: 3,
    });
  });

  it("treats an empty or whitespace quote as no quote", () => {
    expect(resolvePlacement({ anchor: { paragraphIndex: 3, quote: "   " } })).toEqual({
      kind: "anchored",
      paragraphIndex: 3,
    });
  });

  it("refuses a non-positive or non-integer paragraph index rather than printing it", () => {
    expect(resolvePlacement({ anchor: { paragraphIndex: 0, quote: "q" } })).toEqual({
      kind: "anchored",
      quote: "q",
    });
    expect(resolvePlacement({ anchor: { paragraphIndex: 2.5, quote: "q" } })).toEqual({
      kind: "anchored",
      quote: "q",
    });
  });

  it("reads an explicit free-standing declaration", () => {
    expect(resolvePlacement({ freeStanding: true })).toEqual({ kind: "free-standing" });
  });

  it("an anchor with nothing usable in it is NOT a placement", () => {
    expect(resolvePlacement({ anchor: {} })).toEqual({ kind: "undeclared" });
    expect(resolvePlacement({ anchor: { quote: "" } })).toEqual({ kind: "undeclared" });
  });

  it("declaring both an anchor and free-standing keeps the anchor (the more specific claim)", () => {
    expect(
      resolvePlacement({ freeStanding: true, anchor: { quote: "the shutters closed" } }),
    ).toEqual({ kind: "anchored", quote: "the shutters closed" });
  });

  it("silence is undeclared — never guessed into free-standing", () => {
    expect(resolvePlacement({})).toEqual({ kind: "undeclared" });
    expect(resolvePlacement(null)).toEqual({ kind: "undeclared" });
    expect(resolvePlacement(undefined)).toEqual({ kind: "undeclared" });
    expect(resolvePlacement("not an object")).toEqual({ kind: "undeclared" });
  });
});

describe("placementLines", () => {
  it("prints both grains with the quote marked authoritative", () => {
    const lines = placementLines(
      { kind: "anchored", paragraphIndex: 5, quote: "the shutters closed" },
      en,
    );
    expect(lines[0]).toBe(en.intro);
    expect(lines[1]).toContain("the shutters closed");
    expect(lines[1]).toContain("5");
    expect(lines[lines.length - 1]).toBe(en.advisory);
  });

  it("prints the quote-only line when there is no paragraph number", () => {
    const lines = placementLines({ kind: "anchored", quote: "the shutters closed" }, en);
    expect(lines[1]).toBe(en.anchoredQuoteOnly("the shutters closed"));
  });

  it("prints the index-only line when there is no quote", () => {
    const lines = placementLines({ kind: "anchored", paragraphIndex: 3 }, en);
    expect(lines[1]).toBe(en.anchoredIndexOnly(3));
  });

  it("says free-standing, and never invents a paragraph", () => {
    const lines = placementLines({ kind: "free-standing" }, en);
    expect(lines[1]).toBe(en.freeStanding);
    expect(lines.join(" ")).not.toContain("§");
  });

  it("says nothing at all when nothing was declared", () => {
    expect(placementLines({ kind: "undeclared" }, en)).toEqual([]);
  });
});

describe("placementBlock", () => {
  it("wraps the lines in relay markers so the orchestrator prints them verbatim", () => {
    const block = placementBlock(
      "e1",
      { kind: "anchored", paragraphIndex: 5, quote: "the shutters closed" },
      en,
    );
    expect(block.startsWith("SPLASH_PLACEMENT")).toBe(true);
    expect(block.endsWith("END_SPLASH_PLACEMENT")).toBe(true);
    expect(block).toContain("e1");
    expect(block).toContain("the shutters closed");
  });

  it("is the empty string when there is nothing to say", () => {
    expect(placementBlock("e1", { kind: "undeclared" }, en)).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/placement.test.ts`
Expected: FAIL — cannot resolve `../src/placement` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `skills/splash/src/placement.ts`:

```ts
// WHERE the delivered element goes in the article — resolved from the accepted proposal, said by
// CODE at hand-over.
//
// The defect this closes (register D03) was never a missing capability: suggest-article computes
// `anchor: { paragraphIndex, quote }` (skills/suggest-article/SKILL.md, step 6), the orchestrator is
// asked to copy it across at §5b, and EXPORT is asked to say it (skills/splash/SKILL.md §6). Three
// links, all prose, and the field at producer-spec.ts:61 had NO READER anywhere in the repo. Held
// spontaneously in a short manual run; missed when the hand-over arrives dozens of turns after the
// article was read. A memory defect, not a knowledge one — so the fix is a reader, not a reminder.
//
// PURE by design: no filesystem here (export-code.mjs owns the read, from the accepted.json that
// assertChainProvenance has already proved present and parseable), so every branch below is
// exercised by a plain unit test.
import type { PlacementCopy } from "../../../lib/newsroom/ui-copy";

/** What the delivery is able to say about this element's place in the article.
 *  `undeclared` is deliberately distinct from `free-standing`: "nobody said" is not "it belongs
 *  nowhere", and collapsing the two is how a dropped anchor would disappear silently. */
export type Placement =
  | { kind: "anchored"; paragraphIndex?: number; quote?: string }
  | { kind: "free-standing" }
  | { kind: "undeclared" };

function usableQuote(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

// A paragraph index is only printable when it is a positive integer. A 0, a float or a negative is
// a mis-copied field, and printing "around §0" would send the journalist to a paragraph that does
// not exist — worse than saying nothing about the number and leaning on the quote.
function usableIndex(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;
}

export function resolvePlacement(entry: unknown): Placement {
  if (entry === null || typeof entry !== "object") return { kind: "undeclared" };
  const e = entry as { anchor?: unknown; freeStanding?: unknown };
  const anchor =
    e.anchor !== null && typeof e.anchor === "object"
      ? (e.anchor as { paragraphIndex?: unknown; quote?: unknown })
      : undefined;
  const quote = usableQuote(anchor?.quote);
  const paragraphIndex = usableIndex(anchor?.paragraphIndex);
  // An anchor with something usable in it wins over `freeStanding`: it is the more specific claim,
  // and a proposal carrying both is a copying slip, not a case to refuse at hand-over time.
  if (quote !== undefined || paragraphIndex !== undefined)
    return {
      kind: "anchored",
      ...(paragraphIndex !== undefined ? { paragraphIndex } : {}),
      ...(quote !== undefined ? { quote } : {}),
    };
  if (e.freeStanding === true) return { kind: "free-standing" };
  return { kind: "undeclared" };
}

/** The lines a person reads, in order. Empty when nothing was declared — this function never
 *  guesses a paragraph and never turns silence into a claim (SKILL.md §6: "never invent a
 *  paragraph"). */
export function placementLines(
  placement: Placement,
  copy: PlacementCopy,
): string[] {
  if (placement.kind === "undeclared") return [];
  if (placement.kind === "free-standing")
    return [copy.intro, copy.freeStanding, copy.advisory];
  const { paragraphIndex, quote } = placement;
  const line =
    paragraphIndex !== undefined && quote !== undefined
      ? copy.anchored(paragraphIndex, quote)
      : quote !== undefined
        ? copy.anchoredQuoteOnly(quote)
        : copy.anchoredIndexOnly(paragraphIndex!);
  return [copy.intro, line, copy.advisory];
}

/** The relay block, shaped like the delivery-form proposal export-code already emits
 *  (EXPORT_FORMS_PROPOSAL … END_EXPORT_FORMS_PROPOSAL): a fixed, machine-recognisable envelope the
 *  orchestrator prints VERBATIM instead of re-composing the sentence from memory. One element per
 *  block, so a multi-element hand-over produces one block each and never an undifferentiated dump. */
export function placementBlock(
  proposalId: string,
  placement: Placement,
  copy: PlacementCopy,
): string {
  const lines = placementLines(placement, copy);
  if (lines.length === 0) return "";
  return [`SPLASH_PLACEMENT ${proposalId}`, ...lines, "END_SPLASH_PLACEMENT"].join(
    "\n",
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/placement.test.ts`
Expected: PASS — 16 `it()` cases green.

- [ ] **Step 5: Mutation verification — put the bug back and watch it go red**

Temporarily change `resolvePlacement` so silence becomes a claim (the exact mistake the type separation exists to prevent):

```ts
  if (e.freeStanding === true) return { kind: "free-standing" };
  return { kind: "free-standing" }; // MUTATION: undeclared collapsed into free-standing
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/placement.test.ts`
Expected: FAIL — record the exact number of failing assertions in the commit body. Expect 4 failures: `"an anchor with nothing usable in it is NOT a placement"` (2 assertions in one case), `"silence is undeclared — never guessed into free-standing"`, `"says nothing at all when nothing was declared"`, `"is the empty string when there is nothing to say"`.

Then a second mutation, on the grain rule — restore the line above, and change `usableIndex` to accept anything numeric:

```ts
function usableIndex(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined; // MUTATION: 0 / 2.5 / -1 become printable
}
```

Run the same command. Expected: FAIL on `"refuses a non-positive or non-integer paragraph index rather than printing it"`. Revert both mutations and re-run to confirm green before committing.

- [ ] **Step 6: Typecheck**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/placement.ts skills/splash/tests/placement.test.ts
git commit -m "feat(placement): resolve a delivered element's placement from the accepted proposal

The anchor field (producer-spec.ts:61) had no reader anywhere in the repo. This is it:
pure, total, and unable to invent a paragraph it was not given.

Mutation-verified: collapsing undeclared into free-standing turns 4 assertions red;
accepting a non-positive paragraph index turns 1 red."
```

---

## Task 3: EXPORT emits the placement at every hand-over

The mouth. `export-code.mjs` already emits a fixed relay block for the a/b/c delivery forms, born of this same class of defect (`:583-623`, and the comment at `:616-620` cites the observed violation that created it). The placement joins it.

**Files:**
- Modify: `skills/splash/scripts/export-code.mjs` (imports at `:39-53`; the `done` helper at `:214`; the chain gate at `:196`)
- Test: `skills/splash/scripts/export-code.test.ts`

**Interfaces:**
- Consumes: `resolvePlacement`, `placementBlock` (Task 2); `placementCopy` (Task 1); the run directory convention `dirname(resolve(reportPath))` (established in `skills/splash/src/render-provenance.ts`).
- Produces (stdout contract, consumed by the orchestrator and by the QA harness):
  - `PLACEMENT_JSON {"proposalId":…,"placement":{…}}` — one line, machine payload.
  - `SPLASH_PLACEMENT <id>` … `END_SPLASH_PLACEMENT` — the human block, printed verbatim.
  - Both are emitted immediately after `EXPORT_CODE_RESULT`, on every delivered format and form.

- [ ] **Step 1: Write the failing test**

Append to `skills/splash/scripts/export-code.test.ts`:

```ts
// WHERE it goes in the article, emitted by CODE at hand-over. The anchor lives on the accepted
// proposal (producer-spec.ts:61); until now nothing read it, so the sentence depended on the
// orchestrator remembering, dozens of turns after the article was read.
function parsePlacement(stdout: string) {
  const marker = "PLACEMENT_JSON ";
  const line = stdout.split("\n").find((l) => l.startsWith(marker));
  if (!line) throw new Error("no PLACEMENT_JSON line in stdout:\n" + stdout);
  return JSON.parse(line.slice(marker.length));
}

// writeChainFixture writes a minimal accepted.json; these tests need entry-level fields on it, so
// they patch the file the fixture just wrote (the entry, never the spec — the chain hash is over
// `spec` alone, render-provenance.ts, so patching the entry keeps the fixture legitimate).
function patchAcceptedEntry(dir: string, id: string, patch: Record<string, unknown>) {
  const p = join(dir, "accepted.json");
  const list = JSON.parse(readFileSync(p, "utf8"));
  const entry = list.find((e: { id: string }) => e.id === id);
  Object.assign(entry, patch);
  writeFileSync(p, JSON.stringify(list));
}

describe("placement at hand-over", () => {
  it("states both grains on a static delivery, quote marked authoritative", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-static-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "static.png"), "png");
    const rep = report(dir, "e1", "static", {
      outputs: [join(outDir, "static.png")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));
    patchAcceptedEntry(dir, "e1", {
      anchor: { paragraphIndex: 5, quote: "the shutters closed" },
    });

    const out = run(outDir, join(dir, "e1-export"), resultsPath, "e1");
    expect(parsePlacement(out)).toEqual({
      proposalId: "e1",
      placement: { kind: "anchored", paragraphIndex: 5, quote: "the shutters closed" },
    });
    expect(out).toContain("SPLASH_PLACEMENT e1");
    expect(out).toContain("END_SPLASH_PLACEMENT");
    expect(out).toContain("the shutters closed");
    rmSync(dir, { recursive: true, force: true });
  });

  it("states free-standing on a video delivery, and invents no paragraph", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-video-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "landscape.mp4"), "mp4");
    const rep = report(dir, "e1", "video", {
      outputs: [join(outDir, "landscape.mp4")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));
    patchAcceptedEntry(dir, "e1", { freeStanding: true });

    const out = run(outDir, join(dir, "e1-export"), resultsPath, "e1");
    expect(parsePlacement(out).placement).toEqual({ kind: "free-standing" });
    const block = out.slice(
      out.indexOf("SPLASH_PLACEMENT"),
      out.indexOf("END_SPLASH_PLACEMENT"),
    );
    expect(block).not.toContain("§");
    rmSync(dir, { recursive: true, force: true });
  });

  it("emits nothing at all when no placement was declared and no article is evidenced", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-silent-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "static.png"), "png");
    const rep = report(dir, "e1", "static", {
      outputs: [join(outDir, "static.png")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));

    const out = run(outDir, join(dir, "e1-export"), resultsPath, "e1");
    expect(out).toContain("EXPORT_CODE_RESULT");
    expect(out).not.toContain("SPLASH_PLACEMENT");
    expect(out).not.toContain("PLACEMENT_JSON");
    rmSync(dir, { recursive: true, force: true });
  });

  it("states the placement on the CHOSEN form of an interactive delivery, not at the proposal", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-html-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "interactive.html"), "<html></html>");
    const rep = report(dir, "e1", "interactive", {
      outputs: [join(outDir, "interactive.html")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));
    patchAcceptedEntry(dir, "e1", { anchor: { quote: "the shutters closed" } });

    // Phase 1 — the a/b/c proposal builds nothing and delivers nothing: no placement yet.
    const proposal = run(outDir, join(dir, "e1-export"), resultsPath, "e1");
    expect(proposal).toContain("EXPORT_FORMS_JSON");
    expect(proposal).not.toContain("SPLASH_PLACEMENT");

    // Phase 2 — the form is chosen and the element is handed over: the placement is said.
    const delivered = run(outDir, join(dir, "e1-export"), resultsPath, "e1", "html");
    expect(parsePlacement(delivered).placement).toEqual({
      kind: "anchored",
      quote: "the shutters closed",
    });
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test scripts/export-code.test.ts`
Expected: FAIL — 3 of the 4 new cases red with `no PLACEMENT_JSON line in stdout` (the "emits nothing at all" case passes vacuously today, which is precisely why the other three exist).

- [ ] **Step 3: Write minimal implementation**

3a. Extend the import block of `skills/splash/scripts/export-code.mjs` (after the `resolve-profile.ts` import at `:47`):

```js
import { resolvePlacement, placementBlock } from "../src/placement.ts";
```

and extend the existing `lib/newsroom/ui-copy.ts` import (currently `exportProposalCopy, signoffCopy`) to:

```js
import {
  exportProposalCopy,
  placementCopy,
  signoffCopy,
} from "../../../lib/newsroom/ui-copy.ts";
```

3b. Immediately after the chain-provenance `try/catch` block (i.e. after the `}` that closes the `catch` at `:200`, before `const format = result.format;`), resolve the placement once:

```js
  // WHERE this element goes in the article (register D03). accepted.json is guaranteed present and
  // parseable at this point — assertChainProvenance above has just read it and would have refused
  // the export otherwise — so this read cannot introduce a new failure mode for a legitimate
  // delivery. It is still wrapped: a placement is a SENTENCE, and no sentence may cost a journalist
  // an artifact that passed every gate.
  //
  // The run directory is dirname(report.json), NOT exportDir — the same convention
  // assertChainProvenance documents at length (render-provenance.ts): accepted.json/candidates.json
  // live beside report.json, never inside the delivery folder.
  const runDir = dirname(resolve(resultsPath));
  let acceptedEntry = null;
  try {
    const list = JSON.parse(readFileSync(join(runDir, "accepted.json"), "utf8"));
    acceptedEntry = (Array.isArray(list) ? list : []).find(
      (a) => a && typeof a === "object" && a.id === id,
    );
  } catch {
    acceptedEntry = null;
  }
  const placement = resolvePlacement(acceptedEntry);
```

3c. Replace the `done` helper (`:214`) so every hand-over says it, without touching six call sites:

```js
  // EXPORT_CODE_RESULT is the machine line; the placement follows it on EVERY delivered format and
  // form (static, video, html, code-source, embed). Wrapping `done` rather than editing each of the
  // six hand-over sites is what keeps a future seventh from silently shipping without it.
  const done = (payload) => {
    console.log("EXPORT_CODE_RESULT " + JSON.stringify(payload));
    if (placement.kind === "undeclared") return;
    console.log(
      "PLACEMENT_JSON " + JSON.stringify({ proposalId: id, placement }),
    );
    console.log(placementBlock(id, placement, placementCopy(uiLang())));
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test scripts/export-code.test.ts`
Expected: PASS — all 4 new cases green, and every pre-existing case in the file still green (the file is the export gate's whole CLI surface; a regression here is a delivery regression).

- [ ] **Step 5: Mutation verification — put the bug back and watch it go red**

Temporarily restore the original `done`:

```js
  const done = (payload) =>
    console.log("EXPORT_CODE_RESULT " + JSON.stringify(payload)); // MUTATION: the delivery says nothing about WHERE
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test scripts/export-code.test.ts`
Expected: FAIL — record the count. Expect 3 failing cases (`"states both grains…"`, `"states free-standing…"`, `"states the placement on the CHOSEN form…"`), each reporting `no PLACEMENT_JSON line in stdout`. Revert and re-run to confirm green.

- [ ] **Step 6: Full splash suite + typecheck**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test`
Expected: tsc silent; the suite green. If anything reports the extra stdout lines, fix the assertion at its site — never by muting the emission.

- [ ] **Step 7: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/scripts/export-code.mjs skills/splash/scripts/export-code.test.ts
git commit -m "feat(export): the delivery says WHERE the element goes, emitted by code

Joins the a/b/c relay block that was born of the same class of defect. One wrapper on
done() covers all six hand-over points; the a/b/c proposal stays silent because it
delivers nothing.

Mutation-verified: restoring the bare done() turns 3 CLI cases red."
```

---

## Task 4: `suggest-article` writes its opportunities to disk

Decision 3. Today the ANALYSE stage produces no artifact at all: the ProposalSet lives in the model's context and nowhere else, which is why "was there an anchor?" has no answer a script can give. This makes it a file, exactly as `suggest-chart`'s menu became `candidates.json` (`skills/splash/SKILL.md:411`, and `candidateProvenanceIssue` then made that file a hard precondition of production).

**Files:**
- Create: `skills/suggest-article/scripts/save-opportunities.mjs`
- Test: `skills/suggest-article/eval/tests/save-opportunities.test.ts`
- Modify: `skills/suggest-article/SKILL.md` (step 6 and the output section)

**Interfaces:**
- Consumes: nothing from earlier tasks (independent).
- Produces:
  - CLI `bun skills/suggest-article/scripts/save-opportunities.mjs <runDir> --payload <json>` → writes `<runDir>/opportunities.json`, prints `{"written":"<abs path>","opportunities":N,"anchored":M}`.
  - Exported for tests: `export function opportunitiesWriteErrors(payload): string[]`.
  - File shape on disk: `{ "opportunities": [ { "anchor"?: { "paragraphIndex"?: number, "quote"?: string }, "claim": string, "intent": string } , … ] }`.

- [ ] **Step 1: Write the failing test**

Create `skills/suggest-article/eval/tests/save-opportunities.test.ts`:

```ts
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
      anchor: { paragraphIndex: 3, quote: "cross-border workers nearly doubled since 2015" },
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
  return execFileSync("bun", [script, runDir, "--payload", JSON.stringify(payload)], {
    encoding: "utf8",
  });
}

describe("opportunitiesWriteErrors", () => {
  it("accepts a proposal set with and without anchors", () => {
    expect(opportunitiesWriteErrors(GOOD)).toEqual([]);
  });

  it("refuses a payload with no proposals array", () => {
    expect(opportunitiesWriteErrors({}).join(" ")).toContain("proposals");
    expect(opportunitiesWriteErrors({ proposals: "x" }).join(" ")).toContain("proposals");
  });

  it("refuses an empty proposal set — an analysed article yields opportunities or a refusal, never a blank file", () => {
    expect(opportunitiesWriteErrors({ proposals: [] }).join(" ")).toContain("empty");
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/suggest-article/eval && bun test tests/save-opportunities.test.ts`
Expected: FAIL — cannot resolve `../../scripts/save-opportunities.mjs`.

- [ ] **Step 3: Write minimal implementation**

Create `skills/suggest-article/scripts/save-opportunities.mjs`:

```js
// CLI: bun save-opportunities.mjs <runDir> --payload <json> — the sanctioned way this skill's
// ProposalSet becomes a FACT ON DISK.
//
// Why it exists: ANALYSE produced no artifact at all. The anchors it computes ({ paragraphIndex,
// quote }, SKILL.md step 6) lived in the model's context and nowhere else, so "did the article
// carry an anchor for this element?" had no answer any script could give — and the placement the
// journalist is owed at hand-over rested on the orchestrator remembering, dozens of turns later.
// This is the same move suggest-chart's menu already made (candidates.json, splash/SKILL.md:411),
// which candidateProvenanceIssue then turned into a hard precondition of production.
//
// VERIFIES AT WRITE TIME, like save-decision.mjs: a payload that would produce a useless file is
// refused instead of persisted, so a downstream reader never has to distinguish "written badly"
// from "not written".
//
// It writes into the RUN directory (exports/<slug>/), beside accepted.json / candidates.json /
// report.json — never into a producer outDir, so lib/host/path-safety.ts's producible-name
// allowlist (which guards the destructive rm on an outDir) is not in play.
import { existsSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";

function usableQuote(v) {
  return typeof v === "string" && v.trim() !== "";
}

function usableIndex(v) {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

/** Pure write-eligibility policy, exported so every refusal branch is testable without shelling
 *  out. Returns [] when the payload may be persisted. */
export function opportunitiesWriteErrors(payload) {
  const errors = [];
  if (payload === null || typeof payload !== "object") {
    errors.push("payload must be a JSON object carrying a `proposals` array");
    return errors;
  }
  const proposals = payload.proposals;
  if (!Array.isArray(proposals)) {
    errors.push("payload has no `proposals` array (this skill's ProposalSet shape)");
    return errors;
  }
  if (proposals.length === 0) {
    errors.push(
      "`proposals` is empty — an analysed article yields opportunities or an explicit refusal, never a blank record",
    );
    return errors;
  }
  proposals.forEach((p, i) => {
    if (p === null || typeof p !== "object") {
      errors.push(`proposal ${i} is not an object`);
      return;
    }
    if (typeof p.claim !== "string" || p.claim.trim() === "")
      errors.push(`proposal ${i} has no \`claim\``);
    if (typeof p.intent !== "string" || p.intent.trim() === "")
      errors.push(`proposal ${i} has no \`intent\``);
    if (p.anchor !== undefined) {
      // An anchor is OPTIONAL (an opportunity bound to no passage is legitimate — splash/SKILL.md
      // §6). But an anchor that is PRESENT and carries nothing usable is a copying slip, and
      // persisting it would create a record that looks anchored and can say nothing.
      if (p.anchor === null || typeof p.anchor !== "object")
        errors.push(`proposal ${i} has an \`anchor\` that is not an object`);
      else if (!usableQuote(p.anchor.quote) && !usableIndex(p.anchor.paragraphIndex))
        errors.push(
          `proposal ${i} has an \`anchor\` with neither a non-empty \`quote\` nor a positive integer \`paragraphIndex\` — omit the anchor entirely for a free-standing opportunity`,
        );
    }
  });
  return errors;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const runDir = argv[0];
  const payloadFlag = argv.indexOf("--payload");
  if (!runDir || payloadFlag < 0) {
    console.error("usage: save-opportunities.mjs <runDir> --payload <json>");
    process.exit(1);
  }
  let payload;
  try {
    payload = JSON.parse(argv[payloadFlag + 1] ?? "");
  } catch (e) {
    console.error(`--payload is not valid JSON (${e.message})`);
    process.exit(1);
  }
  const dir = resolve(runDir);
  // Never mkdir: the run directory is created by the flow that owns the run. Creating one here
  // would silently write the record somewhere nobody reads it.
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(
      `run directory ${dir} does not exist — pass the directory that holds this run's accepted.json/candidates.json (exports/<slug>)`,
    );
    process.exit(1);
  }
  const errors = opportunitiesWriteErrors(payload);
  if (errors.length) {
    console.error("cannot record opportunities — " + errors.join("; "));
    process.exit(1);
  }
  const opportunities = payload.proposals.map((p) => ({
    ...(p.anchor !== undefined ? { anchor: p.anchor } : {}),
    claim: p.claim,
    intent: p.intent,
  }));
  const written = join(dir, "opportunities.json");
  writeFileSync(written, JSON.stringify({ opportunities }, null, 2) + "\n");
  chmodSync(written, 0o600);
  console.log(
    JSON.stringify({
      written,
      opportunities: opportunities.length,
      anchored: opportunities.filter((o) => o.anchor !== undefined).length,
    }),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/suggest-article/eval && bun test tests/save-opportunities.test.ts`
Expected: PASS — 8 `it()` cases green.

- [ ] **Step 5: Mutation verification — put the bug back and watch it go red**

Temporarily make the writer create the directory it was handed (the slip that would file the record where nothing reads it):

```js
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    mkdirSync(dir, { recursive: true }); // MUTATION: writes the record into a directory nobody owns
  }
```

(add `mkdirSync` to the `node:fs` import for the mutation only.)

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/suggest-article/eval && bun test tests/save-opportunities.test.ts`
Expected: FAIL — 1 case red, `"refuses a run directory that does not exist rather than creating one"`. Revert and re-run to confirm green.

- [ ] **Step 6: Document the step in the skill**

In `skills/suggest-article/SKILL.md`, replace step 6 (currently *"**Anchor + confidence.** Set `anchor = { paragraphIndex, quote }` (advisory — the journalist places the visual). Set `confidence`…"*) with:

```markdown
6. **Anchor + confidence.** Set `anchor = { paragraphIndex, quote }` — WHERE in the article this
   visual serves the narrative. The journalist does the final placing (advisory), but SAYING where
   is not optional downstream: splash's EXPORT states it at hand-over, from this field. Record the
   quote VERBATIM and prefer it to the number — a paragraph index rots the moment the article is
   edited between this analysis and the delivery, and a quotation survives a reorganisation. Omit
   `anchor` ENTIRELY for an opportunity bound to no specific passage; never emit a half-anchor
   (an empty quote, a `paragraphIndex` of 0) and never guess a paragraph. Set `confidence`
   (high/medium/low) by editorial strength of the opportunity. Write a one-line `rationale`.

   **Then PERSIST the set — the analysis must leave a record on disk, not only in this
   conversation.** Once the ProposalSet is written, run the sanctioned writer:

   ```bash
   bun skills/suggest-article/scripts/save-opportunities.mjs <runDir> --payload '<the ProposalSet JSON>'
   ```

   `<runDir>` is the run directory (`exports/<slug>`) — the one that will hold `candidates.json`
   and `accepted.json`. The writer VERIFIES before writing (a set with no proposals, a proposal
   with no claim, a half-anchor are all refused) and creates nothing: point it at a run directory
   that exists. `opportunities.json` is what lets the delivery prove an article was read and an
   anchor was available — without it, a dropped anchor is indistinguishable from an article that
   never had one.
```

- [ ] **Step 7: Confirm the new suite is inside the gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check`
Expected: the `test  skills/suggest-article/eval` row PASSes and now includes the new file. Read the summary line and record the ratio (it was `20/20` before this plan; adding no new gate ROW, this stays `20/20` — the new tests ride the existing `skills/suggest-article/eval` and `skills/splash` rows). If the printed ratio differs from what you record, report the actual number — never the expected one.

- [ ] **Step 8: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/suggest-article/scripts/save-opportunities.mjs \
        skills/suggest-article/eval/tests/save-opportunities.test.ts \
        skills/suggest-article/SKILL.md
git commit -m "feat(suggest-article): persist the opportunities, anchors included, as a run artifact

ANALYSE produced no artifact at all, so 'did the article carry an anchor?' had no answer a
script could give. Same move candidates.json already made for suggest-chart. Verifies at
write time; never creates the run directory.

Mutation-verified: letting the writer mkdir its target turns 1 case red."
```

---

## Task 5: The placement becomes MANDATORY once an article existed

Decision § 6 of the spec, made mechanical. Silence stops being a valid hand-over.

**Files:**
- Modify: `skills/splash/src/placement.ts` (add the evidence predicate + the refusal)
- Modify: `skills/splash/src/producer-spec.ts` (`freeStanding`, and the `anchor` comment)
- Modify: `skills/splash/scripts/export-code.mjs` (refuse before any write)
- Test: `skills/splash/tests/placement.test.ts`, `skills/splash/scripts/export-code.test.ts`

**Interfaces:**
- Consumes: `Placement`, `resolvePlacement` (Task 2); `<runDir>/opportunities.json` (Task 4); `AcceptedProposal.skillsInvoked` (`producer-spec.ts:53`).
- Produces:
  - `export type ArticleEvidence = { existed: false } | { existed: true; why: string }`
  - `export function articleEvidence(opts: { opportunitiesPresent: boolean; skillsInvoked?: string[] }): ArticleEvidence`
  - `export function undeclaredPlacementRefusal(proposalId: string, evidence: ArticleEvidence, placement: Placement): string | null`
  - `AcceptedProposal.freeStanding?: true`

- [ ] **Step 1: Write the failing test**

Append to `skills/splash/tests/placement.test.ts`:

```ts
import { articleEvidence, undeclaredPlacementRefusal } from "../src/placement";

describe("articleEvidence", () => {
  it("takes the file as the hard signal and names it", () => {
    const e = articleEvidence({ opportunitiesPresent: true });
    expect(e.existed).toBe(true);
    expect(e.existed && e.why).toContain("opportunities.json");
  });

  it("takes skillsInvoked as the declared signal and names it", () => {
    const e = articleEvidence({
      opportunitiesPresent: false,
      skillsInvoked: ["splash:cadrage-guided", "suggest-article", "suggest-chart"],
    });
    expect(e.existed).toBe(true);
    expect(e.existed && e.why).toContain("skillsInvoked");
  });

  it("prefers the file when both fire — a refusal names the evidence that cannot be argued with", () => {
    const e = articleEvidence({
      opportunitiesPresent: true,
      skillsInvoked: ["suggest-article"],
    });
    expect(e.existed && e.why).toContain("opportunities.json");
  });

  it("sees no article on a bare-topic run", () => {
    expect(articleEvidence({ opportunitiesPresent: false })).toEqual({ existed: false });
    expect(
      articleEvidence({
        opportunitiesPresent: false,
        skillsInvoked: ["splash:cadrage-direct", "suggest-chart"],
      }),
    ).toEqual({ existed: false });
  });
});

describe("undeclaredPlacementRefusal", () => {
  const evidence = articleEvidence({ opportunitiesPresent: true });

  it("refuses an undeclared placement when an article existed, naming both ways out", () => {
    const msg = undeclaredPlacementRefusal("e1", evidence, { kind: "undeclared" });
    expect(msg).toBeTruthy();
    expect(msg!).toContain("e1");
    expect(msg!).toContain("opportunities.json");
    expect(msg!).toContain("anchor");
    expect(msg!).toContain("freeStanding");
  });

  it("accepts an anchored placement", () => {
    expect(
      undeclaredPlacementRefusal("e1", evidence, { kind: "anchored", quote: "q" }),
    ).toBeNull();
  });

  it("accepts an explicit free-standing declaration — the article had no passage for it", () => {
    expect(
      undeclaredPlacementRefusal("e1", evidence, { kind: "free-standing" }),
    ).toBeNull();
  });

  it("never refuses when no article is evidenced", () => {
    expect(
      undeclaredPlacementRefusal("e1", { existed: false }, { kind: "undeclared" }),
    ).toBeNull();
  });
});
```

And append to `skills/splash/scripts/export-code.test.ts`:

```ts
describe("placement is mandatory once an article existed", () => {
  it("refuses to deliver an undeclared placement when opportunities.json is in the run dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-required-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "static.png"), "png");
    const rep = report(dir, "e1", "static", {
      outputs: [join(outDir, "static.png")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));
    writeFileSync(
      join(dir, "opportunities.json"),
      JSON.stringify({
        opportunities: [
          { anchor: { paragraphIndex: 3, quote: "q" }, claim: "c", intent: "i" },
        ],
      }),
    );

    const exportDir = join(dir, "e1-export");
    let failed = false;
    let stderr = "";
    try {
      run(outDir, exportDir, resultsPath, "e1");
    } catch (e) {
      failed = true;
      stderr = String((e as { stderr?: Buffer }).stderr ?? "");
    }
    expect(failed).toBe(true);
    expect(stderr).toContain("freeStanding");
    // Refused BEFORE any write: the journalist's folder is untouched, exactly like the
    // requiredSigners refusal discipline.
    expect(existsSync(exportDir)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses when the proposal declares suggest-article but no placement", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-required-skills-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "static.png"), "png");
    const rep = report(dir, "e1", "static", {
      outputs: [join(outDir, "static.png")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));
    patchAcceptedEntry(dir, "e1", {
      skillsInvoked: ["splash:cadrage-guided", "suggest-article", "suggest-chart"],
    });

    let failed = false;
    try {
      run(outDir, join(dir, "e1-export"), resultsPath, "e1");
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("delivers when the same run declares the element free-standing", () => {
    const dir = mkdtempSync(join(tmpdir(), "placement-freestanding-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "static.png"), "png");
    const rep = report(dir, "e1", "static", {
      outputs: [join(outDir, "static.png")],
    });
    const resultsPath = join(dir, "report.json");
    writeFileSync(resultsPath, JSON.stringify(rep));
    writeFileSync(
      join(dir, "opportunities.json"),
      JSON.stringify({ opportunities: [{ claim: "c", intent: "i" }] }),
    );
    patchAcceptedEntry(dir, "e1", { freeStanding: true });

    const out = run(outDir, join(dir, "e1-export"), resultsPath, "e1");
    expect(out).toContain("EXPORT_CODE_RESULT");
    expect(parsePlacement(out).placement).toEqual({ kind: "free-standing" });
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/placement.test.ts scripts/export-code.test.ts`
Expected: FAIL — `placement.test.ts` red on the import (`articleEvidence` not exported); `export-code.test.ts` red on the two refusal cases (the export succeeds today).

- [ ] **Step 3: Write minimal implementation**

3a. Append to `skills/splash/src/placement.ts`:

```ts
/** Whether this run read an ARTICLE — the condition that makes stating the placement obligatory
 *  (spec § 6). Two signals, and the refusal always names the one that fired:
 *    HARD     — opportunities.json in the run directory (suggest-article persisted its set).
 *    DECLARED — skillsInvoked lists suggest-article (producer-spec.ts:53, already validated by
 *               GUARD 5 in validate-gate.ts).
 *  A bare-topic run trips neither, and owes nothing. */
export type ArticleEvidence = { existed: false } | { existed: true; why: string };

export const SUGGEST_ARTICLE_SKILL = "suggest-article";

export function articleEvidence(opts: {
  opportunitiesPresent: boolean;
  skillsInvoked?: string[];
}): ArticleEvidence {
  if (opts.opportunitiesPresent)
    return {
      existed: true,
      why: "opportunities.json is present in the run directory (suggest-article read an article and persisted its opportunities)",
    };
  if (
    Array.isArray(opts.skillsInvoked) &&
    opts.skillsInvoked.includes(SUGGEST_ARTICLE_SKILL)
  )
    return {
      existed: true,
      why: `skillsInvoked lists "${SUGGEST_ARTICLE_SKILL}" on this proposal`,
    };
  return { existed: false };
}

/** The refusal, or null when there is nothing to refuse. Returned rather than thrown so the
 *  caller keeps its own refusal shape (export-code.mjs's fail() → stderr + non-zero, before any
 *  write). What is refused is SILENCE, never a placement the journalist chose: an anchor and an
 *  explicit free-standing declaration both pass. */
export function undeclaredPlacementRefusal(
  proposalId: string,
  evidence: ArticleEvidence,
  placement: Placement,
): string | null {
  if (!evidence.existed) return null;
  if (placement.kind !== "undeclared") return null;
  return (
    `refusing to deliver ${proposalId}: this run read an article (${evidence.why}), but the ` +
    `accepted proposal declares no placement — so the hand-over could not tell the journalist ` +
    `WHERE this element goes in their piece. Add to this entry in accepted.json either ` +
    `\`anchor: { paragraphIndex, quote }\` (copied from suggest-article's opportunity — the ` +
    `quote is the grain that survives an edit) or \`freeStanding: true\` when the element ` +
    `serves no specific passage. Both are ENTRY-level fields, beside \`spec\`, so adding one ` +
    `does not change the accepted-spec hash and needs no re-produce. Never invent a paragraph: ` +
    `if the article bound this element to no passage, say so with \`freeStanding\`.`
  );
}
```

3b. In `skills/splash/src/producer-spec.ts`, replace the `anchor` declaration and its comment (`:54-61`) with:

```ts
  // Placement anchor (suggest-article's `anchor: { paragraphIndex, quote }`) — WHERE in the
  // article this element serves the narrative. READ AT EXPORT: skills/splash/src/placement.ts
  // resolves it and export-code.mjs prints the placement block at hand-over, so the sentence no
  // longer depends on the orchestrator remembering an article read dozens of turns earlier.
  // Advisory by design — the journalist does the final placement in their CMS — but SAYING it is
  // not: once a run has read an article, the export refuses an entry that declares neither
  // `anchor` nor `freeStanding` (undeclaredPlacementRefusal). Of the two grains the QUOTE is
  // authoritative: a paragraph index rots when the article is edited between analysis and
  // delivery. Copied across at §5b like sourceHint/confirmedTakeaway.
  anchor?: { paragraphIndex?: number; quote?: string };
  // The OTHER valid placement declaration: this element is bound to no passage of the article
  // (suggest-article proposed it against no specific quote). Set it explicitly — silence is not a
  // valid hand-over on an article run, because nothing distinguishes "no passage" from "the
  // anchor was dropped at §5b". Meaningless without an article; harmless on a bare-topic run.
  freeStanding?: true;
```

3c. In `skills/splash/scripts/export-code.mjs`, extend the import added in Task 3 and add the refusal immediately after `const placement = resolvePlacement(acceptedEntry);`:

```js
import {
  resolvePlacement,
  placementBlock,
  articleEvidence,
  undeclaredPlacementRefusal,
} from "../src/placement.ts";
```

```js
  // Spec § 6: once a run has read an article, stating the placement is REQUIRED — the element is
  // fine, but a hand-over that says nothing about where it goes is not a hand-over. Refused HERE,
  // before any mkdir/copy, so a refusal leaves the journalist's export folder untouched (the same
  // discipline as the S4d editorial gate below). The fix is an entry-level field, so it costs no
  // re-produce: the chain hash is over `spec` (render-provenance.ts), not over the entry.
  const evidence = articleEvidence({
    opportunitiesPresent: existsSync(join(runDir, "opportunities.json")),
    skillsInvoked: acceptedEntry?.skillsInvoked,
  });
  const placementRefusal = undeclaredPlacementRefusal(id, evidence, placement);
  if (placementRefusal) {
    console.error(placementRefusal);
    process.exit(1);
  }
```

(`existsSync` and `join` are already imported at `:29-37`; `dirname`/`resolve` were used in Task 3.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/placement.test.ts scripts/export-code.test.ts`
Expected: PASS — 8 new `placement.test.ts` cases and 3 new `export-code.test.ts` cases green, all pre-existing cases still green.

- [ ] **Step 5: Mutation verification — put the bug back and watch it go red**

Temporarily neuter the obligation in `undeclaredPlacementRefusal`:

```ts
export function undeclaredPlacementRefusal(
  proposalId: string,
  evidence: ArticleEvidence,
  placement: Placement,
): string | null {
  return null; // MUTATION: silence is a valid hand-over again
}
```

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/placement.test.ts scripts/export-code.test.ts`
Expected: FAIL — record the count. Expect 3 red: `"refuses an undeclared placement when an article existed, naming both ways out"`, `"refuses to deliver an undeclared placement when opportunities.json is in the run dir"`, `"refuses when the proposal declares suggest-article but no placement"`.

Then a second mutation, on the evidence side — restore the function and make the file signal invisible:

```ts
    opportunitiesPresent: false, // MUTATION: the hard signal is ignored
```

in `export-code.mjs`'s `articleEvidence({...})` call. Run the same command. Expected: FAIL on `"refuses to deliver an undeclared placement when opportunities.json is in the run dir"` — this is what proves the CLI reads the file rather than passing on the declared signal alone. Revert both and re-run to confirm green.

- [ ] **Step 6: Full splash suite + typecheck**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bunx tsc --noEmit && bun test`
Expected: tsc silent; the suite green. Any pre-existing test that now fails is a fixture that declares `suggest-article` in `skillsInvoked` without a placement — the honest fix is to add `freeStanding: true` or an `anchor` to that fixture, never to weaken the guard.

- [ ] **Step 7: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/src/placement.ts skills/splash/src/producer-spec.ts \
        skills/splash/scripts/export-code.mjs skills/splash/tests/placement.test.ts \
        skills/splash/scripts/export-code.test.ts
git commit -m "feat(export): once a run has read an article, the placement must be declared

Silence stops being a valid hand-over. Two signals decide that an article existed — the
file (opportunities.json) and the declaration (skillsInvoked) — and the refusal names
whichever fired. Refused before any write; the fix is an entry-level field, so no
re-produce (the chain hash is over spec).

Mutation-verified: neutering the refusal turns 3 cases red; ignoring the file signal
turns 1 red."
```

---

## Task 6: The prose catches up with the code

`skills/splash/tests/skill-doc-parity.test.ts:227-240` defines "survivor rules" as *"the load-bearing prose that has NO mechanical backstop… only the SKILL.md prose stops the miss they guard"*, and the placement rule sits in that block. After Tasks 3 and 5 that is no longer true, and leaving it there is a lie the next reader would act on.

**Files:**
- Modify: `skills/splash/SKILL.md` (§5b at `:737`, §6 at `:924`)
- Modify: `skills/splash/tests/skill-doc-parity.test.ts` (the `describe("placement at delivery (2026-07-18)")` block)
- Modify: `docs/splash/guardrails.md`

**Interfaces:**
- Consumes: the stdout contract from Task 3 (`PLACEMENT_JSON`, `SPLASH_PLACEMENT`/`END_SPLASH_PLACEMENT`); `freeStanding` from Task 5.
- Produces: no code symbols. The pinned strings below become the parity test's contract.

- [ ] **Step 1: Write the failing test**

In `skills/splash/tests/skill-doc-parity.test.ts`, replace the whole `describe("placement at delivery (2026-07-18)", …)` block (and move it OUT of the "Survivor rules" section — place it after that section's closing, under its own banner comment):

```ts
// Placement at delivery — NO LONGER a survivor rule. It was one until 2026-07-29: the anchor
// (producer-spec.ts:61) had no reader, so only this prose stood between the journalist and a
// visual with no idea where it goes. It now has a mechanical backstop — skills/splash/src/
// placement.ts resolves it, export-code.mjs emits it at every hand-over, and an undeclared
// placement on an article run is REFUSED. These pins guard the prose that must stay in step with
// that code: what the orchestrator relays, and what §5b must carry for it to work.
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: FAIL — 4 cases red (none of `SPLASH_PLACEMENT`, `relay it VERBATIM`, `**\`freeStanding\`**`, `the export REFUSES` is in `SKILL.md` yet).

- [ ] **Step 3: Write the prose**

> Every string Step 1 pins is matched with `toContain` against the raw file, so it must sit on ONE
> line in `SKILL.md`. Re-wrapping a paragraph and splitting `the export REFUSES` or
> `never invent a paragraph` across a newline turns a pin red for a reason that has nothing to do
> with the rule — keep the pinned phrases contiguous when you reflow.

3a. In `skills/splash/SKILL.md`, replace the `**\`anchor\`**` bullet at `:737-740` with:

```markdown
- **`anchor`** (copy it across whenever `suggest-article` provided one): the element's placement in
  the article — `{ paragraphIndex, quote }`, the passage this visual serves. Copy the quote
  VERBATIM: of the two grains it is the one that survives the article being edited between the
  analysis and the delivery, and it is the one EXPORT presents as authoritative. Do not guess:
  never invent a paragraph, and never emit a half-anchor (an empty quote, a `paragraphIndex` of 0).
  **Keep that phrase on ONE line** — `skill-doc-parity.test.ts` pins it as a contiguous string.
- **`freeStanding: true`** — the OTHER valid placement declaration, for an element bound to no
  specific passage. On a run that read an article, one of the two is REQUIRED —
  **the export REFUSES** an entry that declares neither (`undeclaredPlacementRefusal`), because nothing else
  distinguishes "this element belongs nowhere in particular" from "the anchor was dropped here at
  §5b". Both are ENTRY-level fields, beside `spec`, so adding one afterwards costs no re-produce.
  On a bare-topic run neither is owed.
```

3b. In `skills/splash/SKILL.md`, replace the `**★ State the PLACEMENT…**` paragraph at `:924-932` with:

```markdown
**★ The PLACEMENT is EMITTED, not composed — relay it VERBATIM.** `export-code.mjs` prints, right
after `EXPORT_CODE_RESULT`, a `PLACEMENT_JSON` line (machine) and a `SPLASH_PLACEMENT <id>` …
`END_SPLASH_PLACEMENT` block (human, already in the journalist's language). **Relay it VERBATIM** —
do not re-word it, do not re-derive it from your memory of the article, and never substitute a
paragraph you recall. It is emitted from the accepted proposal's own `anchor`, and
the sentence it prints says what to trust: **the quote is what to trust**, the paragraph number is
an indication that may have moved since the article was read. An element declared `freeStanding`
prints the free-standing line instead — never an invented paragraph. On a multi-element hand-over
each element emits its OWN block, so relay each one beside its element rather than merging them.
If NO block is printed, that is the code telling you the proposal declared no placement on a run
with no article — say nothing about placement rather than filling the gap yourself.
```

3c. In `docs/splash/guardrails.md`, add two rows. In the **Layer 1 — the validation gate** table, add:

```markdown
| Placement declared (article runs) | a delivery that would say nothing about WHERE the element goes, on a run that read an article — refused at the export gate, before any write, until the accepted entry declares `anchor` or `freeStanding` | `skills/splash/src/placement.ts` (`articleEvidence`, `undeclaredPlacementRefusal`), wired in `skills/splash/scripts/export-code.mjs`; the hard signal is `opportunities.json` beside `accepted.json` (`skills/suggest-article/scripts/save-opportunities.mjs`) |
```

and in the **ship gates** table (the last table of the page), add:

```markdown
| Placement stated at hand-over | the journalist receiving a finished visual with no idea where it goes in their own article — the placement block is emitted by the script at EVERY delivered format and form, from the proposal's anchor, instead of depending on the orchestrator remembering | `skills/splash/src/placement.ts` (`resolvePlacement`, `placementBlock`), `lib/newsroom/ui-copy.ts` (`placementCopy`), emitted from `done()` in `skills/splash/scripts/export-code.mjs` |
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: PASS — the 4 new cases green, every other pin in the file still green.

- [ ] **Step 5: Mutation verification — put the bug back and watch it go red**

Temporarily revert the §6 paragraph to a wording that asks the orchestrator to compose the sentence (delete the block from `**★ The PLACEMENT is EMITTED` through the end of that paragraph and paste back the original `**★ State the PLACEMENT of each delivered element — WHERE it goes in the article.**…` text).

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/splash && bun test tests/skill-doc-parity.test.ts`
Expected: FAIL on `"§6 relays the emitted block and never composes the sentence itself"` and `"§6 names the quote as authoritative…"` — 2 red. Restore and re-run.

- [ ] **Step 6: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check`
Expected: read the final `N/M checks passed.` line and record it verbatim in the commit body. Do not write an expected number: write the one printed.

- [ ] **Step 7: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git add skills/splash/SKILL.md skills/splash/tests/skill-doc-parity.test.ts docs/splash/guardrails.md
git commit -m "docs(placement): the rule leaves the survivor list — it has a backstop now

SKILL.md §6 stops asking the orchestrator to compose the placement sentence and tells it to
relay the emitted block; §5b gains freeStanding and states that the export refuses silence on
an article run. guardrails.md documents both guards against their named files.

Mutation-verified: restoring the compose-it-yourself wording turns 2 parity pins red."
```

---

## Task 7: D09 — a scrolly stops opening on its title

The narrow form of option (c). The opening gets its own field; its default stops being the title; the takeaway stops borrowing the intro's text. Equality is NOT refused — a journalist who writes the same sentence at both ends is making an editorial choice, and refusing it would refuse the product's default composition (`lib/loop/assemble/chart-native.ts:20` sets `title = brief.angle.confirmedTakeaway`).

**Files:**
- Modify: `skills/scrolly/src/chart-chapters.ts` (`:15-20`)
- Modify: `skills/scrolly/src/ScrollyChart.tsx` (`ChartScrollyConfig`, `:10-14`)
- Modify: `skills/scrolly/src/Scrolly.tsx` (`:162-166`)
- Modify: `skills/scrolly/SKILL.md` (the furniture rule at `:38-41`)
- Test: `skills/scrolly/tests/chart-chapters.test.ts`

**Interfaces:**
- Consumes: `ChartBeat` (`skills/chart-native/src/chart-story.ts:29`); `auditDistinctBookends` (`skills/scrolly/src/conformance.ts`) as the test oracle.
- Produces:
  - `ChartScrollyConfig.opening?: string`
  - `chartStoryToChapters(beats, meta)` where `meta` gains `opening?: string`, and whose returned `steps` no longer contain a step with empty prose (each remaining step keeps `ref` = its BEAT index).

- [ ] **Step 1: Write the failing test**

In `skills/scrolly/tests/chart-chapters.test.ts`, extend the imports and append:

```ts
import { auditDistinctBookends } from "../src/conformance";
```

```ts
// D09 — a scrolly that opens on its chute. The mechanism is three modules deep and ends HERE:
// `desc` used to fall back to meta.title, so (a) the opening card printed the title, which is the
// confirmed takeaway on every loop-assembled chart (lib/loop/assemble/chart-native.ts:20), and
// (b) an empty takeaway copy — which is what chart-story.ts:524 emits when no distinct insight was
// given — landed on that same string. Intro and takeaway became one sentence, by construction.
//
// The invariant was already written down in three places and enforced in none: this file's own
// test title ("the title is never a caption"), Scrolly.tsx:538 ("Shown once here; never repeated
// as a step caption") and skills/scrolly/SKILL.md's furniture rule.
describe("chartStoryToChapters — the opening is its own field", () => {
  const noDistinctInsight: ChartBeat[] = [
    { kind: "title", callout: null, copy: "Arctic sea ice has shrunk" },
    { kind: "establish", callout: null, copy: "" },
    {
      kind: "reveal",
      progress: 0,
      callout: { name: "1979", value: "7 million km²", text: "1979 — 7 million km²" },
      copy: "1979 — 7 million km²",
    },
    {
      kind: "reveal",
      progress: 1,
      callout: { name: "2025", value: "4.3 million km²", text: "2025 — 4.3 million km²" },
      copy: "2025 — 4.3 million km²",
    },
    // chart-story.ts:524 empties the takeaway when no insight distinct from the title was given.
    { kind: "takeaway", callout: null, copy: "" },
  ];

  it("does NOT open and close on the same sentence in the default composition", () => {
    const story = chartStoryToChapters(noDistinctInsight, meta);
    // The repo's own comparator, rather than a second one written here.
    expect(auditDistinctBookends(story)).toEqual([]);
  });

  it("never captions a step with the title, even with no description at all", () => {
    const story = chartStoryToChapters(beats, {
      title: meta.title,
      source: meta.source,
    });
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });

  it("opens on `opening` when the journalist wrote one, in preference to the description", () => {
    const story = chartStoryToChapters(beats, {
      ...meta,
      opening: "Every September, the ice is measured at its smallest.",
    });
    expect(story.steps[0].prose).toBe(
      "Every September, the ice is measured at its smallest.",
    );
    expect(story.steps[1].prose).toBe(
      "Every September, the ice is measured at its smallest.",
    );
  });

  it("drops a step with no prose rather than rendering an empty card, keeping ref = beat index", () => {
    const story = chartStoryToChapters(noDistinctInsight, {
      title: meta.title,
      source: meta.source,
    });
    // No opening material and no takeaway copy: only the two reveals remain — and they still
    // point at beats 2 and 3, so the sticky graphic advances to the right beat.
    expect(story.steps.map((s) => s.ref)).toEqual([2, 3]);
    expect(story.steps.every((s) => s.prose.trim() !== "")).toBe(true);
  });

  it("equality is not refused — a journalist may write the same sentence at both ends", () => {
    const sameBothEnds: ChartBeat[] = [
      ...noDistinctInsight.slice(0, 4),
      { kind: "takeaway", callout: null, copy: "September minimum, 1979–2025" },
    ];
    const story = chartStoryToChapters(sameBothEnds, meta);
    expect(story.steps[0].prose).toBe("September minimum, 1979–2025");
    expect(story.steps[story.steps.length - 1].prose).toBe(
      "September minimum, 1979–2025",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test tests/chart-chapters.test.ts`
Expected: FAIL — 4 of the 5 new cases red:
- `"does NOT open and close on the same sentence…"` — `auditDistinctBookends` returns the "intro and takeaway are identical" violation.
- `"never captions a step with the title…"` — `desc` falls back to `meta.title`.
- `"opens on `opening`…"` — `meta.opening` is not read.
- `"drops a step with no prose…"` — five steps come back, refs `[0,1,2,3,4]`.
The fifth (`"equality is not refused"`) passes today and must still pass afterwards.

- [ ] **Step 3: Write minimal implementation**

3a. Replace the body of `skills/scrolly/src/chart-chapters.ts` (keep its existing imports):

```ts
export function chartStoryToChapters(
  beats: ChartBeat[],
  meta: {
    title: string;
    description?: string;
    /** The line the scrolly OPENS on — its OWN field, resolved from the framing material and
     *  never from the title. A chart's title IS its confirmed takeaway on the loop path
     *  (lib/loop/assemble/chart-native.ts:20), so an opening card that fell back to the title
     *  opened the piece on its own chute — and the emptied takeaway beat (chart-story.ts:524)
     *  then landed on that same string. Default: the description (the what/when/where deck the
     *  framing already produced, which checkScrollyConformance requires). Absent both, there is
     *  no opening CARD: the title stays where it belongs — the persistent header
     *  (Scrolly.tsx:538, "Shown once here; never repeated as a step caption"). */
    opening?: string;
    source?: { name: string; url: string };
  },
): ScrollyStory {
  const opening = meta.opening?.trim()
    ? meta.opening
    : meta.description?.trim()
      ? meta.description
      : "";
  const steps: ScrollyStep[] = beats
    .map((b, i) => {
      let prose: string;
      if (b.kind === "title" || b.kind === "establish") prose = opening;
      // The takeaway carries its OWN copy or nothing. It deliberately no longer borrows the
      // opening's text: recycling the intro at the close is the defect (D09), and writing a
      // closing line is the journalist's job, not the engine's.
      else if (b.kind === "takeaway") prose = b.copy?.trim() ? b.copy : "";
      else prose = b.copy;
      return {
        id: `step-${i}-${b.kind}`,
        visual: "chart" as const,
        action: "drawTo" as const,
        ref: i,
        prose,
        align: "center" as const,
      };
    })
    // A card with no text is not a card. Filtered AFTER the map, so every surviving step keeps
    // `ref` = its BEAT index — which is what the sticky graphic advances on
    // (Scrolly.tsx: `story.steps[currentStep].ref`) and what lineCardTargets reads.
    .filter((s) => s.prose.trim() !== "");
  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "chart",
    steps,
  };
}
```

3b. In `skills/scrolly/src/ScrollyChart.tsx`, extend the config type (`:10-14`):

```tsx
export type ChartScrollyConfig = NativeSpec & {
  description?: string;
  /** The line the scrolly OPENS on. Its own field precisely so the opening is never the title:
   *  a chart's title is its confirmed takeaway, so opening on it opens on the chute. Absent, the
   *  description is used; absent both, the scrolly simply has no opening card and the title stays
   *  in the persistent header. */
  opening?: string;
  insight?: string;
  source?: { name: string; url?: string };
};
```

3c. In `skills/scrolly/src/Scrolly.tsx`, thread it at the `chartStoryToChapters` call (`:162-166`):

```tsx
      return chartStoryToChapters(beats, {
        title: (config as { title?: string }).title ?? "",
        description: (config as { description?: string }).description,
        opening: (config as { opening?: string }).opening,
        source: (config as { source?: { name: string; url: string } }).source,
      });
```

3d. In `skills/scrolly/SKILL.md`, replace the furniture bullet at `:38-39` with:

```markdown
- **Each furniture element appears once**: the **insight title** in a persistent header (never a
  step caption — it is the chart's confirmed takeaway, so a scrolly that opened on it opened on
  its own chute), the **opening line** as the intro step caption (`opening`, defaulting to the
  **description** — what/when/where), the **source** in the footer. The on-map
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test tests/chart-chapters.test.ts`
Expected: PASS — the 5 new cases green AND the 4 pre-existing cases green (the original fixture carries a description and a takeaway copy, so all five of its steps survive the filter and `refs` are still `[0,1,2,3,4]`).

- [ ] **Step 5: Mutation verification — put the bug back and watch it go red**

Temporarily restore the old resolution in `chart-chapters.ts`:

```ts
  const desc = meta.description?.trim() ? meta.description : meta.title; // MUTATION
  // …and inside the map:
      if (b.kind === "title" || b.kind === "establish") prose = desc;
      else if (b.kind === "takeaway") prose = b.copy?.trim() ? b.copy : desc;
```

(and drop the `.filter(...)`.)

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bun test tests/chart-chapters.test.ts`
Expected: FAIL — record the count. Expect 4 red, one of them reporting `auditDistinctBookends`'s own message *"intro and takeaway are identical…"*. That message going red is the proof that the fix moved the thing the repo's own comparator measures, not merely a string this task invented. Revert and re-run.

- [ ] **Step 6: Run every suite the change can reach**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge/skills/scrolly && bunx tsc --noEmit && bun test`
Run: `cd /Users/rmdms/Sites/Professional/splash-merge/lib && bun test`

Expected: both green. Two files to watch, because they read the rendered walk rather than the function: `lib/loop/beats-render-proof.test.ts:186-188` asserts `steps.length >= CLAIMS.length` and matches the authored captions by CONTENT (the reveal cards all survive the filter, so this holds), and `lib/loop/scrolly-e2e.test.ts`. If either goes red because a loop-assembled scrolly now has fewer framing cards, that is the intended change — update the assertion to the new count AND state in the commit body what the count was before and after. Never restore the title fallback to keep a count.

- [ ] **Step 7: Full gate**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check`
Expected: read and record the printed `N/M checks passed.` line.

- [ ] **Step 8: Commit**

```bash
cd /Users/rmdms/Sites/Professional/splash-merge
git commit -am "fix(scrolly): the opening is its own field — a chart scrolly stops opening on its chute

A chart's title IS its confirmed takeaway, and chart-chapters.ts fell back to it for the
opening card and, when no distinct insight was given, for the takeaway card too — so the
piece opened and closed on one sentence. The opening now resolves from `opening` then the
description, never the title; the takeaway carries its own copy or none; a step with no
prose is dropped rather than rendered empty, keeping ref = beat index.

Equality is deliberately NOT refused: the default composition of a loop-assembled scrolly
would be the thing refused.

Mutation-verified: restoring the desc fallback turns 4 cases red, one of them via
auditDistinctBookends' own 'intro and takeaway are identical' message."
```

---

## Self-Review (run before handing this plan on)

**1. Spec coverage** — every section of `2026-07-28-family-d-delivery-design.md` mapped to a task:

| Spec | Task |
|---|---|
| § 2 — the anchor is computed, copied, never read | Tasks 2 + 3 give it its first reader |
| § 3 — the delivery already has a mechanical mouth | Task 3 (joins `done()`, the same relay-block shape as `EXPORT_FORMS_PROPOSAL`) |
| § 3 — the three properties (one line per element; absence ⇒ free-standing, never an invented paragraph; advisory) | Task 2 (`placementBlock` is per-element; `freeStanding` line; `copy.advisory`), pinned in Task 6 |
| § 3 — the observability net, modelled on `droppedSourceHintWarning` | Task 5, promoted from a warning to a refusal by § 6's decision; the honest limit (it cannot tell a dropped anchor from an unanchored opportunity) is why it demands a DECLARATION rather than guessing, and the id-link that would sharpen it is a written follow-up |
| § 4 — D09's mechanism | Task 7, with the spec's chain corrected (see finding 4) |
| § 5 — it closes in the prose chain, not the loop | Tasks 2/3/5 all live in `skills/splash` + `skills/suggest-article`; the loop's zip README is a written follow-up |
| § 6 — placement is mandatory once an article exists, with its three branches | Task 5 (`articleEvidence` + `undeclaredPlacementRefusal`), Task 2 (the three `Placement` kinds) |
| § 7.1 (message only) | Task 3; option (c) written up as a follow-up, not a task |
| § 7.2 (both grains, quote authoritative) | Task 1's copy, Task 2's resolution, Task 6's prose pin |
| § 7.3 (a fact on disk) | Task 4 |
| § 7.4 (D09, option c narrow) | Task 7 |
| § 8 — out of scope | Honoured: no family A/B/C work, no ANALYSE stage in the loop, no anchor-quality check, no harness change |
| § 9.1 — the number is a high bound | "Numbers you may not quote", and no task sized by it |
| § 9.2 — never verify the quote against the article | Nothing anywhere compares the quote to article text; `resolvePlacement` only checks that a string is non-empty. This is deliberate: substring comparison is what produced D17 |
| § 9.3 — durability costs a contract | Decision 1; `assertDelivered` untouched (verified: finding 7) |
| § 9.4 — fixing D09's effect can hide its cause | Task 7 fixes the composition, and explicitly does not refuse equality |
| § 9.5 — dependency on family A | Stated in the header; every refusal is written to be costly and visible, never claimed impossible to skip |

**2. Placeholder scan** — no "TBD", no "similar to Task N", no "add error handling", no "write tests for the above". Every code step carries the code. The one instruction that is conditional (Task 7 Step 6, "if a loop test goes red") states the decision rule and forbids the tempting wrong fix, rather than deferring the work.

**3. Type consistency** — checked across tasks: `PlacementCopy` (Task 1) is the parameter type of `placementLines`/`placementBlock` (Task 2); `Placement`'s three kinds are used identically in Tasks 2, 3 and 5; `articleEvidence`'s option object (`{ opportunitiesPresent, skillsInvoked }`) matches its call site in Task 5's `export-code.mjs` edit; `opportunities.json`'s written shape (`{opportunities: […]}`, Task 4) is never parsed by Task 5, which only tests the file's EXISTENCE — deliberate, and the reason no shape contract crosses those two tasks; `chartStoryToChapters`'s `meta.opening` (Task 7 3a) matches the call site (3b/3c) and the field name on `ChartScrollyConfig`.
