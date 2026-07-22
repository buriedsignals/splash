# S2 — Claim-arc narrative (argument-driven beats) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make a scrolly/story's beat sequence prove an ARGUMENT (`establish → build+ → [turn] → payoff`, journalist-confirmed) instead of dumping data-salient points — killing the "data-dump" the render flagged, on the beat model + validation + a flagged fallback + a story-warrant signal, both engines.

**Architecture:** Same seam as S1 — the editorial judgment (which point is the *turn*, does a beat advance the argument) stays model-driven and vetoable at the FRONT (Gate 1b prose); the CODE enforces STRUCTURE: an arc role model on each beat, fail-loud validation that the arc is well-formed, a mechanical flag when the narrative was auto-picked by salience (un-confirmed), and a pure story-warrant analyzer the suggester consults to propose static-vs-scrolly. Grounded taxonomy = Cohn's Establisher/Initial/Peak/Release (E/I/P/R), adapted to data-video by Amini (CHI '15).

**Tech Stack:** Bun, TypeScript, `bun:test`.

## Global Constraints
- Runtime **Bun** only. Tests `bun:test`. **TDD**: failing test before impl.
- Code/comments/commits: **English**. NO Claude/Anthropic mention; no `Co-Authored-By`. **No new `any`**.
- **Gate green each task**: `bun run check` passes before every commit. Typecheck via `cd skills/<skill> && bunx tsc --noEmit` (NEVER `-p` from repo root — stale global tsc).
- **Behaviour-preserving**: a spec with the current `spec.beats` (anchor-only, no `role`) and a spec with NO beats both render **byte-identically** to today. Only NEW claim-arc roles add validation; only the absence-of-beats case adds a (non-blocking) warning.
- **Story-warrant is a DESIGN HEURISTIC, not credited literature** (grounding found no citable source): every guard comment + doc string that mentions it MUST say so. Only E/I/P/R (Cohn/Amini) and the Segel&Heer/McKenna/Kosara *adjacent* appuis are credited — see the spec §8.
- **Story-warrant never hard-refuses production** — it is a PROPOSITION signal; the journalist can veto to a scrolly.
- Work on a dedicated branch off `main` (created in Task 0).

---

### Task 0: Branch + read the narrative chain

**Files:** none (setup + read).

- [ ] **Step 1: Create the branch off main**
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && git checkout -b feat/claim-arc-narrative
```
- [ ] **Step 2: Read (the implementer MUST read these before Task 1):**
  - `skills/chart-native/src/spec-to-config.ts` — `NarrativeBeat` (`{x?, xEnd?, category?, text?}`, ~line 23) and `NativeSpec.beats` (~line 100). This is where `role` is added.
  - `skills/chart-native/src/chart-story.ts` — `ChartBeat` (line 18), `narrativeBeatErrors` (line 115, anchor validation, returns `string[]`, early-returns for non-line/bar), `deriveChartStory` (line 266, the explicit-beats reveal loop that builds captions), `listValidAnchors` (line 103).
  - `skills/splash/src/validate-gate.ts:96-128` — how `narrativeBeatErrors` is surfaced at the spine gate (line 105), and the map track REJECTING `spec.beats` (line 124).
  - `skills/splash/src/producer-spec.ts:82-120` — `ProposalResult.warnings?: string[]` ("surfaced at the render gate") = the flagged-fallback channel; `ProduceReport.warnings` (batch-level, line 119).
  - `skills/map-native/src/map-story.ts` — `Beat` (line 9, has `pattern`/`rank`/`rankRole`, NO arc `role`, NO journalist override), `deriveMapStory` (line 83). Confirms map-native lacks the override seam (Task 4 adds it).

---

### Task 1: chart-native — the claim-arc role model (field + fail-loud arc validation + role-driven caption)

**Files:**
- Modify: `skills/chart-native/src/spec-to-config.ts` (add `role` to `NarrativeBeat`)
- Modify: `skills/chart-native/src/chart-story.ts` (arc validation in `narrativeBeatErrors`; `role` on `ChartBeat`; claim caption in `deriveChartStory`)
- Test: `skills/chart-native/src/claim-arc.test.ts` (new)

**Interfaces:**
- Produces: `NarrativeBeat.role?: "establish" | "build" | "turn" | "payoff"`. When ANY beat carries a role, ALL must, and the set must form a valid arc (see `arcErrors`). Legacy anchor-only beats (no role) stay valid + byte-identical.
- Produces: `ChartBeat.role?: ArcRole` (threaded through `deriveChartStory` so a reveal's caption asserts the confirmed claim, not the auto `name — value`).

- [ ] **Step 1: Write the failing tests** — `skills/chart-native/src/claim-arc.test.ts`:
```ts
import { describe, it, expect } from "bun:test";
import { narrativeBeatErrors } from "./chart-story";
import type { NativeSpec } from "./spec-to-config";

