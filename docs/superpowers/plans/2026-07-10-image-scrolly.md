# Image-scrolly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IMAGE-SCROLLY as atelier's 4th engine — journalist-supplied photo/satellite sequences that atelier *formats* (crop/canvas-frame + compress) and renders as static + crossfade-video + scroll-driven story, captions derived from the article, never generated.

**Architecture:** A thin deterministic engine `skills/image-native/` (schema + conformance + image prep + static/video producers) fed by an `ImageStory` manifest that the `suggest-image` orchestrator (② layer) proposes and the journalist confirms through a mandatory gate. The scrolly renderer `ScrollyImage.tsx` lives in `skills/scrolly` (the existing renderer seam) and consumes the same schema. The engine does zero vision and zero text generation.

**Tech Stack:** Bun · TypeScript · bun:test (TDD) · React 19 (scrolly renderer) · Remotion (video) · sharp (image prep) · Vite single-file build.

**Spec:** `docs/superpowers/specs/2026-07-10-image-scrolly-design.md` (read it — every decision below traces to a spec section).

## Global Constraints

- Runtime **Bun** only (never npm/node). Tests `bun:test`, TDD (failing test first).
- Code, comments, identifiers, commit messages, branch names: **English** (non-negotiable).
- **No Claude/Anthropic mention** in any committed artifact (commits, PRs, docs).
- **No text generation in the engine** — captions are pass-through from the manifest; `alt` and `credit` are journalist-supplied. The engine only formats images and validates strings.
- **Determinism** in `scripts/*.mjs`: no `Date.now()` / `Math.random()`; same input → same output.
- Any engine-emitted chrome string routes through the locale helper; never hardcode English.
- Feedback→system: every fix lands at the shared/system level (conformance, SKILL.md, references), not just the example.
- Branch: `feat/image-scrolly` (already created; the spec commit is its first commit).

## Plan sequence (this feature = 5 sequenced plans)

Each plan below produces working, testable software on its own. **This document details P1.** P2–P5 are scoped as a roadmap and will be written to their own detail (same TDD granularity) as each predecessor lands — so each plan is informed by the review of the one before it.

| Plan | Deliverable | Primary files |
|---|---|---|
| **P1 (detailed here)** | `image-native` pure core: `ImageStory` types + `checkImageConformance` + overlap tripwire, fully tested | `skills/image-native/src/image-story.ts`, `skills/image-native/tests/image-story.test.ts` |
| P2 | `prep-images.mjs`: sharp pipeline — normalize to channel size, EXIF-bake, sRGB, HEIC/TIFF, `fit=canvas-frame`(default)/`crop`, crop-discard tripwire, WebP q~82, deterministic, copy into work dir (manifest handoff) | `skills/image-native/scripts/prep-images.mjs` |
| P3 | scrolly integration: `imageStoryToChapters` (in scrolly), `ScrollyImage.tsx` (crossfade + reduced-motion hard-cut + per-frame `alt`/`credit`), `Scrolly.tsx` `visual:"image"` branch, name-only source anchor fix | `skills/scrolly/src/image-chapters.ts`, `skills/scrolly/src/ScrollyImage.tsx`, `skills/scrolly/src/Scrolly.tsx` |
| P4 | producers: `static` (key-frame with its `alt`), `video` (Remotion crossfade, burn-in caption+credit+furniture, knobs), `produce.mjs` channel-gated | `skills/image-native/scripts/produce.mjs`, `skills/image-native/remotion/*` |
| P5 | `snap-a11y.mjs` (alt present≠generic, reduced-motion hard-cut, name-only source), `export-code.mjs` wiring (per-frame alt/credit, not `"visual"`), `suggest-image` skill (vision=matching only, mandatory order+caption gate, vetoable cull, unmatched halt) | `skills/image-native/scripts/snap-a11y.mjs`, `skills/atelier/scripts/export-code.mjs`, `skills/suggest-image/` |

---

## P1 — image-native pure core

**Why first:** every other plan imports these types and calls `checkImageConformance`. It is pure TypeScript (no images, no React, no Remotion), so it is the cheapest thing to get exactly right and lock down with tests. It encodes the spec's §5 schema and §6 conformance — including the two corrections the verification pass forced: **required `alt` distinct from `caption`**, and a **normalized token-overlap tripwire** (not a literal substring) guarding **required `sourcePassage`**.

### File structure

