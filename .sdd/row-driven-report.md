# Row-driven capture — teaching the verify layer "width pinned, height follows the content"

Branch `feat/row-driven-capture`, off `feat/engine-assemblers` @ `012f2fff`.

## What was wrong

Two correct components disagreed.

- `skills/dw-chart/src/export-aspect.ts` exports a **row-driven** chart (`ROW_DRIVEN_TYPES`:
  `d3-bars`, `d3-bars-grouped`, `d3-bars-stacked`, `d3-bars-split`, `d3-bars-bullet`,
  `d3-dot-plot`, `d3-arrow-plot`, `d3-range-plot`, `tables`) **width-only, on purpose**: each data
  row is its own track, and Datawrapper does not scale those rows into a pinned box — it CROPS the
  ones that overflow. Pinning the height is silent data loss, so the height is left to the content.
- `lib/verify/capture.ts`'s `capture:size-matches-destination` required BOTH axes within
  `SIZE_TOLERANCE_PX` at an integer scale, so it read a correct 1200×800 export as a
  `size-mismatch` — a **blocking** finding (`lib/verify/severity.ts:53`) on a correct artifact.

`lib/loop/assemble/index.ts` resolved the standoff by refusing to offer the nine types at all.
That is what this slice bought back.

## Where the fact travels from, and why

The fact is declared by the loop and consumed as neutral vocabulary by verify:

```
skills/dw-chart/src/export-aspect.ts   isRowDriven(type)          ← engine knowledge, unchanged
  └─ lib/loop/assemble/index.ts        heightPolicyFor(engine,t)  ← the loop's ONE engine-facing table
       └─ lib/loop/verify.ts           captureStep(...)           ← already holds engine + nativeType
            └─ lib/core/verbs/capture.ts  payload gate (membership-checked)
                 └─ lib/verify/capture.ts  heightPolicy: "pinned" | "content-driven"
```

The three candidates, and why two were rejected:

- **The channel model** (`lib/core/channel-policy.ts`) — rejected. A channel is not row-driven.
  `article-web` hosts a `column-chart` that lands exactly on its 1200×675 box *and* a `d3-bars`
  whose height belongs to its rows. The property is the engine's and the type's; putting it on the
  channel would make it true of both, which is the opposite of a guard.
- **The producer's report** (`DeliveredArtifact.report`) — rejected. The run manifest records an
  artifact as `path + sha256 + provenanceHash + producedAt` (`lib/loop/manifest.ts:194`); the
  producer's report bag never reaches `capture`. Carrying it there would mean widening a persisted
  zod schema (a migration) **and** keeping a second copy of an answer that is a pure function of
  `(engine, nativeType)` — a copy that can disagree with the engine's own. That is the drift class
  this codebase has already paid for.
- **The engine, read at the loop's engine-facing table** — chosen. `lib/loop/assemble/index.ts`
  already imported `isRowDriven` (it was the `supports` exclusion), and `captureStep` already holds
  the chosen option's `engine` and `nativeType`. The clause did not get deleted — it **changed job**:
  from refusing a type to declaring the shape that type's artifact will have.

`lib/verify` receives a **vocabulary term**, never a type name:

```ts
// lib/verify/types.ts
export const HEIGHT_POLICIES = ["pinned", "content-driven"] as const;
```

so a future engine with the same property answers in `heightPolicyFor` in one line, and the verify
layer needs no edit at all. Absent ⇒ `"pinned"`, so every existing caller is byte-identical.

## What was relaxed — and what was not

Three sites in `lib/verify/capture.ts`, static path only:

1. `sizeCheck` — the **height leg only** is dropped. The width leg is checked exactly as hard as
   before, and the check keeps its id, its criterion and its blocking severity. The `detail` string
   *names* the relaxation ("its height is content-driven and is not held to the 1200x675 box"), so
   a reader of the evidence can tell "not checked" from "checked and matched".
2. `integerScaleOf` — the scale is read off the **width alone** under `content-driven`. Both axes
   agreeing is not merely unlikely there, it is impossible by construction: a real 2× row-driven
   export would otherwise be recorded as scale 1 and then measured against a box twice the size it
   was rendered for.