// A minimal line spec whose x column carries the anchors the beats use.
const lineSpec = (beats: unknown): NativeSpec =>
  ({
    nativeType: "line",
    title: "T",
    source: { name: "S" },
    unit: "%",
    data: "year,v\n2000,1\n2001,5\n2002,9\n2003,4\n",
    beats,
  }) as unknown as NativeSpec;

describe("claim-arc validation (narrativeBeatErrors)", () => {
  it("accepts a well-formed arc establish→build→turn→payoff", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "In 2000 it starts low." },
        { x: 2001, role: "build", text: "It climbs." },
        { x: 2002, role: "turn", text: "Then it peaks — the turn." },
        { x: 2003, role: "payoff", text: "And settles higher than it began." },
      ]),
    );
    expect(errs).toEqual([]);
  });

  it("rejects an arc that does not open on establish", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "build", text: "climbs" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /open.*establish/i.test(e))).toBe(true);
  });

  it("rejects an arc that does not close on payoff", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "climbs" },
      ]),
    );
    expect(errs.some((e) => /close.*payoff/i.test(e))).toBe(true);
  });

  it("rejects an arc with no build (no rising action)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /build/i.test(e))).toBe(true);
  });

  it("rejects more than one turn (a single Peak carries the story)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "turn", text: "peak 1" },
        { x: 2002, role: "turn", text: "peak 2" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /turn|peak/i.test(e))).toBe(true);
  });

  it("rejects a half-arc (some beats have a role, some don't)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, text: "no role here" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /all.*role|half-arc/i.test(e))).toBe(true);
  });

  it("rejects a role beat with an empty claim (text)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "   " },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /claim|text/i.test(e))).toBe(true);
  });

  it("stays byte-identical for legacy anchor-only beats (no role) — no arc errors", () => {
    const errs = narrativeBeatErrors(
      lineSpec([{ x: 2000 }, { x: 2003 }]),
    );
    expect(errs).toEqual([]);
  });

  it("still fails loud on a non-existent anchor (existing behaviour intact)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 1999, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "climbs" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /not found/i.test(e))).toBe(true);
  });
});
```
Run → FAIL (role field + arc validation absent).

- [ ] **Step 2: Add `role` to `NarrativeBeat`** in `skills/chart-native/src/spec-to-config.ts`:
```ts
export interface NarrativeBeat {
  x?: string | number;
  xEnd?: string | number;
  category?: string;
  text?: string;
  /**
   * CLAIM-ARC role (S2). When present, this beat asserts a narrative stage of the
   * argument, not just a data point. The confirmed plan forms an arc:
   * establish → build+ → [turn] → payoff — Cohn's Establisher/Initial/Peak/Release
   * (Cohn 2013, "Visual Narrative Structure"; adapted to data video by Amini et al.,
   * CHI '15, dominant pattern E+I+PR+). `text` carries the beat's CLAIM (the "so what").
   * Optional for backward compatibility: anchor-only beats (no role) keep the legacy
   * auto-caption path, byte-identical. When ANY beat has a role, ALL must, and the arc
   * must be well-formed (see narrativeBeatErrors → arcErrors).
   */
  role?: "establish" | "build" | "turn" | "payoff";
}
```

- [ ] **Step 3: Add `arcErrors` + call it from `narrativeBeatErrors`** in `skills/chart-native/src/chart-story.ts`. Add near the top (after imports):
```ts
export const ARC_ROLES = ["establish", "build", "turn", "payoff"] as const;
export type ArcRole = (typeof ARC_ROLES)[number];

