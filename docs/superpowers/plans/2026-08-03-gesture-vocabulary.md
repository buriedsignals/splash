# Le vocabulaire des gestes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each engine declares, per type and per narrative kind, what it can actually make move — so a storyboard proposal can only offer gestures that exist.

**Architecture:** A closed `Gesture` union and a `NarrativeKind` union live in `lib/core/gestures.ts`. `EngineType` in `lib/core/registry.ts` gains an optional `gestures` field. Each engine's `src/manifest.ts` declares its own vocabulary, **derived from an inventory of what its components actually do today** — not from what would be nice. A drift test reads the declarations and fails if one names a gesture outside the union or claims a narrative kind the engine has no component for.

**Tech Stack:** TypeScript (`strict: true`), Bun, `bun:test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-03-editorial-storyboard-design.md` — this plan is sub-project ① of § 7.

## Global Constraints

- **This sub-project changes NO behaviour.** It declares what is already true and adds a test that reads the declaration. Any task that finds itself changing a renderer has left its scope — stop and report.
- Runtime is **Bun**, never npm/node. `cd lib && bun test <path>` — from the repo root the lib invocation is cwd-sensitive and fabricates five false failures. `cd skills/<engine> && bun test tests/<file>`.
- No `any`; `strict: true`. Code, comments, identifiers, commit messages: **English**. Non-negotiable.
- **No mention of any AI tool** in commits, code, docs or output.
- **Never stage anything under `output-proof/`** and never stage a rendered artefact. Running a producer overwrites tracked proof PNGs as a side effect — `git checkout --` them if it happens. `git status --short` before every commit.
- **Commit before any long verification.** Every real loss on this project has been an uncommitted tree.
- **Mutation-verify every guard added.** Break it, watch the covering test redden, restore, record both. Five guards on this project were green while the bug was present.
- **A fresh worktree has no `.env`** (untracked). Without it `skills/scrolly` reports 4 fail/3 errors and no render is possible — that is environment, not regression. `ln -s ../splash-merge/.env .env` first.
- **`git stash` never establishes that a red is pre-existing** on a multi-commit branch. Compare against the **merge-base**, or a second worktree. This method produced three wrong clearances in one day.

---

### Task 1: The inventory — what the components actually make move today

**This task writes no product code.** Its output is the evidence every later task declares from. Declaring a vocabulary from imagination rather than from the components would produce exactly the defect this whole sub-project exists to close: a promise nothing honours.

**Files:**
- Create: `docs/splash/gesture-inventory-2026-08-03.md`

- [ ] **Step 1: Establish the three narrative families in map-native**

Read the three component families in `skills/map-native/src/components/`:
- `*Story.tsx` (6 files — there is no `RouteStory.tsx`)
- `*Scrolly.tsx` (7 files + `MapScrolly.tsx`)
- `*Reveal.tsx` (7 files)

For each file record, with a line reference: does the camera move between beats, and by what call? Does anything animate in place, and what? `LocatorStory.tsx` and `ChoroplethStory.tsx` are the two that provably honour a confirmed storyboard today — use them as the reference for what a working gesture looks like.

- [ ] **Step 2: Record which components read `config.arcBeats`**

```bash
cd skills/map-native/src/components
for f in *Story.tsx *Scrolly.tsx *Reveal.tsx; do printf "%-28s %s\n" "$f" "$(grep -c 'config\.arcBeats' "$f")"; done
```

Expected from the 2026-08-03 audit, to be confirmed or corrected: every `*Reveal.tsx` returns 0 except `RouteReveal.tsx`, whose single hit is a comment stating it deliberately does not read it. **If your measurement disagrees, your measurement wins** — record it.

- [ ] **Step 3: Do the same for chart-native**

`skills/chart-native/src/components/` — the vocabulary here is different: charts have no camera. Record what each family actually animates (bars growing, a line drawing, a series highlighting, a value label appearing) and which components support a beat-driven sequence versus a single reveal.

- [ ] **Step 4: Cover the remaining four engines briefly**

`dw-chart`, `map-dw`, `scrolly`, `image-native`. Two of them (`dw-chart`, `map-dw`) delegate rendering to Datawrapper and own no motion — record that as a finding, not a gap. `scrolly` orchestrates other engines' renderers. `image-native` has its own crossfade vocabulary.

- [ ] **Step 5: Write the inventory**

