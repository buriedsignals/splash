# T1 lib/core Golden-Value Hardening (slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tautological (self-comparing) parity assertions in `lib/core/video-verify.test.ts` and `lib/core/theme.test.ts` with golden-value / analytic-oracle assertions that pin behaviour and provably catch a real mutation.

**Architecture:** The chart-native/map-native re-exports the parity tests compare against are pure re-exports of the lib/core functions themselves, so the comparisons cannot fail. Re-author each assertion against an independently-derived golden (analytic value for float primitives; a pinned table for the furniture hex maps; a pinned verdict object for `verifyVideo`), then prove the golden constrains behaviour by injecting a source mutation and confirming the test fails.

**Tech Stack:** Bun, TypeScript, bun:test.

## Global Constraints

- Runtime **Bun**. Tests `bun:test`. `cd /Users/rmdms/Sites/Professional/splash-merge` before running.
- **Test-only change.** Do NOT change any `lib/core` SOURCE behaviour. Source files are edited ONLY transiently to prove a mutation is caught, and MUST be reverted (`git checkout -- <file>`) before commit. Confirm `git status` shows only test files staged.
- Each hardened function MUST have its golden proven by a mutation: inject one representative source mutation → test FAILS → revert → test PASSES. Record the mutation + observed failure line in the report.
- Keep at most ONE minimal "still re-exported" structural assertion per module if desired; behaviour is pinned to goldens, not to a self-comparison.
- English only. Commit messages plain subject, **NO Claude/Anthropic/Co-Authored-By/Claude-Session/Generated-with trailer.**
- Golden hex/string tables use exact `toBe`/`toEqual`; analytic float oracles use `toBeCloseTo` with an explicit precision.

---

### Task 1: Harden `lib/core/video-verify.test.ts` to golden/analytic assertions

**Files:**
- Modify: `lib/core/video-verify.test.ts` (all 6 `it` blocks; remove the `cn*` re-export imports it compares against)
- Transient-only (revert before commit): `lib/core/video-verify.ts` (for mutation proof)

**Interfaces (already in `lib/core/video-verify.ts`, keep signatures):**
- `meanAbsDiff(a: RawFrame, b: RawFrame): number`
- `lumaVariance(frame: RawFrame): number`
- `diffRatio(a: RawFrame, b: RawFrame, tol: number): number`
- `verifyVideo(input): <verdict object>` — inspect the file for the exact input shape + verdict fields; pin the real returned object.
- Constants: `REVEAL_MIN_MEAN_DIFF`, `PROGRESSION_MIN_MEAN_DIFF`, `MIN_LUMA_VARIANCE`, `STILL_MATCH_CHANNEL_TOLERANCE`, `STILL_MATCH_MAX_DIFF_RATIO`, `DURATION_TOLERANCE_FRAMES`, `MIN_MP4_BYTES`.
- `RawFrame = { width: number; height: number; data: Uint8Array }` (RGB, 3 bytes/pixel).

- [ ] **Step 1: Read the source to learn exact behaviour**

Read `lib/core/video-verify.ts` fully. Note: the exact luma coefficients used by `lumaVariance`, the exact `verifyVideo` input shape and verdict fields, and each constant's literal value. The goldens must match the REAL implementation.

- [ ] **Step 2: Re-author the `it` blocks against golden/analytic oracles**

Remove the `import { ... as cn* } from "../../skills/chart-native/src/core/video-verify"` block. Replace each assertion:

- **`tuning knobs match`**: assert each constant `toBe` its literal number (read from source), e.g. `expect(REVEAL_MIN_MEAN_DIFF).toBe(<literal>)`. This pins the knob; a drift is a deliberate change that updates the golden.
- **`meanAbsDiff`**: keep the existing `solid`/`noisy` frame builders. For solids `a=solid(r1,g1,b1)`, `b=solid(r2,g2,b2)`, the mean absolute diff is analytic: `(|r1-r2|+|g1-g2|+|b1-b2|)/3`. Assert `expect(meanAbsDiff(a,b)).toBeCloseTo(<hand-computed>, 6)`. Include `meanAbsDiff(a,a)` → `0`.
- **`lumaVariance`**: a solid frame → `0` (assert exact `toBe(0)`). For a deterministic two-tone frame (half one solid colour, half another), compute the luma of each half with the source's coefficients and the variance analytically; assert `toBeCloseTo(<value>, 4)`.
- **`diffRatio`**: build two frames differing in a KNOWN number of pixels beyond `tol` (e.g. N of the W*H pixels differ by > tol), assert `expect(diffRatio(a,b,tol)).toBeCloseTo(N/(W*H), 6)`.
- **`verifyVideo` healthy / broken**: run `verifyVideo(input)` once, capture the exact verdict object, and pin it with `toEqual({...})`. Add a one-line comment noting each field's meaning so the golden is legible. (These are captured goldens — Step 4 mutation-proves they constrain behaviour.)