// Validate the CLAIM-ARC structure of a beat plan (S2). Roles are OPTIONAL for
// backward compat; but the moment any beat claims a role, the whole plan must form a
// well-formed arc — establish opens, payoff closes, ≥1 build (rising action), ≤1 turn
// (a single Peak — Cohn's E/I/P/R, Amini CHI '15's dominant E+I+PR+), and every role
// beat asserts a non-empty claim (`text`). Pure, throw-free (mirrors narrativeBeatErrors).
export function arcErrors(beats: NarrativeBeat[]): string[] {
  const roled = beats.filter((b) => b.role !== undefined);
  if (roled.length === 0) return []; // legacy anchor-only beats — no arc claimed
  const errs: string[] = [];
  if (roled.length !== beats.length)
    errs.push(
      "claim-arc: every beat must carry a `role` (establish/build/turn/payoff) or NONE — no half-arc",
    );
  beats.forEach((b, i) => {
    if (b.role !== undefined && !ARC_ROLES.includes(b.role))
      errs.push(
        `beat ${i + 1}: role "${b.role}" is not one of ${ARC_ROLES.join("/")}`,
      );
    if (
      b.role !== undefined &&
      (b.text === undefined || b.text.trim() === "")
    )
      errs.push(
        `beat ${i + 1} (${b.role}): a claim-arc beat must assert a claim (non-empty \`text\`)`,
      );
  });
  const roles = beats.map((b) => b.role);
  const count = (r: ArcRole) => roles.filter((x) => x === r).length;
  if (roles[0] !== "establish")
    errs.push("claim-arc must OPEN on an `establish` beat (set the scene)");
  if (roles[roles.length - 1] !== "payoff")
    errs.push("claim-arc must CLOSE on a `payoff` beat (land the argument)");
  if (count("build") < 1)
    errs.push(
      "claim-arc needs at least one `build` beat between establish and payoff (the rising action)",
    );
  if (count("establish") > 1)
    errs.push("claim-arc: the scene is set once — more than one `establish` beat");
  if (count("payoff") > 1)
    errs.push("claim-arc: the argument lands once — more than one `payoff` beat");
  if (count("turn") > 1)
    errs.push(
      "claim-arc: a single Peak carries the story — more than one `turn` beat (Cohn E/I/P/R)",
    );
  return errs;
}
```
Then in `narrativeBeatErrors`, after the anchor-validation blocks compute their `errors`, append the arc errors. The cleanest place: at BOTH `return errors;` sites (line and bar branches), change to `return [...errors, ...arcErrors(beats)];`. (The early non-line/bar and empty/absent returns stay as-is — arc validation only applies to a real line/bar beat plan.)

- [ ] **Step 4: Thread `role` onto `ChartBeat` + prefer the claim as caption** in `chart-story.ts`. Add to the `ChartBeat` interface: `role?: ArcRole;`. In `deriveChartStory`'s explicit-beats reveal loops (line + bar), when the source `NarrativeBeat` has a `role`, set `role` on the emitted reveal `ChartBeat`, and use its `text` as the caption `copy` verbatim (the claim) instead of the auto `name — value` string. (The auto path — no role — is unchanged, byte-identical.)

- [ ] **Step 5: Run tests → PASS.** `cd skills/chart-native && bun test src/claim-arc.test.ts`
- [ ] **Step 6: Gate + commit.** `cd skills/chart-native && bunx tsc --noEmit`; `git commit -am "feat(chart-native): claim-arc role model + fail-loud arc validation + role-driven caption"`

---

### Task 2: the flagged salience fallback (an un-confirmed narrative can't ship silent)

**Files:**
- Modify: `skills/chart-native/src/chart-story.ts` (add `narrativeFallbackWarning`)
- Modify: `skills/splash/src/validate-gate.ts` (surface the warning through the existing beat-warning path)
- Test: `skills/chart-native/src/claim-arc.test.ts` (extend) + `skills/splash/src/validate-gate.test.ts` (or the nearest existing validate-gate test — the implementer greps for it)

**Interfaces:**
- Produces: `narrativeFallbackWarning(spec: NativeSpec): string | null` — returns a non-blocking warning string when a scrolly/story-eligible spec (line/bar) has NO explicit `spec.beats` (the narrative will be auto-picked by salience, not a confirmed argument); `null` when beats are present (confirmed) or the type is not a scrolly-narrative type. Surfaced via the SAME advisory channel `narrativeBeatWarnings` already uses (→ `ProposalResult.warnings`, shown at Gate 3a).

- [ ] **Step 1: Write the failing test** (append to `claim-arc.test.ts`):
```ts
import { narrativeFallbackWarning } from "./chart-story";