- Create `skills/image-native/package.json` — Bun package, `bun test` script. One responsibility: declare the engine package.
- Create `skills/image-native/tsconfig.json` — mirror the sibling engines' TS config.
- Create `skills/image-native/src/image-story.ts` — the schema types + `checkImageConformance` + the pure `captionOverlapRatio` helper. One responsibility: the data contract + its render-free validation.
- Create `skills/image-native/tests/image-story.test.ts` — bun:test suite for every conformance rule + the overlap helper.

### Interfaces produced (later plans rely on these — exact names/types)

```ts
// skills/image-native/src/image-story.ts
export interface ImageCredit { name: string; url?: string; licence?: string }
export interface ImageStep {
  id: string;
  frameRef: string;
  caption: string;
  alt: string;
  credit: ImageCredit;
  sourcePassage: string;
  fit?: "crop" | "canvas-frame";
  align?: "left" | "right" | "center";
}
export interface ImageStory {
  title: string;
  description: string;
  source: { name: string; url?: string };
  frames: ImageStep[];
  keyFrame: number;
  fit: "canvas-frame" | "crop";
  lang?: string;
  imageDir: string;
}
export function captionOverlapRatio(caption: string, passage: string): number;
export function checkImageConformance(
  story: ImageStory,
  opts?: { overlapThreshold?: number },
): string[];
```

Conventions to mirror (verified in-repo): `checkScrollyConformance` (`skills/scrolly/src/conformance.ts`) returns a `string[]` of human-readable violations (empty = valid) and requires `source.name` but treats `source.url` as optional — `checkImageConformance` follows the same shape.

---

### Task 1: Scaffold the package + types + a passing baseline

**Files:**
- Create: `skills/image-native/package.json`
- Create: `skills/image-native/tsconfig.json`
- Create: `skills/image-native/src/image-story.ts`
- Test: `skills/image-native/tests/image-story.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: the types + `checkImageConformance` signature above (returns `[]` for now).

- [ ] **Step 1: Create the package manifest**

`skills/image-native/package.json`:

```json
{
  "name": "image-native",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test"
  }
}
```

- [ ] **Step 2: Create the TS config**

`skills/image-native/tsconfig.json` — mirrors `skills/scrolly/tsconfig.json` but kept **zero-dependency-clean** for the pure core: `types: []` (no ambient type packages needed yet) and `include: ["src"]` only. Crucially, **`tests` is NOT in `include`** — the sibling engines exclude tests from tsc so the `bun:test` import needs no bun type package; tests are typechecked-by-running via `bun test`. P2 adds `"scripts"` to `include` and the `sharp`/`node` types; P3/P4 add `jsx` + react/remotion types as those deps land.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "types": [],
    "lib": ["ES2020"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing baseline test**

`skills/image-native/tests/image-story.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { checkImageConformance, type ImageStory } from "../src/image-story";

// A minimal, fully-valid story reused across tests. Two frames, distinct alt/caption,
// per-frame credit, a sourcePassage that the caption does NOT copy.
function validStory(): ImageStory {
  return {
    title: "The canal that split a village",
    description: "How the new waterway reshaped daily life, 2019–2024.",
    source: { name: "Heidi.news" },
    keyFrame: 0,
    fit: "canvas-frame",
    imageDir: "/tmp/frames",
    frames: [
      {
        id: "f0",
        frameRef: "before.jpg",
        caption: "The eastern bank before the works began.",
        alt: "A grassy riverbank with a footpath and two benches.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage:
          "Residents recall a quiet towpath where families once walked on Sundays.",
      },
      {
        id: "f1",
        frameRef: "after.jpg",
        caption: "The same bank, now a concrete embankment.",
        alt: "A concrete embankment with construction fencing and a crane.",
        credit: { name: "Jane Doe / Agence Photo" },
        sourcePassage:
          "By 2024 the towpath had become a hard embankment lined with steel piles.",
      },
    ],
  };
}