- [ ] **Step 3: Run the file, verify pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/video-verify.test.ts`
Expected: PASS (6 `it`, all now asserting real values).

- [ ] **Step 4: Mutation-verify each hardened function (prove the goldens bite)**

For EACH of `meanAbsDiff`, `lumaVariance`, `diffRatio`, `verifyVideo`: inject one mutation into `lib/core/video-verify.ts`, run the test, confirm the corresponding `it` FAILS, then `git checkout -- lib/core/video-verify.ts`. Suggested mutations:
- `meanAbsDiff`: drop the `Math.abs` (or change the channel divisor).
- `lumaVariance`: change a luma coefficient.
- `diffRatio`: flip the `>` to `>=` (or change the tol comparison).
- `verifyVideo`: flip one threshold comparison so the healthy input reports broken.
Record in the report, for each: the mutation, and the exact failing assertion line. After all four, confirm `git status` shows `lib/core/video-verify.ts` UNCHANGED (reverted) and only the test file modified.

- [ ] **Step 5: Commit**

```bash
git add lib/core/video-verify.test.ts
git commit -m "test(core): harden video-verify tests to golden/analytic oracles (de-tautologize)"
```

---

### Task 2: Harden `lib/core/theme.test.ts` parity tests to the golden furniture tables

**Files:**
- Modify: `lib/core/theme.test.ts` (the 2 parity `it`s at ~lines 9-20; remove the `cnFurniture`/`mnFrameColors` re-export imports)
- Transient-only (revert before commit): `lib/core/theme.ts` (for mutation proof)

**Interfaces (already in `lib/core/theme.ts`):**
- `deriveFurniture(bg?: string, houseHue?: string): ColorTokens`
- `resolveFrameColors(themeBg?: string, houseHue?: string): FrameColors`

- [ ] **Step 1: Replace the two tautological parity `it`s with golden tables**

Remove:
```ts
import { deriveFurniture as cnFurniture } from "../../skills/chart-native/src/core/tokens";
import { resolveFrameColors as mnFrameColors } from "../../skills/map-native/src/theme/map-tokens";
```
Replace the `deriveFurniture matches on every background` `it` with a golden table assertion:
```ts
it("deriveFurniture returns the pinned furniture for each background", () => {
  const golden: Record<string, ReturnType<typeof deriveFurniture>> = {
    "#ffffff": { line:"#0072B2", head:"#FFFFFF", headGlow:"#0072B2", ink:"#1A1A1A", muted:"#6B6B6B", grid:"#E6E6E6", axis:"#CFCFCF", bg:"#FFFFFF" },
    "#0b1220": { line:"#56B4E9", head:"#FFFFFF", headGlow:"#56B4E9", ink:"#F4F4F5", muted:"#aeb0b5", axis:"#4c515c", grid:"#2c323e", bg:"#0B1220" },
    "#f4c9d7": { line:"#0072B2", head:"#FFFFFF", headGlow:"#0072B2", ink:"#1A1A1A", muted:"#5b4f53", axis:"#b798a2", grid:"#d5b1bd", bg:"#F4C9D7" },
    "#36454f": { line:"#56B4E9", head:"#FFFFFF", headGlow:"#56B4E9", ink:"#F4F4F5", muted:"#bbc0c3", axis:"#6b767d", grid:"#515e66", bg:"#36454F" },
    "#71717a": { line:"#0072B2", head:"#FFFFFF", headGlow:"#0072B2", ink:"#FFFFFF", muted:"#d4d4d7", axis:"#99999f", grid:"#85858d", bg:"#71717A" },
    "#009e73": { line:"#0072B2", head:"#FFFFFF", headGlow:"#0072B2", ink:"#1A1A1A", muted:"#124235", axis:"#07795a", grid:"#048c67", bg:"#009E73" },
  };
  for (const [bg, expected] of Object.entries(golden))
    expect(deriveFurniture(bg)).toEqual(expected);
});
```
Replace the `resolveFrameColors matches on every background` `it` similarly:
```ts
it("resolveFrameColors returns the pinned frame furniture for each background", () => {
  const golden: Record<string, ReturnType<typeof resolveFrameColors>> = {
    "#ffffff": { pill:"rgba(255,255,255,0.92)", ink:"#1a1a1a", muted:"#5f5f5f" },
    "#0b1220": { pill:"rgba(11,18,32,0.82)", ink:"#f4f4f5", muted:"#c1c2c6" },
    "#f4c9d7": { pill:"rgba(244,201,215,0.82)", ink:"#1a1a1a", muted:"#4a4144" },
    "#36454f": { pill:"rgba(54,69,79,0.82)", ink:"#f4f4f5", muted:"#caced0" },
    "#71717a": { pill:"rgba(113,113,122,0.82)", ink:"#ffffff", muted:"#e0e0e2" },
    "#009e73": { pill:"rgba(0,158,115,0.82)", ink:"#1a1a1a", muted:"#14372e" },
  };
  for (const [bg, expected] of Object.entries(golden))
    expect(resolveFrameColors(bg)).toEqual(expected);
});
```
Keep the two `describe` wrappers' intent but rename them to reflect they now pin golden values, not cross-module parity. If `BGS` becomes unused after this, remove it (avoid an unused-var lint).

- [ ] **Step 2: Run the file, verify pass**

Run: `cd /Users/rmdms/Sites/Professional/splash-merge && bun test lib/core/theme.test.ts`
Expected: PASS (the golden tables match the current implementation exactly — they were computed from it).

- [ ] **Step 3: Mutation-verify both functions**

Inject a mutation into `lib/core/theme.ts`, run the test, confirm the corresponding golden `it` FAILS, revert:
- `deriveFurniture`: change the muted mix ratio (e.g. `0.30` → `0.35`) → the `deriveFurniture` golden table must fail.
- `resolveFrameColors`: change the pill opacity (e.g. `0.82` → `0.80`) or the muted mix → the `resolveFrameColors` golden must fail.
Record both mutations + the failing assertion in the report. Then `git checkout -- lib/core/theme.ts` and confirm `git status` shows `lib/core/theme.ts` UNCHANGED and only the test file modified.

- [ ] **Step 4: Commit**

```bash
git add lib/core/theme.test.ts
git commit -m "test(core): pin theme furniture parity tests to golden tables (de-tautologize)"
```

---

## Notes for the executor

- After both tasks: run the full gate `cd /Users/rmdms/Sites/Professional/splash-merge && bun run check` (22 checks) — the parity tests moved from tautological to golden; nothing else changed, so the gate stays green.
- Final whole-branch review on a capable model, then merge to main + push `git push origin main:rd-dev`, per the session convention.
- CRITICAL closing check: `git diff main -- lib/core/video-verify.ts lib/core/theme.ts` MUST be empty (source unchanged — this was a test-only slice).
