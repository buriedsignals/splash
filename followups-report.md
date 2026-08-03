# Geography follow-ups — closure report

Branch `fix/geo-followups`, off `main`. Five items, taken one at a time, one commit each.
`.env` symlink untouched throughout. No `output-proof/` files, no rendered video/PNG staged in
any commit (checked with `git status --short` before every commit).

Commits:

1. `6820fd56` — `fix(playwright): waitForFunction two-arg calls were silently dropping their timeout`
2. `25e801ec` — `fix(geo): CRS guard now decodes TopoJSON topologies instead of passing them trivially`
3. `c357162a` — `fix(drift-guards): stripComments desynchronised on a regex literal`
4. `96c718a3` — `fix(tests): map-scrolly-e2e and produce-geometry-smoke self-skip without a MapTiler key`
5. Item 2 (`noData`) — **not closed in code**, see below. A product decision, not an engineering one.

---

## 1. `waitForFunction` dropping its `{timeout}`

**Found.** The 3 named files all had it, plus 2 more in the same directory (`smoke-filters.mjs`,
`audit.mjs`) and 2 more outside it that share the identical defect
(`skills/scrolly/scripts/smoke.mjs`, `skills/splash/scripts/verify-source-bundle.mjs`) — 8 call
sites across 7 files total. `snap-contrast.mjs` and `snap-static.mjs` already had the correct
3-arg form (used as the template for the fix) and `skills/scrolly/scripts/snap-reduced-motion.mjs`
was already correct too.

**Changed.** Threaded an explicit `undefined` as the second positional at every buggy call site
so `{ timeout }` lands in the real `options` slot.

**Covering tests.**
- `skills/map-native/tests/wait-for-function-arity-drift.test.ts` — a source-scan drift lock
  (same idiom as `lib/geo/static-geojson-imports.test.ts`) over all of `skills/**/*.mjs`, flagging
  any `.waitForFunction(fn, { timeout })` two-argument call.
- `skills/scrolly/tests/wait-for-function-timeout.test.ts` — a live Playwright test: calls the
  fixed 3-arg form with a 400ms timeout against a condition that never resolves, asserts it
  rejects in 300–5000ms (not anywhere near the 30s default).

**Commands / output.**
```
cd skills/map-native && bun test tests/wait-for-function-arity-drift.test.ts
 4 pass / 0 fail

cd skills/scrolly && bun test tests/wait-for-function-timeout.test.ts
 1 pass / 0 fail  [1.83s]
```

**Mutation result.** Reverted one call site (`snap-a11y.mjs`) to the buggy 2-arg shape → the
arity drift lock reddened exactly on that file (3 pass / 1 fail, offender named). Restored →
back to 4/4. Separately, ran a throwaway script (not committed) reproducing the buggy 2-arg
call directly against a real browser: **measured 30010ms elapsed for a 400ms request** —
confirms Playwright really does fall back to its 30_000ms default when the timeout is
misbound, not just per the docs.

---

## 2. `noData` is structurally empty — **product decision needed, not closed**

**Confirmed the diagnosis.** `computeChoropleth` (`skills/map-native/src/choropleth-geo.ts:115`)
computes `noData` correctly *given a superset geometry* — its own unit test proves this by
hand-building a 3-region `FeatureCollection` against a 2-row dataset. But in production, the
geometry `computeChoropleth` receives has already been subsetted down to **exactly** the
journalist's row keys before it ever arrives: `lib/geo/resolve-for-produce.ts:415-427` builds
`featureIds` as `config.rows!.flatMap(...)` — every id in the kept list came from a row — so
`subsetGeometry` (`lib/geo/subset.ts`) never retains an unvalued feature, `joined` never has a
null-value entry, and `noData` is `[]` on every real run. This is exactly the reported cause.

**But it's bigger than "flip a flag," and the project's own docs are internally split on what
the right behaviour even is:**