describe("checkImageConformance", () => {
  it("should return no violations for a fully valid story", () => {
    expect(checkImageConformance(validStory())).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd skills/image-native && bun test`
Expected: FAIL — `Cannot find module "../src/image-story"` (file not created yet).

- [ ] **Step 5: Write the minimal implementation**

`skills/image-native/src/image-story.ts`:

```ts
// image-native — the data contract for a journalist-supplied image sequence and its
// render-free conformance. Pure: no images, no DOM, no I/O. Mirrors the scrolly
// conformance style (a string[] of human-readable violations; empty = valid).
// Spec: docs/superpowers/specs/2026-07-10-image-scrolly-design.md §5, §6.

export interface ImageCredit {
  name: string;
  url?: string;
  licence?: string;
}

export interface ImageStep {
  id: string;
  frameRef: string; // raw image filename, resolved relative to ImageStory.imageDir
  caption: string; // article-derived, self-contained, NEVER a verbatim excerpt
  alt: string; // what is VISIBLE — journalist-supplied, distinct from caption (WCAG 1.1.1)
  credit: ImageCredit; // per-frame photo credit — a different axis from the module source
  sourcePassage: string; // the matched article passage — the tripwire's reference
  fit?: "crop" | "canvas-frame"; // per-frame override of ImageStory.fit
  align?: "left" | "right" | "center";
}

export interface ImageStory {
  title: string; // the insight — persistent header, never a caption
  description: string; // intro caption (what/when/where)
  source: { name: string; url?: string }; // ARTICLE/DATA provenance (≠ per-frame credit)
  frames: ImageStep[];
  keyFrame: number; // index of the representative frame → static export
  fit: "canvas-frame" | "crop"; // project default (canvas-frame is the safe editorial default)
  lang?: string;
  imageDir: string; // root for resolving frameRefs (suggest-image → engine handoff)
}

export function checkImageConformance(
  _story: ImageStory,
  _opts?: { overlapThreshold?: number },
): string[] {
  return [];
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd skills/image-native && bun test`
Expected: PASS (1 pass).

- [ ] **Step 7: Commit**

```bash
git add skills/image-native/package.json skills/image-native/tsconfig.json skills/image-native/src/image-story.ts skills/image-native/tests/image-story.test.ts
git commit -m "feat(image-native): scaffold ImageStory schema + conformance baseline"
```

---

### Task 2: Furniture conformance (title / description / source name)

**Files:**
- Modify: `skills/image-native/src/image-story.ts`
- Test: `skills/image-native/tests/image-story.test.ts`

**Interfaces:**
- Consumes: `ImageStory` (Task 1).
- Produces: `checkImageConformance` now enforces the module-standalone furniture.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe("checkImageConformance", …)` block:

```ts
  it("should flag a missing title", () => {
    const s = validStory();
    s.title = "  ";
    expect(checkImageConformance(s)).toContain("missing story title");
  });

  it("should flag a missing description", () => {
    const s = validStory();
    s.description = "";
    expect(checkImageConformance(s)).toContain(
      "missing description — a module must state what/when/where",
    );
  });

  it("should flag a missing source name", () => {
    const s = validStory();
    s.source = { name: "" };
    expect(checkImageConformance(s)).toContain(
      "missing source name — an embedded module must carry its own source",
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/image-native && bun test`
Expected: FAIL — the three new tests fail (current impl returns `[]`).

- [ ] **Step 3: Implement the furniture rules**

Replace the body of `checkImageConformance` in `image-story.ts`:

```ts
export function checkImageConformance(
  story: ImageStory,
  _opts?: { overlapThreshold?: number },
): string[] {
  const v: string[] = [];
  if (!story.title?.trim()) v.push("missing story title");
  if (!story.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!story.source?.name?.trim())
    v.push("missing source name — an embedded module must carry its own source");
  return v;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/image-native && bun test`
Expected: PASS (4 pass).

- [ ] **Step 5: Commit**

```bash
git add skills/image-native/src/image-story.ts skills/image-native/tests/image-story.test.ts
git commit -m "feat(image-native): conformance requires title, description, source name"
```

---

### Task 3: Frame-count bounds + keyFrame range

**Files:**
- Modify: `skills/image-native/src/image-story.ts`
- Test: `skills/image-native/tests/image-story.test.ts`

**Interfaces:**
- Consumes: `ImageStory`.
- Produces: conformance enforces 2–6 frames and an in-range `keyFrame`. (The scrolly ≥3-step floor is inherited downstream from `checkScrollyConformance` in P3; here we enforce the crossfade minimum of 2 and the embedded-module cap of 6.)

- [ ] **Step 1: Write the failing tests**

```ts
  it("should flag fewer than 2 frames (no crossfade possible)", () => {
    const s = validStory();
    s.frames = [s.frames[0]!];
    s.keyFrame = 0;
    expect(checkImageConformance(s)).toContain(
      "only 1 frame — an image sequence needs at least 2",
    );
  });

  it("should flag more than 6 frames (too long for an embedded module)", () => {
    const s = validStory();
    const base = s.frames[0]!;
    s.frames = Array.from({ length: 7 }, (_, i) => ({ ...base, id: `f${i}` }));
    expect(checkImageConformance(s)).toContain(
      "7 frames — an embedded image scrolly is capped at 6; cull upstream",
    );
  });

  it("should flag a keyFrame index out of range", () => {
    const s = validStory();
    s.keyFrame = 5;
    expect(checkImageConformance(s)).toContain(
      "keyFrame 5 out of range [0,2)",
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/image-native && bun test`
Expected: FAIL — three new failures.

- [ ] **Step 3: Implement the bounds**

Append to `checkImageConformance`, before `return v;`:

```ts
  const n = story.frames.length;
  if (n < 2) v.push(`only ${n} frame${n === 1 ? "" : "s"} — an image sequence needs at least 2`);
  if (n > 6) v.push(`${n} frames — an embedded image scrolly is capped at 6; cull upstream`);
  if (
    !Number.isInteger(story.keyFrame) ||
    story.keyFrame < 0 ||
    story.keyFrame >= n
  )
    v.push(`keyFrame ${story.keyFrame} out of range [0,${n})`);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/image-native && bun test`
Expected: PASS (7 pass).

- [ ] **Step 5: Commit**

```bash
git add skills/image-native/src/image-story.ts skills/image-native/tests/image-story.test.ts
git commit -m "feat(image-native): conformance enforces 2-6 frames and keyFrame range"
```

---

### Task 4: Per-frame integrity (alt present + alt≠caption + credit + ids)

**Files:**
- Modify: `skills/image-native/src/image-story.ts`
- Test: `skills/image-native/tests/image-story.test.ts`

**Interfaces:**
- Consumes: `ImageStep`.
- Produces: conformance enforces the a11y-critical per-frame fields (the verification pass's blocker: `alt` required and distinct from `caption`).

- [ ] **Step 1: Write the failing tests**

```ts
  it("should flag a frame with empty alt (WCAG 1.1.1)", () => {
    const s = validStory();
    s.frames[1]!.alt = "   ";
    expect(checkImageConformance(s)).toContain(
      'frame "f1" has empty alt — a photo needs a text alternative describing what is visible',
    );
  });

  it("should flag alt identical to caption (they answer different questions)", () => {
    const s = validStory();
    s.frames[0]!.alt = s.frames[0]!.caption;
    expect(checkImageConformance(s)).toContain(
      'frame "f0" alt duplicates its caption — alt describes what is visible, caption states significance',
    );
  });

  it("should flag a frame missing a photo credit", () => {
    const s = validStory();
    s.frames[0]!.credit = { name: "" };
    expect(checkImageConformance(s)).toContain(
      'frame "f0" has no photo credit — each image carries its own attribution',
    );
  });

  it("should flag an empty caption", () => {
    const s = validStory();
    s.frames[1]!.caption = "";
    expect(checkImageConformance(s)).toContain('frame "f1" has empty caption');
  });

  it("should flag a duplicate frame id", () => {
    const s = validStory();
    s.frames[1]!.id = "f0";
    expect(checkImageConformance(s)).toContain('duplicate frame id "f0"');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/image-native && bun test`
Expected: FAIL — five new failures.

- [ ] **Step 3: Implement the per-frame loop**

Append to `checkImageConformance`, before `return v;`:

```ts
  const ids = new Set<string>();
  for (const f of story.frames) {
    if (ids.has(f.id)) v.push(`duplicate frame id "${f.id}"`);
    ids.add(f.id);
    if (!f.caption?.trim()) v.push(`frame "${f.id}" has empty caption`);
    if (!f.alt?.trim())
      v.push(
        `frame "${f.id}" has empty alt — a photo needs a text alternative describing what is visible`,
      );
    else if (f.alt.trim() === f.caption?.trim())
      v.push(
        `frame "${f.id}" alt duplicates its caption — alt describes what is visible, caption states significance`,
      );
    if (!f.credit?.name?.trim())
      v.push(`frame "${f.id}" has no photo credit — each image carries its own attribution`);
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/image-native && bun test`
Expected: PASS (12 pass).

- [ ] **Step 5: Commit**

```bash
git add skills/image-native/src/image-story.ts skills/image-native/tests/image-story.test.ts
git commit -m "feat(image-native): conformance enforces per-frame alt, credit, caption, unique ids"
```

---

### Task 5: The `captionOverlapRatio` helper (normalized token overlap)

**Files:**
- Modify: `skills/image-native/src/image-story.ts`
- Test: `skills/image-native/tests/image-story.test.ts`

**Interfaces:**
- Consumes: two strings.
- Produces: `captionOverlapRatio(caption, passage): number` — a 0..1 Jaccard over normalized content tokens, EXCLUDING numbers and proper nouns (Capitalized-in-original tokens), so a legitimately self-contained caption that merely shares place names/dates with the passage scores low, while a near-copy of the passage's descriptive prose scores high. This is the corrected tripwire core (a literal substring was both false-positive- and false-negative-prone).

- [ ] **Step 1: Write the failing tests (in a new describe block)**

```ts
describe("captionOverlapRatio", () => {
  it("should score a self-contained rephrase low even when it shares a place name and year", () => {
    // Shared tokens are the proper noun "Annemasse" and the number "2019" — both excluded.
    const caption = "The frontier town swelled as workers arrived.";
    const passage =
      "Annemasse grew fast after 2019 as cross-border workers poured in.";
    expect(captionOverlapRatio(caption, passage)).toBeLessThan(0.3);
  });

  it("should score a near-verbatim copy high", () => {
    const passage =
      "Residents recall a quiet towpath where families once walked on Sundays.";
    const caption =
      "residents recall a quiet towpath where families once walked";
    expect(captionOverlapRatio(caption, passage)).toBeGreaterThan(0.6);
  });

  it("should be symmetric and return 0 for disjoint content", () => {
    expect(captionOverlapRatio("alpha beta gamma", "delta epsilon zeta")).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/image-native && bun test`
Expected: FAIL — `captionOverlapRatio is not a function`.

- [ ] **Step 3: Implement the helper**

Add to `image-story.ts` (above `checkImageConformance`):

```ts
// Content tokens for the overlap tripwire: lowercase word tokens, MINUS proper nouns
// (any token that appears Capitalized in the original text) and MINUS pure numbers.
// Rationale: a self-contained caption legitimately reuses place names, people, and dates
// from the passage it describes — those must NOT count as "copying the article". What we
// flag is reuse of the passage's ordinary descriptive/connective prose.
function contentTokens(text: string): Set<string> {
  const properOrNumber = new Set<string>();
  for (const m of text.matchAll(/\b([A-Z][\w'-]*|\d[\d.,]*)\b/g))
    properOrNumber.add(m[1].toLowerCase());
  const tokens = new Set<string>();
  for (const m of text.toLowerCase().matchAll(/[a-z][a-z'-]+/g)) {
    const t = m[0];
    if (properOrNumber.has(t)) continue; // proper noun (capitalized somewhere) — excluded
    tokens.add(t);
  }
  return tokens;
}

// Jaccard overlap (|A∩B| / |A∪B|) of the two token sets. 0 = disjoint, 1 = identical set.
export function captionOverlapRatio(caption: string, passage: string): number {
  const a = contentTokens(caption);
  const b = contentTokens(passage);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
```

Note: in the first test, "Annemasse" is capitalized (proper noun → excluded) and "2019" is a number (excluded), so the remaining caption tokens (`frontier`, `town`, `swelled`, `workers`, `arrived`) barely intersect the passage's content tokens (`grew`, `fast`, `after`, `cross`, `border`, `workers`, `poured`) — only `workers` overlaps → low ratio. In the second, nearly every content token is shared → high ratio.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/image-native && bun test`
Expected: PASS (15 pass).

- [ ] **Step 5: Commit**

```bash
git add skills/image-native/src/image-story.ts skills/image-native/tests/image-story.test.ts
git commit -m "feat(image-native): add captionOverlapRatio (proper-noun/number-exempt Jaccard)"
```

---

### Task 6: Wire the overlap tripwire + required sourcePassage into conformance

**Files:**
- Modify: `skills/image-native/src/image-story.ts`
- Test: `skills/image-native/tests/image-story.test.ts`

**Interfaces:**
- Consumes: `captionOverlapRatio` (Task 5), `ImageStep.sourcePassage`.
- Produces: `checkImageConformance` now fails hard when `sourcePassage` is missing (so the guard can't be bypassed by omission) and when a caption overlaps its passage beyond `overlapThreshold` (default 0.6).

- [ ] **Step 1: Write the failing tests**

Add inside the `describe("checkImageConformance", …)` block:

```ts
  it("should flag a frame whose caption is missing its sourcePassage", () => {
    const s = validStory();
    s.frames[0]!.sourcePassage = "";
    expect(checkImageConformance(s)).toContain(
      'frame "f0" has no sourcePassage — an article-derived caption must record the passage it came from',
    );
  });

  it("should flag a caption that copies its sourcePassage", () => {
    const s = validStory();
    s.frames[0]!.sourcePassage =
      "Residents recall a quiet towpath where families once walked on Sundays.";
    s.frames[0]!.caption =
      "residents recall a quiet towpath where families once walked";
    const out = checkImageConformance(s);
    expect(out.some((m) => m.includes('frame "f0" caption too close to its source passage'))).toBe(true);
  });

  it("should respect a custom overlapThreshold", () => {
    const s = validStory();
    s.frames[0]!.sourcePassage = "the eastern bank before the works began";
    s.frames[0]!.caption = "The eastern bank before the works began.";
    // Identical content → ratio 1.0; a threshold of 0.99 still flags it, 1.01 never would.
    expect(checkImageConformance(s, { overlapThreshold: 0.5 }).some((m) =>
      m.includes("too close to its source passage"),
    )).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/image-native && bun test`
Expected: FAIL — three new failures.

- [ ] **Step 3: Implement the tripwire in the per-frame loop**

In `checkImageConformance`, first read the threshold at the top of the function (just after `const v: string[] = [];`):

```ts
  const overlapThreshold = _opts?.overlapThreshold ?? 0.6;
```

Rename the parameter `_opts` → `opts` in the signature (it is now used):

```ts
export function checkImageConformance(
  story: ImageStory,
  opts?: { overlapThreshold?: number },
): string[] {
  const v: string[] = [];
  const overlapThreshold = opts?.overlapThreshold ?? 0.6;
```

Then inside the `for (const f of story.frames)` loop, append:

```ts
    if (!f.sourcePassage?.trim())
      v.push(
        `frame "${f.id}" has no sourcePassage — an article-derived caption must record the passage it came from`,
      );
    else {
      const ratio = captionOverlapRatio(f.caption ?? "", f.sourcePassage);
      if (ratio > overlapThreshold)
        v.push(
          `frame "${f.id}" caption too close to its source passage (overlap ${ratio.toFixed(
            2,
          )} > ${overlapThreshold}) — rephrase self-contained, never a verbatim excerpt`,
        );
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/image-native && bun test`
Expected: PASS (18 pass).

- [ ] **Step 5: Run the whole suite once more + a typecheck**

Run: `cd skills/image-native && bun test && bunx tsc --noEmit`
Expected: all tests PASS (18 pass); tsc prints nothing (no type errors on the pure `src`).

- [ ] **Step 6: Commit**

```bash
git add skills/image-native/src/image-story.ts skills/image-native/tests/image-story.test.ts
git commit -m "feat(image-native): tripwire — require sourcePassage + flag caption/passage overlap"
```

---

### Task 7: Register image-native in the root quality gate

**Files:**
- Modify: `scripts/check.mjs`

**Interfaces:**
- Consumes: the image-native package (tsconfig + tests) from Tasks 1–6.
- Produces: `bun run check` typechecks and tests image-native — the repo-wide green gate now covers the new engine (without this, the engine is invisible to CI and the "all green" claim is false).

- [ ] **Step 1: Add image-native to both dir lists**

In `scripts/check.mjs`, add `"skills/image-native"` to `TSC_DIRS` (after `"skills/scrolly"`) and to `TEST_DIRS` (after `"skills/scrolly"`). The two lines become:

```js
const TSC_DIRS = ["skills/atelier", "skills/chart-native", "skills/map-native", "skills/scrolly", "skills/image-native", "install"];
```

and, inside `TEST_DIRS`, insert `"skills/image-native",` immediately after the `"skills/scrolly",` entry.

- [ ] **Step 2: Run the full gate**

Run: `bun run check`
Expected: the run stays green and now shows two new PASS rows — `tsc   skills/image-native` and `test  skills/image-native` — and the summary count grows by 2 (e.g. `16/16` → `18/18`).

- [ ] **Step 3: Commit**

```bash
git add scripts/check.mjs
git commit -m "chore(image-native): register engine in the root quality gate"
```

---

### P1 self-review checklist (run before handing off to P2)

- [ ] `bun test` green (18 tests) and `bunx tsc --noEmit` clean in `skills/image-native`.
- [ ] `bun run check` green at the repo root with the two new `skills/image-native` rows (T7).
- [ ] Every §5 schema field is present in the exported types; every §6 rule maps to a test:
      furniture (T2) · 2–6 frames + keyFrame (T3) · alt present/≠caption + credit + ids (T4) ·
      overlap helper (T5) · required sourcePassage + overlap tripwire (T6).
- [ ] No engine text generation introduced (conformance only reads/compares strings).
- [ ] Naming matches the "Interfaces produced" block exactly (P2–P5 import these names).

---

## P2–P5 — roadmap (detail written when the predecessor lands)

**P2 — `prep-images.mjs`.** Deterministic sharp pipeline. Read a story manifest + `imageDir`; for each frame: `sharp(input).rotate()` (bake EXIF orientation) → convert to sRGB → resize to the channel `mediaSize` with `fit=canvas-frame` (`fit: "contain"`, neutral matte from theme) as the default or `fit: "cover"` for `crop` → WebP quality ~82 → write into a self-contained work dir. Preflight: reject unsupported/oversized input with a clear message; when `crop` would discard more than `cropDiscardThreshold` (~0.30) of the frame, warn/fail. Tests use tiny fixture images committed under `tests/fixtures/`; assert identical output dimensions across frames, EXIF baked (a pre-rotated fixture lands upright), and byte-for-byte determinism across two runs. Add `sharp` to `skills/image-native/package.json`. Channel size comes from `skills/atelier/src/channel.ts` (single source of truth).

**P3 — scrolly integration.** `skills/scrolly/src/image-chapters.ts`: `imageStoryToChapters(story: ImageStory): ScrollyStory` (mirrors `chart-chapters.ts`; caption passed through, `visual:"image"`, `action:"crossfade"`, `ref` = frame index). `skills/scrolly/src/ScrollyImage.tsx`: sticky graphic that crossfades opacity between frame `currentStep` and the next; each `<img>` carries its `alt`; per-frame credit overlay (localized label); honors `prefers-reduced-motion` with a hard opacity cut (no fade). Wire the `visual:"image"` branch into `Scrolly.tsx`'s dispatcher (the sticky-graphic slot). Fix the unconditional `<a href={config.source.url}>` at `Scrolly.tsx:590` to render plain text when `source.url` is absent (reuse the `sourceHasAnchor` logic from `map-native/scripts/snap-a11y.mjs:66,314-319`). Tests: `imageStoryToChapters` mapping (bun:test) + a Playwright smoke that scrolls and asserts frame opacity swaps + alt present.

**P4 — producers.** `static`: export the `keyFrame` at channel size carrying its own `alt`. `video`: a Remotion composition (`skills/image-native/remotion/`, `Root.tsx` + `ImageCrossfade.tsx`) that holds each frame `holdFrames`, crossfades `crossfadeFrames` (ease-in-out), fps configurable; `durationInFrames = N*hold + (N-1)*fade`; burns in per-frame caption + credit + persistent title/source furniture (reuse the generic furniture). `scripts/produce.mjs` channel-gates (no interactive; scrolly/video only where the channel allows) and validates a single still (caption+credit visible) before rendering the mp4 (video discipline). Mirror `chart-native/scripts/render-video.mjs` for the Remotion invocation.

**P5 — a11y + export + orchestrator.** `scripts/snap-a11y.mjs`: assert every `<img>` alt is non-empty and not the generic `"visual"`, assert the reduced-motion hard-cut, reuse `sourceHasAnchor`. Wire `skills/atelier/scripts/export-code.mjs` (`:77`, `:85`) to emit each frame's real `alt` + credit instead of the hardcoded `alt="visual"`; the 3 export forms per spec §11. `skills/suggest-image/` skill (SKILL.md canon): vision used only to match image→passage + order; captions rephrased from the matched passage under the `prose-provenance` discipline (`2026-06-27-prose-extracted-provenance-design.md`); a **mandatory, non-skippable** confirm-back gate on order + captions; a vetoable cull to 3–6 frames that surfaces dropped frames; an unmatched-image halt with an editorial prompt (never auto-drop, never auto-invent); collects journalist-supplied `alt` + `credit`; emits `image-story.json`.