describe("flagged salience fallback (narrativeFallbackWarning)", () => {
  const spec = (beats?: unknown) =>
    ({
      nativeType: "line",
      title: "T",
      source: { name: "S" },
      unit: "%",
      data: "year,v\n2000,1\n2001,9\n",
      ...(beats ? { beats } : {}),
    }) as unknown as NativeSpec;

  it("warns when a line scrolly has no confirmed beats (salience fallback)", () => {
    const w = narrativeFallbackWarning(spec());
    expect(w).not.toBeNull();
    expect(w).toMatch(/auto-picked|salience|not.*confirmed|argument/i);
  });

  it("does not warn when beats are confirmed", () => {
    expect(
      narrativeFallbackWarning(
        spec([
          { x: 2000, role: "establish", text: "low" },
          { x: 2001, role: "build", text: "up" },
          { x: 2001, role: "payoff", text: "lands" },
        ]),
      ),
    ).toBeNull();
  });
});
```
Run → FAIL (fn absent).

- [ ] **Step 2: Implement `narrativeFallbackWarning`** in `chart-story.ts`:
```ts
// S2 flagged fallback: when a scrolly-narrative chart (line/bar) ships with NO confirmed
// `spec.beats`, its beats are auto-picked by DATA SALIENCE (lineNotableIndices /
// barRankedReveals) — a reasonable default, but NOT a journalist-confirmed argument. This
// surfaces that at the render gate so an un-authored narrative is never mistaken for a
// confirmed claim-arc. Non-blocking (the fallback still ships) — it is made VISIBLE, not
// blocked. Returns null when beats are confirmed or the type carries no scrolly narrative.
export function narrativeFallbackWarning(spec: NativeSpec): string | null {
  if (spec.beats !== undefined) return null;
  let type: string;
  try {
    type = specToNativeConfig(spec).type;
  } catch {
    return null;
  }
  if (type !== "line" && type !== "bar") return null;
  return (
    "narrative auto-picked by data salience (no confirmed claim-arc `beats`) — the scrolly " +
    "walks the most salient points, not a confirmed argument. If this ships as a story, " +
    "confirm a claim-arc at CADRAGE (establish → build → [turn] → payoff)."
  );
}
```

- [ ] **Step 3: Surface it in `validate-gate.ts`** alongside the existing `narrativeBeatWarnings` call (~line 115). Import `narrativeFallbackWarning`; where warnings are collected for the chart track, push its non-null result into the same `warnings` array that already flows to `ProposalResult.warnings`. (Read the exact warning-collection shape at that site — do not invent a new channel; reuse the one `narrativeBeatWarnings` feeds.)

- [ ] **Step 4: Write the validate-gate test** — a chart-track spec with no `beats` yields a warning containing `/auto-picked|salience/i`; the same spec WITH confirmed beats yields none. (Grep the existing validate-gate test file for the warning-assertion pattern and mirror it.)
- [ ] **Step 5: Run → PASS.** `cd skills/chart-native && bun test src/claim-arc.test.ts`; `cd skills/splash && bun test src/validate-gate.test.ts`
- [ ] **Step 6: Gate + commit.** typecheck both skills; `git commit -am "feat(splash): flag the salience fallback — an un-confirmed narrative surfaces at review, never ships silent"`

---

### Task 3: the story-warrant analyzer (pure) + the proposition signal

**Files:**
- Create: `skills/splash/src/story-warrant.ts`
- Test: `skills/splash/src/story-warrant.test.ts`
- Modify: `skills/splash/SKILL.md` (suggest-chart guidance to CONSULT it) — light, see Task 5 for the Gate-1b prose; here only the one-line "consult the warrant" hook.

**Interfaces:**
- Produces: `assessStoryArc(input: { type: "line" | "bar" | "scatter"; values: number[]; ys?: number[] }): { hasArc: boolean; reason: string }` — a PURE, heuristic (design-heuristic, NOT credited literature) judgement of whether the data carries a narrative arc. `line`/temporal: a directional trend or a clear single turn; `bar`/magnitude: real spread/skew (a detached leader / a tail), not a flat ranking; `scatter`: correlation strength above a tunable threshold. Consumed by the suggester to PROPOSE static-annotated vs scrolly/video (journalist-vetoable). Never throws; unknown/degenerate input (n<3) → `{hasArc:false, reason}`.

- [ ] **Step 1: Write the failing tests** — `skills/splash/src/story-warrant.test.ts`:
```ts
import { describe, it, expect } from "bun:test";
import { assessStoryArc } from "./story-warrant";