Per engine × type × narrative kind: **what moves, proven by which line**. Mark anything you could not settle by reading as *uncertain*, and say what would settle it. An inventory that hides its uncertainty is worse than one that maps it.

- [ ] **Step 6: Commit**

```bash
git add docs/splash/gesture-inventory-2026-08-03.md
git commit -m "docs(splash): what each engine actually makes move, measured"
```

---

### Task 2: The closed vocabulary

**Files:**
- Create: `lib/core/gestures.ts`
- Test: `lib/core/gestures.test.ts`

**Interfaces:**
- Produces: `NarrativeKind` (`"story" | "scrolly" | "reveal"`), `Gesture` (a closed string union), `GestureVocabulary` (`Partial<Record<NarrativeKind, readonly Gesture[]>>`), and `GESTURES` / `NARRATIVE_KINDS` as runtime-readable arrays. Tasks 3-5 import all of these.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { GESTURES, NARRATIVE_KINDS, type Gesture } from "./gestures";

test("the narrative kinds are exactly the three the spec names", () => {
  expect([...NARRATIVE_KINDS].sort()).toEqual(["reveal", "scrolly", "story"]);
});

test("every gesture is readable at runtime, so a test and a proposal read the SAME list", () => {
  // A union that exists only in the type system cannot be validated against at runtime —
  // the proposal brain and the gate both need to enumerate it.
  expect(GESTURES.length).toBeGreaterThan(0);
  const asSet = new Set<string>(GESTURES);
  expect(asSet.size).toBe(GESTURES.length); // no duplicates
});