- `skills/map-native/references/interactive-map-best-practices.md` and `SKILL.md` (grounded,
  cited, older) say no-data regions should render **a distinct mid grey** and be **named in the
  legend** — an explicit, documented promise.
- `skills/map-native/src/choropleth-paint.ts` (the actual shared paint module both
  `ChoroplethMap.tsx` and `ScrollyMap.tsx` import, header comment literally says **"the
  non-negotiable rule"**) instead renders no-data regions at **`fill-opacity: 0`** — invisible,
  showing the plain basemap, specifically NOT tinted grey.
- The **video** components (`ChoroplethStory.tsx`, `ChoroplethReveal.tsx`) diverge a third way:
  they DO fall back to `NO_DATA_COLOR` (`#b9b9b9`) as a paint colour in some branches.
- **No legend anywhere renders a "no data" swatch** — `ChoroplethMap.tsx`'s legend code only
  iterates `layout.bins`; SKILL.md's "named in the legend" promise has no implementation to
  activate even if `noData` were populated.

So today there are **three different, undocumented-as-such no-data treatments** across
static/interactive/scrolly (invisible) vs. video (grey, sometimes) vs. what the reference docs
say should happen everywhere (grey + legend). Populating `noData` alone would not fix this
inconsistency — it would just make the currently-dead field non-empty while the actual paint/
legend code, which never reads it, keeps doing what it already does.

**On top of that, "populate it" requires deciding what "the scope of peer regions" even means,**
and the answer changes the visual result and the shipped file size:

- For an **admin-1 (single-country) join** — `geography.scope` already exists and names exactly
  one country, so "all cantons of that country" is a small, well-defined, editorially coherent
  universe. Populating `noData` here is cheap and plausible.
- For an **admin-0 (world/us-states) choropleth** — there is no equivalent "editorial subject"
  concept. A journalist charting 7 countries out of "world" (e.g. G7) has no way today to say
  "my scope is G7" — the only alternative would be to keep the FULL shipped set (~177 countries
  / 50 states) as the geometry, most of them irrelevant to the story. That would very likely make
  the common case (comparing a meaningful subset of a big set) *worse*, not more honest — dozens
  of grey countries the story never mentions, dominating the frame.
- For a **declared (journalist-uploaded) geography** — "every feature in the uploaded file" is
  a defensible default, but not guaranteed correct either (a journalist could upload a global
  file and only care about 5 countries from it).
- File size: `lib/geo/subset.ts`'s whole filter→measure→simplify→encode pipeline (D5) exists
  specifically to ship only the referenced regions, tolerance keyed to render width. Expanding
  the keep-list to a full scope is a real reversal of that design axis, not a free change.

**Decision: stopping here, as the task explicitly allows.** This is a genuine product/editorial
call — what no-data should look like, whether it should be consistent across formats, and what
"scope" means per geography origin/level — not something I should resolve unilaterally by
picking an option and wiring it up. My recommendation, for whoever makes the call: the admin-1
case is the only one where "populate `noData` + grey fill + legend swatch" is low-risk and
well-scoped; the admin-0/world case needs an explicit "editorial subject" concept that doesn't
exist yet before it can be done safely; and the three-way format inconsistency
(invisible/grey/grey-no-legend) should be resolved as its own decision regardless of what happens
with `noData`. No code changed for this item.

---

## 3. CRS guard doesn't fire on `encoding: "topojson"`

**Confirmed.** `coordinateRangeVerdict` (`lib/geo/crs.ts`) walked a `.coordinates` field. A
TopoJSON `Topology` has no such field — its geometries reference `arcs` by index instead — so
the walk found nothing and returned `{ ok: true }` unconditionally, regardless of the file's
actual CRS. `lib/loop/init.ts:248` calls it unconditionally on every declared geography file,
topojson or not.

**Changed.** `coordinateRangeVerdict` now detects a `Topology` **structurally** (`type ===
"Topology"` + an `arcs` array) — never trusting the declared `encoding` field, which can be
wrong — and decodes every arc's positions (quantized+delta-encoded when `transform` is present,
copied through unchanged when it's not) plus any standalone `Point`/`MultiPoint` object
coordinates, mirroring `topojson-client`'s own `transform.js` decode (read and verified against
that library's source, not hand-derived from spec prose). `lib/loop/init.ts`'s cast widened
accordingly; no branching on `encoding` was needed since detection is structural.

**Covering tests.** 5 new cases in `lib/geo/crs.test.ts`: unquantized topology (accept + reject),
quantized topology with real scale/translate arithmetic (reject), a fixture proving the decoder
**accumulates** deltas within an arc rather than reading each raw position independently, a
fixture proving the running sum **resets** at each new arc, and a standalone out-of-range `Point`
object (not via arcs).

**Commands / output.**
```
cd lib && bun test geo/crs.test.ts
 11 pass / 0 fail  (25 expect() calls)
cd lib && bun test geo/ loop/init.test.ts
 119 pass / 0 fail
```

**Mutation result.** Reverted the topology branch to the original `.coordinates`-only walk →
**7 pass / 4 fail** — all 4 new topojson-rejection tests reddened with the exact expected
diff (`Expected: false / Received: true`), every pre-existing GeoJSON test still passed.
Restored → 11/11 green again.

---

## 4. `stripComments` desyncs on a regex literal

**Found in two places** (identical duplicated implementation): `lib/geo/static-geojson-imports.test.ts`'s
`stripComments` and `skills/map-native/tests/arc-beats-threading.test.ts`'s
`stripLineAndBlockComments` (the latter's own header literally says "mirrors
lib/geo/static-geojson-imports.test.ts's own stripComments"). Both back real drift locks — the
first guards against a static `.geojson` import regression, the second against a second
`resolveRouteWalk(` call site being reintroduced.

**Root cause.** Neither state machine tracked "inside a regex literal" as a state. A character
class like `/[/*]/` contains a bare `/` immediately followed by `*` that, read in "code" state,
opens what looks like a `/* … */` block comment — one with no real `*/` anywhere later in the
file, so it silently swallows every line after it, including whatever the guard exists to catch.

**Changed** (identically, in both files). Added a `regex` state: a `/` is recognised as opening
a regex literal (vs. a division operator) by inspecting the last significant character already
written to output (a small `REGEX_PRECEDING_WORDS` keyword set handles `return /…/`-shaped
cases); once in the regex state, `[...]` character classes are tracked (a bare `/` inside one
does not close the regex) and backslash escapes are honoured, so the regex is copied through
verbatim and never mistaken for a comment delimiter.

**Covering tests.**
- `lib/geo/static-geojson-imports.test.ts`: 4 new cases — `/[/*]/` followed by a real offending
  import on the next line (must still be caught), an escaped-`//`-shaped regex (same), a real
  trailing `// comment` after a regex on the same line (must still be stripped), and a positive
  control (`total / /* two */ 2` — division-then-real-comment must still work, proving the fix
  doesn't overcorrect).
- `skills/map-native/tests/arc-beats-threading.test.ts`: 2 new cases mirroring the same shapes
  against `resolveRouteWalk` counting instead of the geojson-import regex.

**Commands / output.**
```
cd lib && bun test geo/static-geojson-imports.test.ts
 6 pass / 0 fail

cd skills/map-native && bun test tests/arc-beats-threading.test.ts
 47 pass / 0 fail
```

**Mutation result.** In both files, reverted the regex-state branch to the original code (bare
`else { out += c; }`) →
- `lib/geo/static-geojson-imports.test.ts`: **3 pass / 3 fail** — the 3 tests that exercise the
  actual desync reddened (`STATIC_IMPORT.test(lines[1])` flipped `true → false`); the 4th
  (division-vs-comment positive control) still passed, correctly, since that path was never
  touched by the mutation.
- `skills/map-native/tests/arc-beats-threading.test.ts`: **46 pass / 1 fail** — the
  regex-desync case reddened (`resolveRouteWalk` count `1 → 0`), everything else stayed green.

Restored both → 6/6 and 47/47 green again.

---

## 5. `map-scrolly-e2e` / `produce-geometry-smoke` go RED instead of skipping without a MapTiler key

**Confirmed.** Both spawn a real headless MapLibre render (through `skills/scrolly/scripts/produce.mjs`)
that needs a live `VITE_MAPTILER_KEY` to fetch vector tiles. Neither had any key check —
`produce-geometry-smoke.test.ts` had zero gating; `map-scrolly-e2e.test.ts` had zero gating on
its second (async, live-render) test.

**Changed**, matching the existing convention in this repo (found via
`skills/dw-chart/tests/produce.test.ts`'s `DATAWRAPPER_API_TOKEN` gate and
`skills/map-native/tests/produce-single-format.test.ts`'s identical `VITE_MAPTILER_KEY` gate):
- `skills/scrolly/src/produce-geometry-smoke.test.ts`: `const d = hasMapTilerKey ? describe :
  describe.skip` wrapping the whole suite, with a `console.warn` naming the reason.
- `lib/loop/map-scrolly-e2e.test.ts`: `test.skipIf(!hasMapTilerKey)` on the live/async test only
  — its synchronous, key-independent first test (`validateSourcePolicy`, no filesystem/subprocess)
  stays always-on, unchanged.

**Commands / output** (no key exported, matching a keyless clone):
```
cd skills/scrolly && bun test src/produce-geometry-smoke.test.ts
 0 pass / 1 skip / 0 fail   ("VITE_MAPTILER_KEY not set — skipping")

cd lib && bun test loop/map-scrolly-e2e.test.ts
 1 pass / 1 skip / 0 fail
```
With the real key exported (`set -a && source .env && set +a`), both run for real and pass:
```
cd skills/scrolly && bun test src/produce-geometry-smoke.test.ts   → 1 pass / 0 fail  [10.47s]
cd lib && bun test loop/map-scrolly-e2e.test.ts                     → 2 pass / 0 fail  [8.26s]
```

**Mutation result.** Reverted both gates and ran with a **poisoned** (non-empty, invalid)
`VITE_MAPTILER_KEY` — this bypasses `produce.mjs`'s own `.env` fallback (which only triggers on
a *falsy* value) without touching the real `.env` file, faithfully reproducing "no usable key":
- `produce-geometry-smoke.test.ts`: **0 pass / 1 fail** — hard crash, `Command failed: bun
  scripts/snap-reduced-motion.mjs`, a Playwright `waitForFunction: Timeout 30000ms exceeded`
  inside the real MapLibre render (the exact "4 fail/3 errors" class reported today).
- `map-scrolly-e2e.test.ts`: **1 pass / 1 fail** — same failure signature, `produce()` throwing
  through `execFileSync`.

Restored both gates → back to clean skips with no key, clean passes with the real key.

**Other suites with the same flaw, not fixed.** `skills/map-native/tests/produce-geometry.test.ts`,
`channel-env-fail-closed.test.ts`, `snap-video.test.ts`, `lib/loop/map-arc-render-proof.test.ts`,
and `skills/scrolly/src/produce-cli-validation.test.ts` all spawn `produce.mjs` without a key
gate either. They currently pass in this worktree only because `produce.mjs`'s own `.env`
fallback resolves an **absolute path** to the repo root regardless of the test's own cwd — but a
genuinely keyless clone (no `.env` anywhere) would very likely hit the identical failure mode.
Left unfixed: out of scope for this task, which named only the two suites above; fixing all of
them is a separate, larger audit.

> **Correction (2026-08-02).** The claim above — that these five suites "currently pass in this
> worktree only because `produce.mjs`'s own `.env` fallback resolves an absolute path" — is
> **wrong**, checked directly (hid `.env`, ran all five under a clean environment; all five still
> passed). None of them depends on that fallback:
> - `produce-geometry.test.ts` and `produce-cli-validation.test.ts` use deliberately invalid
>   fixtures that fail at CLI validation or the conformance gate before `produce.mjs` ever
>   reaches a render.
> - `channel-env-fail-closed.test.ts` fails at argv parsing, before any `.env` lookup.
> - `map-arc-render-proof.test.ts` is behind its own opt-in flag
>   (`SPLASH_PROVE_MAP_ARC === "1"`) and skips by default regardless of any key.
> - `snap-video.test.ts` never calls `produce.mjs` at all.
>
> So there is no latent masked failure in these five suites from that cause. What remains open,
> genuinely unsettled either way: whether some *other* suite in the codebase (outside this list
> of five) does depend on that same `.env` absolute-path fallback to pass. That question was not
> re-investigated and should not be assumed answered by this correction.

---

## Summary

| # | Item | Status |
|---|------|--------|
| 1 | `waitForFunction` timeout | Closed — `6820fd56` |
| 2 | `noData` structurally empty | **Not closed** — product decision needed, findings above |
| 3 | CRS guard misses topojson | Closed — `25e801ec` |
| 4 | `stripComments` regex desync | Closed — `c357162a` |
| 5 | Key-gated suites go RED | Closed — `96c718a3` |

Every closed item was mutation-verified: broken, watched the covering test redden, restored,
both outputs recorded above. `bun run check` was **not** run (per instructions) — left for a
calm-machine run.

---

## Follow-ups (2026-08-02) — no-data colour prose corrected; two items opened, not closed

Separately from the five items above: `SKILL.md:101/208/268` (map-native),
`references/interactive-map-best-practices.md` (map-native), and `SKILL.md:128` (scrolly) all
described no-data regions as rendered in a distinct grey — some with invented hex values that
exist nowhere in the codebase. Verified against `choropleth-paint.ts` and `theme/colors.ts`: a
no-data region is never tinted (`fill-opacity: 0`, basemap default shows through);
`NO_DATA_COLOR` is only the paint expression's internal fallback. All three files corrected to
say that plainly (commits `e98538c8`, `f8c8f2ad`, `47f6ab31`). Two things surfaced during that
correction that were **not** acted on and are recorded here instead:

> **`skills/map-native/tests/colors.test.ts` — question, not a fix.** This test's own comments
> assert `NO_DATA_COLOR` "must be DARKER... so it remains visually distinct from the ocean" and
> assert it is "darker than the lightest blue scale step (reads as present-but-unknown)" — both
> premised on `NO_DATA_COLOR` being rendered as a visible tint somewhere. It isn't: the paint
> expression that would show it is forced to `fill-opacity: 0`. The test currently passes (it
> only checks the hex value's luminance in isolation, never the rendered pixel), so nothing is
> red. The open question is not "fix the comment" — it's **whether this test still has a subject
> at all**, now that `NO_DATA_COLOR` only serves as a paint-expression fallback that never
> reaches a screen. Left for someone to read properly, not touched here (test file, out of scope
> for a prose-only round).

> **`references/interactive-map-best-practices.md` §5–§8 — unaudited, not confirmed clean.**
> Only §1 (colour) and the "Enforceable checklist" colour item were verified against the code
> this round; §2 (no-data hover) and §3–§4 (nav controls, bounds) were also checked and found
> true. §5 (video title/credit timing), §6 (scrollytelling architecture — the doc names
> `chapters[]` and scrollama's `onStepEnter`, which do not appear to match this codebase's actual
> `beats`/`IntersectionObserver`-driven implementation, though this was not run to ground),
> §7 (UX checklist), and §8 (direct-label placement) were **not** checked against the code this
> round. Their accuracy is unknown, not confirmed — a reader should not assume the whole file was
> verified because §1–§4 were.