describe("assessStoryArc (design heuristic — not credited literature)", () => {
  it("line with a clear directional trend HAS an arc", () => {
    expect(
      assessStoryArc({ type: "line", values: [1, 2, 4, 7, 11, 16] }).hasArc,
    ).toBe(true);
  });
  it("line that is flat noise has NO arc", () => {
    expect(
      assessStoryArc({ type: "line", values: [5, 5.1, 4.9, 5, 5.05, 4.95] })
        .hasArc,
    ).toBe(false);
  });
  it("line with a clear single turn (up then down) HAS an arc", () => {
    expect(
      assessStoryArc({ type: "line", values: [1, 4, 9, 4, 1] }).hasArc,
    ).toBe(true);
  });
  it("bar with a detached leader / tail (real spread) HAS an arc", () => {
    expect(
      assessStoryArc({ type: "bar", values: [100, 20, 12, 8, 3] }).hasArc,
    ).toBe(true);
  });
  it("bar that is a flat ranking has NO arc", () => {
    expect(
      assessStoryArc({ type: "bar", values: [50, 49, 48, 47, 46] }).hasArc,
    ).toBe(false);
  });
  it("scatter with strong correlation HAS an arc", () => {
    expect(
      assessStoryArc({
        type: "scatter",
        values: [1, 2, 3, 4, 5, 6],
        ys: [2, 4, 6, 8, 10, 12],
      }).hasArc,
    ).toBe(true);
  });
  it("uncorrelated scatter has NO arc", () => {
    expect(
      assessStoryArc({
        type: "scatter",
        values: [1, 2, 3, 4, 5, 6],
        ys: [5, 1, 6, 2, 4, 3],
      }).hasArc,
    ).toBe(false);
  });
  it("degenerate (n<3) has no arc, no throw", () => {
    expect(assessStoryArc({ type: "line", values: [1, 2] }).hasArc).toBe(false);
  });
  it("every result carries a human reason", () => {
    expect(
      assessStoryArc({ type: "bar", values: [50, 49, 48] }).reason.length,
    ).toBeGreaterThan(0);
  });
});
```
Run → FAIL (module absent).

- [ ] **Step 2: Implement `story-warrant.ts`** (pure, tunable thresholds as named consts, header states DESIGN HEURISTIC):
```ts
// story-warrant.ts — a PURE, DESIGN-HEURISTIC judgement of whether a dataset carries a
// narrative arc worth a scrolly/video, or is better served by a static annotated chart.
//
// ★ NOT credited literature. Grounding (2026-07-21) found NO citable source stating
// "these data shapes don't warrant a narrative arc". This is Splash's own heuristic,
// reasonably informed by (but NOT claiming as its rule): Segel & Heer (2010) author↔reader
// axis, McKenna et al. (2017) "role of visualization" flow-factor, Kosara & Mackinlay
// (2013) presentation-vs-analysis. It NEVER hard-refuses production — it is a PROPOSITION
// signal the suggester uses to propose static-vs-scrolly; the journalist can veto to a scrolly.
//
// Thresholds are tuning knobs (each = one number), calibrated on the test fixtures.