test("camera gestures and data gestures are distinguishable without parsing a name", () => {
  // A chart has no camera; a map does. A caller must be able to ask "is this a camera move?"
  // without string-matching, or every consumer invents its own predicate.
  const { isCameraGesture } = require("./gestures");
  expect(isCameraGesture("fly" as Gesture)).toBe(true);
  expect(isCameraGesture("grow" as Gesture)).toBe(false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test core/gestures.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the module from Task 1's inventory**

```ts
// The closed vocabulary of what an engine can make move. A storyboard proposal composes ONLY
// from what the target engine declares here (spec 2026-08-03 § 6), so a proposal is feasible
// by construction rather than by the proposer's vigilance.
//
// Two families, deliberately not merged: a map has a camera that travels; a chart does not —
// it grows, draws and highlights in a fixed frame. Asking a chart to "fly" is meaningless, and
// the split is what lets a caller refuse that without string-matching a name.

/** How the beats of a video express themselves. A scrolly is always step-driven. */
export const NARRATIVE_KINDS = ["story", "scrolly", "reveal"] as const;
export type NarrativeKind = (typeof NARRATIVE_KINDS)[number];

/** Camera gestures — a frame that travels. Maps only. */
export const CAMERA_GESTURES = ["fly", "cut", "hold"] as const;

/** Data gestures — a fixed frame whose contents change. Every engine that animates. */
export const DATA_GESTURES = ["grow", "draw", "highlight", "appear", "crossfade"] as const;

export const GESTURES = [...CAMERA_GESTURES, ...DATA_GESTURES] as const;
export type Gesture = (typeof GESTURES)[number];

export type GestureVocabulary = Partial<Record<NarrativeKind, readonly Gesture[]>>;

export function isCameraGesture(g: Gesture): boolean {
  return (CAMERA_GESTURES as readonly string[]).includes(g);
}
```

**Adjust the two arrays to match Task 1's inventory** — if the inventory found a gesture these lists do not name, add it with a comment citing the file that implements it; if a name here has no implementation anywhere, remove it. **A vocabulary entry with no implementing component is exactly the promise-nothing-honours defect.**

- [ ] **Step 4: Run and watch it pass**

Run: `cd lib && bun test core/gestures.test.ts`
Expected: PASS, three tests.

- [ ] **Step 5: Commit**

```bash
git add lib/core/gestures.ts lib/core/gestures.test.ts
git commit -m "feat(core): the closed vocabulary of what an engine can make move"
```

---

### Task 3: `EngineType` carries a vocabulary

**Files:**
- Modify: `lib/core/registry.ts` (the `EngineType` type, around line 22)
- Test: `lib/core/registry-types.test.ts`

**Interfaces:**
- Consumes: `GestureVocabulary` from `lib/core/gestures.ts` (Task 2).
- Produces: `EngineType = { id: string; deferred?: string; gestures?: GestureVocabulary }`. Tasks 4-5 populate and read `gestures`.

- [ ] **Step 1: Write the failing test**

Add to `lib/core/registry-types.test.ts`:

```ts
import type { EngineType } from "./registry";
import type { Gesture } from "./gestures";

test("an EngineType may declare what it makes move, per narrative kind", () => {
  const t: EngineType = {
    id: "choropleth",
    gestures: { story: ["fly", "hold"], reveal: ["appear"] },
  };
  expect(t.gestures?.story).toContain("fly");
  // `gestures` is OPTIONAL: an engine that owns no motion (a hosted embed) declares nothing,
  // and that is a legitimate answer rather than an empty promise.
  const hosted: EngineType = { id: "d3-range-plot" };
  expect(hosted.gestures).toBeUndefined();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test core/registry-types.test.ts`
Expected: FAIL — `gestures` is not a property of `EngineType` (a `tsc` error surfaced by the test run).

- [ ] **Step 3: Add the field**

In `lib/core/registry.ts`, extend the existing `EngineType` and its comment:

```ts
// One renderable type of an engine, in the engine's OWN render-key vocabulary (chart-native
// says "slope", dw-chart says "d3-range-plot" for the same KB sheet). `deferred` carries the
// reason a type is declared but not reachable — declaring it is what lets the proposal brain
// say "not offered, and here is why" instead of pretending the type does not exist.
// `gestures` carries the same idea one level down: WHAT this type can make move, per narrative
// kind, so a storyboard proposal composes only from what exists (spec 2026-08-03 § 6). Absent
// ⇒ this type animates nothing of its own (a hosted embed, for instance).
export type EngineType = {
  id: string;
  deferred?: string;
  gestures?: GestureVocabulary;
};
```

Add the import: `import type { GestureVocabulary } from "./gestures";`

- [ ] **Step 4: Run and watch it pass**

Run: `cd lib && bun test core/registry-types.test.ts core/registry.test.ts`
Expected: PASS, and every pre-existing registry test still passes.

- [ ] **Step 5: Commit**

```bash
git add lib/core/registry.ts lib/core/registry-types.test.ts
git commit -m "feat(core): an engine type declares what it makes move"
```

---

### Task 4: The engines declare their vocabularies

**Files:**
- Modify: `skills/map-native/src/manifest.ts:18` (`types: MAP_TYPES.map((id) => ({ id }))`)
- Modify: `skills/chart-native/src/manifest.ts`
- Modify: `skills/image-native/src/manifest.ts`
- Modify: `skills/scrolly/src/manifest.ts`
- Leave unchanged, with a comment saying why: `skills/dw-chart/src/manifest.ts`, `skills/map-dw/src/manifest.ts`

**Interfaces:**
- Consumes: `EngineType.gestures` (Task 3), the `Gesture` and `NarrativeKind` unions (Task 2), and **Task 1's inventory as the source of every value declared**.

- [ ] **Step 1: Declare map-native from the inventory**

`map-native` currently maps every type to a bare `{ id }`. Replace with a per-type declaration. **Every entry must cite the inventory** — declare only what a component provably does today.

The shape (fill the values from Task 1, do not copy these as truth):

```ts
// What each map type makes move, per narrative kind — measured, not aspired to.
// See docs/splash/gesture-inventory-2026-08-03.md for the per-component evidence.
const MAP_GESTURES: Record<string, GestureVocabulary> = {
  choropleth: { story: ["fly", "hold"], scrolly: ["fly", "hold"], reveal: ["appear"] },
  // …one line per type in MAP_TYPES, each traceable to the inventory
};

types: MAP_TYPES.map((id) => ({ id, gestures: MAP_GESTURES[id] })),
```

**Where the inventory found that a family reads no storyboard at all** (the `*Reveal` case), declare the vocabulary the components *do* implement today and say so in a comment. Do **not** declare `reveal` gestures a component does not honour — that would re-create the promise this sub-project exists to close. If a family honours nothing, omit that narrative kind entirely; its absence is the honest signal, and sub-project ④ is what closes it.

- [ ] **Step 2: Declare chart-native from the inventory**

Same method. Charts declare **data gestures only** — no camera. If the inventory shows a chart family that supports a beat-driven sequence, declare its `story`/`scrolly` kinds accordingly; if a type only supports a single reveal, declare `reveal` alone.

- [ ] **Step 3: Declare image-native and scrolly**

`image-native` owns a crossfade vocabulary. `scrolly` orchestrates other engines' renderers rather than owning types of its own — if its manifest declares no `types`, add a comment saying the vocabulary lives with the hosted engine, and change nothing else.

- [ ] **Step 4: Leave the two hosted engines undeclared, on purpose**

`dw-chart` and `map-dw` delegate rendering to Datawrapper and own no motion. Add one comment line to each manifest recording that the absence is deliberate, citing this plan. **An unexplained absence and a deliberate one look identical six months later** — that is how the stale-claim defects on this project started.

- [ ] **Step 5: Typecheck every touched package**

Run: `cd lib && bunx tsc --noEmit -p .` then the same in each modified skill directory.
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add skills/*/src/manifest.ts
git commit -m "feat(engines): every engine declares what it can make move"
```

---

### Task 5: The drift guard, and the gate

**Files:**
- Create: `lib/core/gesture-declaration-drift.test.ts`

**Interfaces:**
- Consumes: `allProducers` from `lib/core/registry.ts`, `GESTURES` / `NARRATIVE_KINDS` from `lib/core/gestures.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { allProducers } from "./registry";
import { GESTURES, NARRATIVE_KINDS } from "./gestures";

test("no engine declares a gesture outside the closed vocabulary", () => {
  const known = new Set<string>(GESTURES);
  for (const p of allProducers()) {
    for (const t of p.types ?? []) {
      for (const [kind, list] of Object.entries(t.gestures ?? {})) {
        expect(NARRATIVE_KINDS as readonly string[]).toContain(kind);
        for (const g of list) {
          // A gesture no engine implements is the promise-nothing-honours defect this
          // sub-project exists to close — catch it at declaration time, not at produce.
          expect(known.has(g)).toBe(true);
        }
      }
    }
  }
});

test("a declared narrative kind is never empty", () => {
  // Declaring `reveal: []` says "this kind exists but does nothing" — ambiguous with both
  // "not supported" and "supported with no motion". Omit the kind instead.
  for (const p of allProducers()) {
    for (const t of p.types ?? []) {
      for (const [, list] of Object.entries(t.gestures ?? {})) {
        expect(list.length).toBeGreaterThan(0);
      }
    }
  }
});

test("every type that declares gestures is a type the engine actually declares", () => {
  // Guards the Record-keyed-by-id shape in the manifests: a typo'd key would silently
  // declare nothing for the real type and nobody would notice.
  for (const p of allProducers()) {
    const ids = new Set((p.types ?? []).map((t) => t.id));
    for (const t of p.types ?? []) expect(ids.has(t.id)).toBe(true);
  }
});
```

- [ ] **Step 2: Run it and watch it fail or pass, and say which**

Run: `cd lib && bun test core/gesture-declaration-drift.test.ts`

If it passes immediately, that is expected — Task 4 declared correctly. The proof that it is a **lever** is Step 3, not this run.

- [ ] **Step 3: Mutation-verify, three ways**

Temporarily, one at a time, restore after each and record both outputs:
1. Add `gestures: { story: ["zoom"] }` to a map type — `"zoom"` is not in the vocabulary. The first test must redden.
2. Add `gestures: { reveal: [] }` to a type. The second test must redden.
3. Add `gestures: { tour: ["fly"] }` — `"tour"` is not a narrative kind. The first test must redden on the kind assertion.

**If any mutation stays green, the guard is not a lever and must be fixed before this task closes.**

- [ ] **Step 4: Commit**

```bash
git add lib/core/gesture-declaration-drift.test.ts
git commit -m "test(core): a declared gesture must exist, and a declared kind must do something"
```

- [ ] **Step 5: The gate, on a calm machine**

Confirm nothing else is running (`pgrep -fl "bun test"` empty), then `bun run check` from the repo root. Paste the actual `<passed>/<total> checks passed.` line.

The known ambient failure is `lib/brain/eligibility.test.ts` ("a mark can never carry an empty reason", `readiness.ts:54`) — it fails in isolation too, in ~120 ms, and predates all of this. `lib/verify/capture-html.test.ts` is a Playwright contention flake that passes 20/20 in ~8 s alone. **Anything else is a finding** — report it with its output.

---

## After the plan

A **fresh whole-branch review** before merge, on the most capable model. On this project that step has found a Critical on every plan that ran it, including two that per-task reviews could not see because the defect lived *between* tasks — which is exactly how the storyboard gap this sub-project serves was created.

**Then sub-project ②** (the beat model and its lock) per the umbrella spec § 7. Do not start ④ before ①–③ land: it consumes all three.
