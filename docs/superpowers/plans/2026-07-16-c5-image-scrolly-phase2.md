# C5 — image-scrolly Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.
>
> **This is a RESUME plan, not a from-scratch plan.** The authoritative design is
> `docs/superpowers/specs/2026-07-10-image-scrolly-design.md` (validated, adversarially
> reviewed — its §5-§13 carry the detail this plan cites). Phase 1
> (`docs/superpowers/plans/2026-07-10-image-scrolly.md`, 7 tasks) is DELIVERED: the
> `skills/image-native` data contract (`ImageStory` schema + conformance + gate registration).
> Phase 2 = producers + renderer + `suggest-image` + splash routing + suggesteur recognition.
> Where this plan and the 2026-07-10 spec conflict, the deltas in "Reconciliation" below WIN
> (they absorb the 2026-07-16 flow inversion).

**Goal:** a journalist with a narrative text block + their own images gets an image-scrolly
proposed in the ranked list (instead of "not enough data"), and cycle 1 delivers a working
scrolly.html from their images + article-derived captions (Tom's #3).

**Architecture:** per the 2026-07-10 spec §3: ② `suggest-image` (vision for matching/ordering
ONLY, words from the article, mandatory veto gate) → ③ `skills/image-native` (deterministic:
`prep-images.mjs`, producers) → `skills/scrolly` gains the `visual:"image"` branch hosting
`ScrollyImage.tsx`. Splash routes it as producer `"scrolly"` with an ImageStory-bearing config
(no new Producer union member needed — mirror how map configs already ride the scrolly
producer).

**Tech Stack:** TypeScript, Bun, bun:test, React (scrolly renderer), sharp (prep).

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun, bun:test, TDD.
- Splash NEVER generates images, captions from vision, or alt text (spec §2 non-goals: alt and
  credit are journalist-supplied; caption words come from the matched article passage).
- **v1 format = `scrolly` ONLY** (2026-07-16 spec decision — narrower than the 2026-07-10
  spec's static+video+scrolly grid: static/video producers are follow-ups; the conformance
  format floors for them already exist and stay).
- Depends on C3+C4 (ranked list) being merged — the recognition rule lands in the Stage-1
  candidates contract.

## Reconciliation (2026-07-16 deltas over the 2026-07-10 spec)

1. **Channel comes late now** — the spec's "canal (CADRAGE Q3)" input becomes the PROPOSITION
   « Où vivra-t-il ? » turn (C3). An image-scrolly is only reachable on `article-web` (a
   scrolly is a kind of interactive — off-embed channels exclude it, unchanged hard rule).
2. **Ranked-list entry** (C4): image-scrolly appears as a Stage-1 candidate when the
   recognition rule fires — never as a silent fallback.
3. **v1 = scrolly only** (above).

---

### Task 1: `prep-images.mjs` — deterministic image prep (spec §8)

**Files:**
- Create: `skills/image-native/scripts/prep-images.mjs`
- Create: `skills/image-native/package.json` gains `sharp` dependency
- Test: `skills/image-native/tests/prep-images.test.ts`

**Interfaces:**
- Consumes: `ImageStory` manifest (`src/image-story.ts`, phase 1) + raw images in
  `story.imageDir`.
- Produces: `bun scripts/prep-images.mjs <image-story.json> <outDir>` → writes
  `<outDir>/frames/<id>.jpg` per frame (sRGB, EXIF-stripped, fitted per `fit`:
  `canvas-frame` = contain on canvas, `crop` = cover), plus `<outDir>/prep-report.json`
  (`{ frames: [{ id, src, width, height, bytes }] }`). Read spec §8 for the exact fit
  semantics, target box (1200×675 article-web), and compression floor before implementing.

- [ ] **Step 1: Write the failing test** — build a 2-frame fixture (two tiny PNGs written by
  the test via sharp, a minimal valid ImageStory JSON), run the CLI with `execFileSync`, assert:
  both output frames exist, are JPEG, match the target box, `prep-report.json` lists them in
  story order, and a frameRef pointing to a missing file exits non-zero with the filename in
  stderr.
- [ ] **Step 2: Run to verify it fails** (`cd skills/image-native && bun test`)
- [ ] **Step 3: Implement** per spec §8 (deterministic: sharp resize + `withMetadata({})` strip;
  `canvas-frame` = `fit: "contain"` on a background canvas derived from the story's theme,
  `crop` = `fit: "cover"`; per-frame `fit` override wins over `story.fit`).
- [ ] **Step 4: Run — green.**
- [ ] **Step 5: Commit** — `feat(image-native): deterministic prep-images (fit + sRGB + strip + report)`

---

### Task 2: `ScrollyImage.tsx` renderer + `visual:"image"` dispatch in skills/scrolly (spec §9)

**Files:**
- Create: `skills/scrolly/src/ScrollyImage.tsx`
- Modify: `skills/scrolly/src/Scrolly.tsx` (the visual dispatcher — read how `ScrollyChart` /
  `ScrollyMap` branch today and add the `image` branch the same way)
- Modify: `skills/scrolly/src/chapters.ts` (or the config entry seam `mount.tsx` reads —
  follow the existing config shape: the scrolly config gains
  `{ visual: "image", story: ImageStory, framesDir: string }`)
- Test: `skills/scrolly/tests/scrolly-image.test.ts` (mirror the existing scrolly config/
  conformance tests — pure: config→chapters derivation, no DOM)

**Interfaces:**
- Consumes: prepped frames (Task 1) + `imageStoryToChapters` from
  `skills/image-native/src/image-story.ts` (phase 1 export — verify its exact signature there
  before wiring).
- Produces: a scrolly.html where each step crossfades between consecutive frames
  (opacity transition, the mechanism `ScrollyChart` uses for its beats), caption + per-frame
  credit rendered in the step card, `alt` on every `<img>`, furniture (title/description/
  source) derived from `deriveFurniture(config.themeBg)` exactly like the other renderers
  (theme parity — `scaffold-theme-parity.test.ts` must keep passing).

- [ ] **Step 1: Write the failing derivation test** — ImageStory (3 frames) →
  `imageStoryToChapters` → assert chapter count, order, captions, and that the config
  dispatcher routes `visual:"image"` to the image branch (export a pure `resolveVisual(config)`
  seam if none exists — mirror how the map/chart branch is chosen today).
- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `ScrollyImage.tsx`** — crossfade on scroll progress between
  `frames/<id>.jpg`, step cards with caption + credit (name, url when present), `alt` per
  frame; no MapTiler, no remotion (web-only path).
- [ ] **Step 4: Wire the dispatcher + produce path** — `skills/scrolly/scripts/produce.mjs`
  already builds whatever config it gets; verify the image config round-trips (frames copied
  or inlined into the single-file HTML — follow how the chart path handles its assets; if
  frames must inline, base64 them at build via the existing Vite single-file plugin).
- [ ] **Step 5: Render-verify on a REAL example** — produce a 3-frame scrolly from fixture
  images, open it, scroll, screenshot two steps; the plan's reviewer must see the crossfade
  and furniture (verify the DELIVERED file, not the proof).
- [ ] **Step 6: Run both suites (`skills/scrolly`, `skills/image-native`) — green. Commit** —
  `feat(scrolly): ScrollyImage renderer + visual:"image" dispatch (crossfade, captions, credits, a11y alt)`

---

### Task 3: `produce.mjs` for image-native (the engine's single-format entry)

**Files:**
- Create: `skills/image-native/scripts/produce.mjs`
- Test: `skills/image-native/tests/produce.test.ts`

**Interfaces:**
- Consumes: `checkImageConformance(story, format)` (phase 1), Task 1's prep, Task 2's scrolly
  path.
- Produces: `bun scripts/produce.mjs <image-story.json> <outDir> scrolly` — the same
  single-format CLI contract as the other engines (`adapters.ts` SCRIPT table shape:
  `<config> <outDir> <format>`): runs conformance fail-hard → prep → invokes
  `skills/scrolly/scripts/produce.mjs` with the assembled `visual:"image"` config → asserts
  `scrolly.html` exists non-empty. Any format other than `scrolly` exits 1 with
  `image-native builds "scrolly" only in v1 — static/video are follow-ups`.

- [ ] **Step 1: Failing CLI test** (conformance-violating story → non-zero + violation on
  stderr; valid story → scrolly.html exists; format `static` → exit 1 with the v1 message).
- [ ] **Step 2: Implement; run; green.**
- [ ] **Step 3: Commit** — `feat(image-native): single-format produce CLI (scrolly v1)`

---

### Task 4: Splash routing — image stories ride the spine

**Files:**
- Modify: `skills/splash/src/adapters.ts` (SCRIPT/SKILL_DIR tables + isFileBased: add
  `"image-native"`… **decision point, read first**): the 2026-07-10 spec routes the scrolly
  FORMAT through `skills/scrolly` while `image-native` owns prep/conformance. Two options —
  (a) new `Producer` union member `"image-native"` dispatching to Task 3's produce.mjs
  (clean, mirrors map-native), or (b) reuse producer `"scrolly"` with the image config.
  **Choose (a)**: `producer-spec.ts`'s union gains `"image-native"`, `adapters.ts` tables gain
  its script/dir, `validate-gate.ts`'s `validateProducerSpec` switch gains
  `checkImageConformance` — grep every `Producer` exhaustive switch (`grep -rn "map-native"
  skills/splash/src` finds them all) and extend each; the compiler's exhaustiveness errors
  are the checklist.
- Modify: `skills/splash/src/preflight.ts` (C2): add the `image-native` manifest entry —
  `env: []`, `criticalDeps: { fromSkillDir: "image-native", packages: ["sharp"] }`.
- Test: `skills/splash/tests/adapters.test.ts`, `skills/splash/tests/validate-gate.test.ts`
  (extend both following their existing per-producer cases).

- [ ] **Step 1: Failing tests** — an accepted `image-native` proposal (valid ImageStory spec,
  format `scrolly`, channel `article-web`) validates ok and dispatches to
  `skills/image-native/scripts/produce.mjs`; format `video` fails at `assertFormatAllowed`…
  (verify: `scrolly` IS in article-web's allowed set, `channel.ts:31-53`); a conformance
  violation fails validation loud.
- [ ] **Step 2: Implement through the compiler's exhaustiveness errors; run; green.**
- [ ] **Step 3: Commit** — `feat(splash): image-native producer routed end-to-end (validate + dispatch + preflight)`

---

### Task 5: `suggest-image` skill (spec §7) + recognition rule in the ranked list (C4)

**Files:**
- Create: `skills/suggest-image/SKILL.md` (canonical 8-section format; the ② orchestration
  procedure: match each image to an article passage via vision — matching/ordering ONLY —
  derive captions from the matched passages, propose order + keyFrame, emit
  `image-story.json`, MANDATORY journalist gate on order+captions+cull before produce; alt +
  credit are ASKED FOR, never generated — spec §7 carries the exact procedure and §10 the
  furniture/a11y rules)
- Modify: `skills/suggest-chart/SKILL.md` — Stage 1 candidates (C4) gains the recognition
  rule
- Test: extend `skills/splash/tests/skill-doc-parity.test.ts` (C3+C4's file)

**Interfaces:**
- Consumes: C4's `candidates` contract.
- Produces: the Stage-1 rule that turns Tom's dead-end into a proposal.

- [ ] **Step 1: Failing doc-parity test** — suggest-chart SKILL.md contains an
  `image-scrolly` recognition block; the old dead-end is rephrased (grep: the bare "not
  enough for an honest data visual" refusal must now be accompanied by the alternative).
- [ ] **Step 2: Write the recognition rule** (in suggest-chart SKILL.md, beside the no-chart
  decision):

```markdown
**Image-scrolly recognition (C5).** When the claim is NARRATIVE (a place, a process, a
before/after, a sequence of scenes) and the data test above fails (< 3 usable numbers — the
honest-data guard for CHARTS, unchanged), do NOT stop at `no-chart`: emit an
`image-scrolly` candidate (producer `image-native`, tier per fit) stating what the
journalist must supply — « tu fournis 3-6 images (photos, satellite, archives) + leur
crédit ; je dérive les légendes de ton article, tu valides tout avant rendu ». The chart
refusal stays exactly as-is when the journalist asks for a CHART; the candidate is the
alternative, not a softening of the data bar.
```

- [ ] **Step 3: Write `skills/suggest-image/SKILL.md`** per spec §7 (the gate is mandatory
  and non-skippable — mirror Gate 1b's confirm-back language).
- [ ] **Step 4: Run parity tests — green. Commit** —
  `feat(suggest): image-scrolly recognition in the ranked list + suggest-image orchestration skill`

---

### Task 6: End-to-end proof + gate registration

- [ ] **Step 1: E2E on a real case** — take Tom's failing input class (a text block with a few
  percentages + 3 fixture images), drive: recognition → candidates include image-scrolly →
  accept → suggest-image manifest → journalist-gate simulation → produce → open the delivered
  scrolly.html, screenshot 2 steps. The DELIVERED artifact is the proof.
- [ ] **Step 2: Gate** — image-native is already in `bun run check` (phase 1); verify the new
  test files are inside the covered TEST_DIRS (`scripts/check.mjs`), add the dirs if not —
  same pattern as the map-scrolly bundle work (tests ride existing gate lines, no new line
  unless a dir is genuinely new).
- [ ] **Step 3: Full gate green + commit** —
  `feat(image-scrolly): phase 2 complete — journalist images to delivered scrolly, e2e proven`