const LINE_FLAT_MAX_CV = 0.05; // line: coefficient of variation below this ⇒ essentially
// constant/noise, NO arc — checked FIRST so a tiny data range can't make noise look like a
// big *relative* swing (the turn test below is range-relative and would false-fire otherwise).
const TREND_MIN_MONOTONE_FRACTION = 0.7; // line: ≥70% of steps share the net direction ⇒ trend
const TURN_MIN_RELATIVE_SWING = 0.4; // line: a peak/valley whose swing ≥40% of the range ⇒ turn
const SPREAD_MIN_LEADER_RATIO = 1.5; // bar: leader ≥1.5× the 2nd ⇒ detached leader (spread)
const SPREAD_MIN_CV = 0.25; // bar: coefficient of variation ≥0.25 ⇒ real spread
const SCATTER_MIN_ABS_R = 0.5; // scatter: |Pearson r| ≥0.5 ⇒ a correlation story

export interface StoryArcInput {
  type: "line" | "bar" | "scatter";
  values: number[]; // line/bar: the series; scatter: the x values
  ys?: number[]; // scatter only: the y values
}
export interface StoryArcVerdict {
  hasArc: boolean;
  reason: string;
}

function lineArc(v: number[]): StoryArcVerdict {
  if (v.length < 3) return { hasArc: false, reason: "too few points for an arc" };
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  const cv = mean === 0 ? (sd === 0 ? 0 : Infinity) : sd / Math.abs(mean);
  if (cv < LINE_FLAT_MAX_CV)
    return {
      hasArc: false,
      reason: "essentially flat/constant — no arc; a static value or annotated chart reads better",
    };
  const steps = v.slice(1).map((y, i) => y - v[i]);
  const ups = steps.filter((s) => s > 0).length;
  const downs = steps.filter((s) => s < 0).length;
  const monotoneFrac = Math.max(ups, downs) / steps.length;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const range = max - min || 1;
  // a turn = an interior extreme whose swing to both neighbours is a real fraction of range
  let hasTurn = false;
  for (let i = 1; i < v.length - 1; i++) {
    const swing =
      Math.min(Math.abs(v[i] - v[i - 1]), Math.abs(v[i] - v[i + 1])) / range;
    const isExtreme =
      (v[i] > v[i - 1] && v[i] > v[i + 1]) ||
      (v[i] < v[i - 1] && v[i] < v[i + 1]);
    if (isExtreme && swing >= TURN_MIN_RELATIVE_SWING) hasTurn = true;
  }
  if (monotoneFrac >= TREND_MIN_MONOTONE_FRACTION)
    return { hasArc: true, reason: "a directional trend carries the story" };
  if (hasTurn)
    return { hasArc: true, reason: "a clear turn (peak/valley) carries the story" };
  return {
    hasArc: false,
    reason: "flat/noisy — no trend or clear turn; a static annotated chart reads better",
  };
}

function barArc(v: number[]): StoryArcVerdict {
  if (v.length < 3) return { hasArc: false, reason: "too few bars for an arc" };
  const desc = [...v].sort((a, b) => b - a);
  const leaderRatio = desc[1] === 0 ? Infinity : desc[0] / desc[1];
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const sd = Math.sqrt(
    v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length,
  );
  const cv = mean === 0 ? 0 : sd / Math.abs(mean);
  if (leaderRatio >= SPREAD_MIN_LEADER_RATIO || cv >= SPREAD_MIN_CV)
    return { hasArc: true, reason: "real spread (a detached leader / long tail) carries the story" };
  return {
    hasArc: false,
    reason: "a near-flat ranking — no dominant leader or tail; a static ranked chart reads better",
  };
}

function scatterArc(xs: number[], ys: number[]): StoryArcVerdict {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { hasArc: false, reason: "too few points for a correlation story" };
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(sxx * syy);
  const r = denom === 0 ? 0 : sxy / denom;
  if (Math.abs(r) >= SCATTER_MIN_ABS_R)
    return { hasArc: true, reason: `a correlation (r=${r.toFixed(2)}) carries the story` };
  return {
    hasArc: false,
    reason: `no correlation (r=${r.toFixed(2)}) — a static annotated scatter reads better`,
  };
}