3. `capture:fits-viewport` — the height leg only. Justified by the measurement below: the same
   correct artifact failed **twice**, once as a size mismatch and once as an overflow, so relaxing
   the size check alone would have left the offer broken for every chart with more rows than the
   box happens to fit. The width leg is untouched — an image wider than its container overflows on
   any policy.

`captureHtml` is deliberately **not** threaded: an html deliverable fills its host and
`capture:fits-viewport` there measures a live component, not a file's IHDR. The row-driven case
never reaches it (dw-chart's interactive form is a hosted embed with no file).

The relaxation is **recorded**: `CaptureRecord.heightPolicy` (and its zod field in
`lib/verify/schema.ts`, or zod would strip the key on the way through the manifest), set only when
it is not the default — the same absent-key discipline `renderedTitle` uses.

## Proof on a real artifact

`lib/loop/dw-chart-e2e.test.ts`, gated `SPLASH_DW_E2E=1`. A real `d3-bars` chart, 8 Swiss cities,
produced through `produce()` → Datawrapper API → PNG, then measured at its own IHDR (width bytes
16–19, height 20–23, big-endian) and run through the loop's own `captureStep`.

```
[dw-chart-rowdriven-e2e] delivered 1200x800 against the 1200x675 article-web box
[dw-chart-rowdriven-e2e] AFTER  pass — image 1200x800 matches the destination width 1200 at scale 1 — its height is content-driven and is not held to the 1200x675 box
[dw-chart-rowdriven-e2e] BEFORE fail — image 1200x800 is not the destination 1200x675 (any integer device scale)
[dw-chart-rowdriven-e2e] BEFORE fail — image 1200x800 against a 1200x675 container
```

| | measured | box | `size-matches-destination` | `fits-viewport` |
|---|---|---|---|---|
| BEFORE (pinned — the policy until this slice) | 1200×800 | 1200×675 | **fail** → blocking `size-mismatch` | **fail** → blocking `component-overflows-viewport` |
| AFTER (content-driven, declared) | 1200×800 | 1200×675 | **pass** | **pass** |

Both verdicts are taken on the **same bytes** — the proof asserts
`pinned.images[0].artifactSha256 === after.images[0].artifactSha256`. It also asserts
`|height − 675| > 2`, so the proof cannot silently become vacuous by demonstrating a relaxation on
an artifact that never needed it.

## Types exercised vs types reasoned about

- **Exercised end-to-end against the real Datawrapper API**: `d3-bars` — produced, published,
  exported, measured at its IHDR, captured through `captureStep`.
- **Exercised mechanically** (offer + declared policy, no network): all nine —
  `d3-bars`, `d3-bars-grouped`, `d3-bars-stacked`, `d3-bars-split`, `d3-bars-bullet`,
  `d3-dot-plot`, `d3-arrow-plot`, `d3-range-plot`, `tables` — asserted buildable, un-declined, and
  `content-driven`, in `lib/loop/assemble/index.test.ts` and in the always-on half of the e2e file.
- **Reasoned about, not rendered**: the other eight types' actual pixel returns. They share one
  code path (`channelToExportSize` → width-only for every member of `ROW_DRIVEN_TYPES`) and one
  engine-side floor (`skills/dw-chart/src/produce.ts:242-255`, width-leg only), so the shape is the
  same by construction — but only `d3-bars` was put in front of the API here.

## The guard can still fail — both directions, proven

`lib/verify/capture-static.test.ts`, new describe block:

| case | policy | image | box | verdict |
|---|---|---|---|---|
| row-driven, right width | content-driven | 1200×600 | 1200×675 | **pass** + record carries the policy |
| row-driven, many rows | content-driven | 1200×3000 | 1200×675 | **pass** (size + fits) |
| row-driven, WIDTH wrong | content-driven | 1000×600 | 1200×675 | **fail** |
| row-driven, too WIDE | content-driven | 1600×600 | 1200×675 | **fail** (size + fits) |
| same image, default policy | (absent) | 1200×600 | 1200×675 | **fail**, no key on the record |
| fixed-aspect, height wrong | pinned | 1200×900 | 1200×675 | **fail** |
| fixed-aspect, width wrong | pinned | 900×675 | 1200×675 | **fail** |
| 2× row-driven export | content-driven | 2400×1400 | 1200×675 | scale **2**, rootBox 1200×700, pass |

Plus `lib/core/verbs/capture.ts`: `heightPolicy` is validated by **membership** in
`HEIGHT_POLICIES`, not `typeof string` — a payload saying `"contentDriven"` is rejected rather than
silently falling back to `"pinned"` (a guard relaxed by a typo is the failure the payload gate
exists to prevent).

## The offer

`lib/loop/assemble/index.ts`, `dw-chart` entry: **only** the `isRowDriven` clause was removed from
`supports`, and only its branch from `declines`. The format clause
(`format === undefined || format === "static"`) and its decline sentence are unchanged **word for
word** — the sibling branch in `../splash-hosted` owns that one.

## Commands run, with their real output

RED first, as required.

```
$ bun test lib/verify/capture-static.test.ts
Expected: "pass"  Received: "fail"
(fail) capture — a content-driven height is measured on its width alone > PASSES a row-driven export that is the destination's width at its own height
(fail) capture — a content-driven height is measured on its width alone > PASSES a many-row export that is TALLER than the box it publishes into
Expected: 2  Received: 1
(fail) capture — a content-driven height is measured on its width alone > reads the device scale off the WIDTH when the height is content-driven
 16 pass / 3 fail
```

```
$ cd lib && bunx tsc --noEmit          # RED, additionally
verify/capture-static.test.ts(161,7): error TS2345: ... 'heightPolicy' does not exist in type 'CapturePayload'.
verify/capture-static.test.ts(169,31): error TS2339: Property 'heightPolicy' does not exist on type 'CaptureRecord'.
```

GREEN after the implementation:

```
$ bun test lib/verify/capture-static.test.ts
 19 pass / 0 fail / 52 expect() calls

$ cd lib && bunx tsc --noEmit
tsc exit=0                              # 0 errors

$ bun test lib/verify lib/loop
 611 pass / 14 skip / 0 fail / 1495 expect() calls   [182.96s]

$ SPLASH_DW_E2E=1 bun test lib/loop/dw-chart-e2e.test.ts
 5 pass / 0 fail / 40 expect() calls    (output quoted above)
```

Adjacent suites, unasked but touched by `captureStep` / the assembler table:

```
$ bun test lib/brain      →  71 pass / 7 fail / 7 errors   (IDENTICAL to the stashed baseline)
$ bun test lib/source lib/core →  326 pass / 0 fail
$ bun test lib/host       →  170 pass / 0 fail             (journey.test.ts included, green)
```

### Baseline discipline

A first `bun test lib/verify lib/loop` in the fresh worktree read 20 fail / 19 errors. `git stash`
showed the **untouched** tree reading the same 20/19, so exactly one failure was mine: the test
asserting the old exclusion, which this slice rewrites. Those 20 were engine-dependency failures —
the worktree had no `node_modules` at all, and `skills/chart-native` / `skills/map-native` have
their own. After `bun install` at the root and in those two skills, tsc reports **0** errors and
the suites are fully green. Nothing in the failure set was environmental-and-ignored.

## Files changed

| file | change |
|---|---|
| `lib/verify/types.ts` | `HEIGHT_POLICIES` / `HeightPolicy`; `CaptureRecord.heightPolicy?` |
| `lib/verify/capture.ts` | `CapturePayload.heightPolicy?`; height leg of `sizeCheck`, `integerScaleOf`, `capture:fits-viewport` |
| `lib/verify/schema.ts` | `CaptureRecordSchema.heightPolicy` (or zod strips it) |
| `lib/core/verbs/capture.ts` | membership gate + payload message |
| `lib/loop/assemble/index.ts` | `isRowDriven` clause removed from `supports`/`declines`; `heightPolicyFor` added |
| `lib/loop/verify.ts` | `captureStep` declares the policy |
| `lib/verify/capture-static.test.ts` | 8 new cases, both directions |
| `lib/loop/assemble/index.test.ts` | the nine types are back; every other engine stays pinned |
| `lib/loop/assemble/dw-chart.test.ts` | stale header comment |
| `lib/loop/dw-chart-e2e.test.ts` | the real-artifact proof + its always-on offer half |

## Concerns

1. **Merge with `../splash-hosted`.** Both branches edit the same `dw-chart` entry. The format
   clause's *text* is unchanged, but removing the row-driven branch from the `declines` ternary
   chain drops the remaining branches one indent level (prettier). Expect a whitespace conflict in
   that hunk; the resolution is mechanical.
2. **`capture:fits-viewport` height leg.** Relaxing it was a judgement, not a given. It is
   defensible — the real 8-row artifact failed both checks, so relaxing only one would not have
   returned the types to the offer — but it does mean a content-driven artifact is never held to a
   height bound. If a newsroom's delivery profile ever states a hard maximum embed height, that is a
   *different* check (a destination constraint, not a size identity) and should be added as one
   rather than by re-tightening this leg.
3. **Eight of the nine types are proven by construction, not by pixels.** They share one export
   path, but no PNG was pulled for `tables` / the dot-arrow-range plots. A cheap follow-up would
   loop the gated proof over the nine (nine published charts per run, so it belongs behind its own
   env flag, not `SPLASH_DW_E2E`).
4. **The relaxation is only as good as its declaration.** `heightPolicyFor` is the single point
   where a mis-declared engine would silently forgive a height. It is unit-tested in both
   directions (every other engine, an unset engine, an unknown type → `pinned`), and nothing else
   in the codebase can set the field on a loop-produced element.

---

# Follow-up: closing the concession (post-review)

The review returned **SOUND** and raised my own concern #2 to Important: a content-driven
artifact was left with no height ceiling at all. It is now closed the way I proposed — a NEW,
distinct check, not a re-tightening of the leg the policy relaxes.

The review also added a detail worth recording, because it strengthens the *earlier* decision: on
the static path `fits-viewport`'s `rootBox` is derived from the **same measured PNG dimensions**
`size-matches-destination` reads, and both sit in the `viewport` criterion. For a file they are
two readings of one number, not two concerns — which is why relaxing them in lockstep was right,
and why the ceiling below had to be a *third*, differently-shaped question rather than a tweak to
either.

## The bound: 10 × the destination height

`CONTENT_HEIGHT_LIMIT_MULTIPLE = 10` (`lib/verify/capture.ts`), compared against
`target.cssViewport.height`.

**A multiple, not a pixel count.** The ceiling has to mean the same thing on every channel:
6750px is a runaway chart for a 675-high article embed and an ordinary one for a 1920-high
Stories box. A constant would have to be wrong for one of them. Proven, not asserted — one
1080×15000 image is **fail** against `social-feed` (13.9×) and **pass** against `social-vertical`
(7.8×).

**Ten, specifically.** At article-web that is 6750 delivered pixels — roughly a hundred rows once
title, axis and source are paid for. That is a full national ranking (every canton, every
constituency), and about the longest thing a reader treats as a chart rather than as a table.
The failures the bound exists to catch are nowhere near it: a runaway row count lands 20–50×
out — a real 500-row export is ~44× — so the bound separates "long" from "broken" with room on
both sides instead of adjudicating a close call. My own e2e artifact (1200×800) is 1.2×, and the
tall unit fixture (1200×3000) is 4.4×: both comfortably inside.

## A distinct check with its own sentence

| | |
|---|---|
| check id | `capture:height-within-bound` |
| finding id | `height-far-exceeds-destination` |
| criterion | `viewport` |
| severity | **warning** |
| summary | "the deliverable is far taller than the space it publishes into — check the row count behind it" |

Not `size-mismatch`'s sentence. A content-driven height is not the box's **by design**, so telling
a journalist "wrong size" about it would be false and would give them nothing to do; what is true
and actionable is that the artifact has grown far past its space, usually because the data behind
it did. The test asserts the two do not blur: the finding's summary does not contain "not the
size", and no `size-mismatch` is filed alongside it.

**Why warning, alone among the viewport findings.** Its siblings state facts with no judgement in
them (the image is not the destination's size; the component leaves its container). This one
compares a legitimately content-driven height against a **chosen constant**. A long national
ranking can reach for that constant honestly, so blocking on it would gate real work on a number
nobody can derive. A warning still reaches the journalist in its own words. Promoting it is one
line in `lib/verify/severity.ts` if the field disagrees.

**Emitted only under `content-driven`.** A pinned deliverable already has its height held to ±2px
by `sizeCheck`; a second verdict on the same number would file one defect twice — exactly the
duplication `furnitureChecks` is careful to avoid. Asserted: a pinned 1200×30000 gets
`size-matches-destination: fail` and **no** `height-within-bound` check at all.

## Both directions, proven

| case | policy | image | box | multiple | `height-within-bound` |
|---|---|---|---|---|---|
| long ranking | content-driven | 1200×3000 | 1200×675 | 4.4× | **pass** |
| runaway export | content-driven | 1200×30000 | 1200×675 | 44.4× | **fail** (detail names 30000 and the 10× ceiling) |
| exactly at the ceiling | content-driven | 1200×6750 | 1200×675 | 10.0× | **pass** |
| 100px past it | content-driven | 1200×6850 | 1200×675 | 10.1× | **fail** |
| same image, short box | content-driven | 1080×15000 | 1080×1080 | 13.9× | **fail** |
| same image, tall box | content-driven | 1080×15000 | 1080×1920 | 7.8× | **pass** |
| pinned, absurdly tall | pinned | 1200×30000 | 1200×675 | — | **check not emitted** |

## The Minor: the membership guard now has a diff-visible test

`lib/core/verbs/verify-verbs.test.ts` — `"content-driven"` and `"pinned"` accepted;
`"contentDriven"`, `"content driven"`, `"row-driven"`, `""`, `1` and `null` all **refused**.

Stated honestly: this one was **green on arrival**. The guard was implemented in `6f79fdb5`; what
the review found missing was the coverage, not the behaviour. So it is a characterization test,
not a TDD cycle, and I am not claiming a RED for it. The RED evidence below is for the ceiling,
which genuinely did not exist.

## Commands, with real output

RED first:

```
$ bun test lib/verify/capture-static.test.ts
SyntaxError: Export named 'CONTENT_HEIGHT_LIMIT_MULTIPLE' not found in module
  '/Users/rmdms/Sites/Professional/splash-rowdriven/lib/verify/capture.ts'
 0 pass / 1 fail / 1 error

$ bun test lib/verify/review.test.ts
error: expect(received).toBeDefined()  Received: undefined
(fail) runReview … > warns — in its own sentence — about a content-driven deliverable far taller than its box
```

GREEN:

```
$ bun test lib/verify/capture-static.test.ts lib/verify/review.test.ts lib/core/verbs/verify-verbs.test.ts
 51 pass / 0 fail / 169 expect() calls

$ cd lib && bunx tsc --noEmit
tsc exit=0                             # 0 errors

$ bun test lib/verify lib/core
 376 pass / 2 skip / 0 fail / 2217 expect() calls   [29.61s]
```

The gated Datawrapper proof was **not** re-run, per instruction. Nothing in this follow-up touches
the produce path or the offer — the new check is additive and fires only under a policy the e2e
artifact (1.2×) passes with 8× of headroom.

## Files changed in the follow-up

| file | change |
|---|---|
| `lib/verify/capture.ts` | `CONTENT_HEIGHT_LIMIT_MULTIPLE`; emits `capture:height-within-bound` under content-driven only |
| `lib/verify/types.ts` | the new id in `CaptureCheckId` |
| `lib/verify/review.ts` | `capture:height-within-bound` → `height-far-exceeds-destination`, its own summary |
| `lib/verify/severity.ts` | the finding catalogued as a `viewport` **warning**, with the reasoning |
| `lib/verify/capture-static.test.ts` | 5 cases: long / runaway / at the ceiling / past it / channel-relative / pinned-exempt |
| `lib/verify/review.test.ts` | the warning finding, and that it is not confused with `size-mismatch` |
| `lib/core/verbs/verify-verbs.test.ts` | the membership reject case |

## Remaining concerns

1. **The constant is a judgement.** 10× is defended above and has wide margins on both sides, but
   it is not derived from anything — no engine constant, no WCAG rule. That is precisely why the
   finding is a warning rather than a blocker. If the field ever produces a legitimate chart past
   it, the fix is the constant, and the finding will have said so in its own words first.
2. **Static path only.** The ceiling is not applied in `captureHtml`, for the same reason the
   policy is not: there the measurement is a live component in a scrolling document, not a file's
   IHDR, and "how tall may this be" is a different question with a different answer. Unchanged
   from the original slice, and still the narrower choice.
3. Concerns 1 and 3 of the original report stand unchanged (the merge conflict with
   `../splash-hosted`; eight of the nine types proven by construction rather than by pixels).
   Original concern 2 is **closed** by this follow-up.