export function assessStoryArc(input: StoryArcInput): StoryArcVerdict {
  if (input.type === "line") return lineArc(input.values);
  if (input.type === "bar") return barArc(input.values);
  return scatterArc(input.values, input.ys ?? []);
}
```

- [ ] **Step 3: Run → PASS.** `cd skills/splash && bun test src/story-warrant.test.ts` (calibrate the 5 threshold consts if a fixture misses — they are tuning knobs).
- [ ] **Step 4: One-line consult hook** in `skills/splash/SKILL.md` PROPOSITION section: when the story shape suggests a scrolly/video, CONSULT `assessStoryArc` (mechanical) — if `hasArc:false`, PROPOSE the static annotated chart instead and say why (`reason`); the journalist may veto to the scrolly. (Full Gate-1b prose is Task 5; here only the consult reference so the analyzer is wired into guidance.)
- [ ] **Step 5: Gate + commit.** `cd skills/splash && bunx tsc --noEmit`; `git commit -am "feat(splash): story-warrant analyzer (design heuristic) — propose static when the data carries no arc, journalist-vetoable"`

---

### Task 4: map-native parity — add the override seam + role + validation + flag

**Files:**
- Modify: `skills/map-native/src/map-story.ts` (add `role` to `Beat`; a `storyBeats` override + validation; `deriveMapStory` honours a confirmed arc)
- Modify: `skills/map-native/src/` map spec type (the map equivalent of `NativeSpec` — the implementer greps for the map spec interface that `deriveMapStory`'s `MapStoryMeta`/config comes from) to carry `storyBeats?`
- Modify: `skills/splash/src/validate-gate.ts:121-128` — the map track currently REJECTS `beats`; it must now ACCEPT a map claim-arc override (under the map field name) and validate it
- Test: `skills/map-native/src/claim-arc-map.test.ts` (new)

**Interfaces:**
- Produces: a map-spec `storyBeats?: MapNarrativeBeat[]` where `MapNarrativeBeat = { region: string; role?: ArcRole; text?: string }` (region = the join-key value the beat anchors on — the map analogue of a line `x`). Same arc rules as chart-native (`arcErrors`, reused/mirrored). Absent ⇒ `deriveMapStory` auto-picks (byte-identical) AND `narrativeFallbackWarning`-equivalent fires.
- Consumes: `arcErrors` (import from chart-native if a clean shared import exists per the import-guard rules; otherwise mirror it with a shared test asserting parity — decide by whether `chart-native/src/chart-story` is an allowed import from map-native; per `import-guard.test.ts` engines may NOT import each other's `src/`, so **mirror `arcErrors` into a shared `lib/core` helper both import**, OR duplicate with a parity test — the implementer picks the clean one and states it in the report).

- [ ] **Step 1: Decide the arc-validation sharing.** `arcErrors` is engine-agnostic (operates on `{role?, text?}[]`). Per `import-guard.test.ts` (engines can't import each other's `src/`), extract `arcErrors` + `ARC_ROLES`/`ArcRole` to `lib/core/claim-arc.ts` and have BOTH `chart-native/src/chart-story.ts` and `map-native/src/map-story.ts` import from `lib/core` (the sanctioned shared barrel). Re-export from `chart-story.ts` so Task 1's tests keep importing it. Run chart-native tests → still green.
- [ ] **Step 2: Write the failing map tests** — mirror Task 1's arc cases against a map `storyBeats` plan (region anchors from a small fixture FeatureCollection + joined data), plus: absent `storyBeats` → auto-pick unchanged (assert a known beat count/shape) + a fallback warning fires; a confirmed arc → its role captions render. Run → FAIL.
- [ ] **Step 3: Add `role` to map `Beat`**, add `storyBeats` to the map spec type, and a `mapArcErrors`/validation entry that runs `arcErrors` on the region-anchored plan (region exists in the join, arc well-formed). In `deriveMapStory`, when `storyBeats` present + valid, emit the reveals in the confirmed order carrying `role` + the claim `text`; absent ⇒ the existing salience derivation, byte-identical.
- [ ] **Step 4: Un-reject the map track in `validate-gate.ts:121-128`** — replace the "beats not supported on the map track" rejection with validation of the map `storyBeats` override (call the map validation), and surface the map fallback warning. Keep rejecting the CHART `beats` field on the map track (that field IS chart-only — the map uses `storyBeats`), so a mis-placed chart `beats` on a map still fails loud.
- [ ] **Step 5: Run → PASS.** `cd skills/map-native && bun test src/claim-arc-map.test.ts`; re-run `cd skills/chart-native && bun test` (parity intact); `cd skills/splash && bun test src/validate-gate.test.ts`
- [ ] **Step 6: Gate + commit.** typecheck chart-native, map-native, splash; `git commit -am "feat(map-native): claim-arc parity — storyBeats override + role model + validation + flagged fallback"`

---

### Task 5: FRONT prose — widen Gate 1b to the claim-arc

**Files:**
- Modify: `skills/splash/SKILL.md` (Gate 1b / CADRAGE + PROPOSITION sections)

**No new mechanical gate** — the mechanical levers are Tasks 1-4. This task makes the flow USE them.

- [ ] **Step 1: Widen Gate 1b** from confirming "the takeaway" to confirming "the claim-arc that proves it": the orchestrator, from the `confirmedTakeaway` + the data, PROPOSES a beat plan (`establish → build+ → [turn] → payoff`), each beat = role + the claim it asserts + its data anchor; `suggest-chart` emits candidate anchors per role as a scaffold; the journalist confirms / tweaks / vetoes; the confirmed arc is pinned as `spec.beats` (chart) / `storyBeats` (map) with roles + claims. State plainly that WHICH point is the turn / whether a beat advances the argument is the JOURNALIST's call (non-mechanizable), and the code only enforces the arc's shape.
- [ ] **Step 2: PROPOSITION** — reference the story-warrant consult (Task 3 hook): a scrolly/video is proposed only when `assessStoryArc` says the data carries an arc; otherwise propose the static annotated chart with its `reason`, journalist-vetoable. Note the fallback flag: an un-confirmed (auto-picked) narrative is surfaced at Gate 3a — confirm a claim-arc to make it an argument.
- [ ] **Step 3: Credits** — add the S2 credits (spec §8) wherever the SKILL.md / references cite sources: E/I/P/R = Cohn (2013) / Amini (CHI '15); story-warrant = design heuristic (say so), informed-not-credited by Segel&Heer / McKenna / Kosara.
- [ ] **Step 4: Verify frontmatter** (`head -4 skills/splash/SKILL.md` → `---`) + no other gate rule weakened. Commit: `git commit -am "docs(splash): widen Gate 1b to the claim-arc + wire the story-warrant consult into PROPOSITION"`

---

## Self-Review
- **Spec coverage:** §3.1 front claim-arc → Task 5 (+ scaffolding referenced). §3.2 beat model + validation → Task 1 (chart) + Task 4 (map). §3.3 story-warrant → Task 3. §3.4 flagged fallback → Task 2 (chart) + Task 4 (map). §3.5 both engines → Task 1 (chart) then Task 4 (map). Grounding/credits (§8) → Task 5 Step 3 + inline comments in Tasks 1/3.
- **Placeholder scan:** the two spec "tunables" (arc length bound, correlation threshold) are concrete here — arc length is bounded by the structural rules (≤1 establish/turn/payoff, ≥1 build, no hard N cap per Cohn E+I+PR+); the warrant thresholds are 5 named consts in Task 3. The "grep the exact site" instructions (Task 2 Step 3, Task 4 Step 1/3) are read-anchors for wiring into an existing file whose exact shape the implementer confirms — legitimate, targets named.
- **Type consistency:** `ArcRole`/`ARC_ROLES` defined in Task 1, extracted to `lib/core/claim-arc.ts` in Task 4 Step 1 and re-exported (chart-native tests unaffected); `arcErrors` consumed by chart (Task 1) + map (Task 4) under the same name; `narrativeFallbackWarning` (chart, Task 2) has a map equivalent (Task 4 Step 3); `assessStoryArc`/`StoryArcVerdict` (Task 3) consumed by the front (Task 5).
- **Behaviour-preserving:** every task asserts the legacy path (no beats / anchor-only beats / auto-pick) stays byte-identical; only new roles add validation, only absence-of-beats adds a non-blocking warning.
