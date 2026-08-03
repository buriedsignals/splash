# Gesture inventory — what each engine actually makes move

> **Date:** 2026-08-03 · **Tree:** `splash-gestures` (`feat/gesture-vocabulary`) · **Read-only** — no
> product code changed while producing this document.
>
> **Purpose.** This is Task 1 of the gesture-vocabulary sub-project. It is the evidence Tasks 2-4
> declare a per-engine, per-type, per-narrative-kind gesture vocabulary from. Every claim below is
> anchored on a `file:line`. Nothing here is inferred from a `SKILL.md`, a spec, or a comment alone —
> comments are cited only where the surrounding code was also read and agrees with them (two places
> below, it did not — see §7 Findings).
>
> **Narrative kinds** (the project owner's own words): **`story`** — the camera carries the
> narrative (discrete beats, camera moves between them); **`scrolly`** — the step carries it (reader
> scroll position selects the beat); **`reveal`** — the data carries it (fixed frame, elements appear
> in order, no beats).
>
> **Method.** Grep for the primitive that would prove motion (`flyTo`/`easeTo`/`fitBounds`/`jumpTo`
> for cameras; `setPaintProperty`/`opacity`/`progress` for element animation; `config.arcBeats` /
> `deriveChartStory` / `NarrativeBeat` for beat-awareness), then read the surrounding function to
> confirm what the call site actually does — a grep hit alone was never treated as proof. Where two
> sibling components looked alike by their header comment, both were read, not just the first
> (twice below this changed the finding).

---

## 1. map-native — Story family (`story` kind — camera carries the narrative)

Files: `CartogramStory.tsx`, `ChoroplethStory.tsx`, `DotDensityStory.tsx`, `HexGridStory.tsx`,
`LocatorStory.tsx`, `SymbolStory.tsx` (6 files — **no `RouteStory.tsx`**, see §1.1).

All six share one architecture, confirmed by reading each file's own header and per-frame effect,
not assumed from the first:

- **Camera moves between beats.** `config.arcBeats` (a journalist-confirmed claim-arc) feeds
  `beatsForMode(derive<Type>Story(...), mode)`, which produces a discrete beat list
  (title → establish → reveal ×N → takeaway). `buildTimeline`/`cameraForFrame` map the current
  Remotion frame to a `(camera, beatIndex)` pair, and the per-frame effect calls
  **`map.jumpTo({ center, zoom })`** — never `flyTo`/`easeTo`. Every file's own comment states this
  explicitly ("Deterministic jump — never flyTo"), and every file's per-frame effect was read to
  confirm the call is really there:
  - `ChoroplethStory.tsx:255` (`arcBeats` read into `deriveMapStory`), `:453-460` (`cameraForFrame` →
    `map.jumpTo`)
  - `LocatorStory.tsx:191` (`arcBeats` read), `:327-330` (`cameraForFrame` → `map.jumpTo`, comment
    "Deterministic jump — never flyTo" at `:329`)
  - `CartogramStory.tsx:246` (`arcBeats` read), header `:13-14` ("Camera flies per beat via
    buildTimeline/cameraForFrame (jumpTo, never flyTo)")
  - `HexGridStory.tsx:227` (`arcBeats` read), header `:14`
  - `DotDensityStory.tsx:287` (`arcBeats` read), header `:19` ("camera flies to each beat via
    buildTimeline/cameraForFrame")
  - `SymbolStory.tsx:162` (`arcBeats` read), header `:7-8`
- **Elements animate in place, per subject, on top of the camera move.** Each family layers a
  "staged-entrance envelope" (fade + grow, or border-trail + fill-bloom for areal types) keyed to
  the beat that introduces that subject, plus a dim/highlight multiplier for beats that spotlight
  one subject and dim the rest. This is type-specific: `ChoroplethStory`/`CartogramStory`/
  `HexGridStory` border-draw + fill-bloom (areal, "story-choreography.ts"); `DotDensityStory`
  stipples in each region's own dots (`buildDotOpacityExpression`, header `:8-14`); `SymbolStory`/
  `LocatorStory` grow each point's radius + fade + raise its label
  (`SymbolStory.tsx` header `:3-4`, `LocatorStory.tsx` header `:5-9`).

**Reference implementations** (the brief names these as the two that provably honour a confirmed
storyboard today — verified, not taken on trust): `LocatorStory.tsx` and `ChoroplethStory.tsx`,
citations above.

### 1.1 Why there is no `RouteStory.tsx`

Not an omission — an explicit design decision, cited in the story-composition selector itself:
`skills/map-native/scripts/lib/story-comps.mjs:24-32`. A route has exactly one registered video
composition family (`RouteReveal`); its "guided-tour" camera mode is mapped to `RouteReveal`
**as an explicit case**, not a silent fallthrough — the comment gives the reason: a route's line
must physically draw through every crossed territory in geographic order, so there is nothing for
a discrete beat-driven tour to add over the continuous draw-on that already happens (see §3, and
the identical reasoning duplicated in `RouteReveal.tsx:159-172`).

---

## 2. map-native — Scrolly family (`scrolly` kind, as a **video** render — see caveat)

Files: `CartogramScrolly.tsx`, `ChoroplethScrolly.tsx`, `DotDensityScrolly.tsx`,
`HexGridScrolly.tsx`, `LocatorScrolly.tsx`, `RouteScrolly.tsx`, `SymbolScrolly.tsx` (7 files) +
`MapScrolly.tsx` (a 7-way type dispatcher, `MapScrolly.tsx:10-19` — no motion of its own).

**Important clarification not in the brief, established by reading the imports:** these
`*Scrolly.tsx` files inside `map-native` are **Remotion video compositions** — they render an mp4
that *simulates* a scroll-driven narrative as a deterministic frame sequence. They are not the
browser-interactive scrolly (that engine is `skills/scrolly`, see §5). Proof: every one of the six
non-route files imports `mapStoryToChapters` from the *other* package —
`ChoroplethScrolly.tsx:38-40`: `import { mapStoryToChapters, ... } from "../../../scrolly/src/chapters"`
— converting the map's beats into scroll-step "chapters", then driving the camera per **step**
(not per beat) with the same `jumpTo` discipline as the Story family (headers: `ChoroplethScrolly.tsx:1-6`,
`CartogramScrolly.tsx:1-13`, `HexGridScrolly.tsx:1-9`, `DotDensityScrolly.tsx:1-10`,
`LocatorScrolly.tsx:1-6`, `SymbolScrolly.tsx:1-5`).

- **Camera moves between steps**, via the same `jumpTo`-per-frame discipline as Story
  (`ChoroplethScrolly.tsx:1-6` "delayRender → jumpTo → setData … → continueRender").
- **Elements animate**: a per-step dim-emphasis (the non-highlighted subject dims to ~0.2–0.25),
  synced to a pinned `ScrollyPanel` sliding in — documented per-file:
  `CartogramScrolly.tsx:6-9`, `HexGridScrolly.tsx:5-7`, `DotDensityScrolly.tsx:7-8`.
- **All seven read `config.arcBeats`** — confirmed by direct grep + read of the call site, not
  the count alone:

  | file | `config.arcBeats` hits | what it does |
  |---|---|---|
  | CartogramScrolly.tsx | 1 | `:207` fed into `deriveCartogramStory`/`beatsForMode` |
  | ChoroplethScrolly.tsx | 2 | `:154` type decl, `:246` fed into `deriveMapStory` |
  | DotDensityScrolly.tsx | 1 | `:219` fed into `deriveDotDensityStory` |
  | HexGridScrolly.tsx | 1 | `:186` fed into `deriveHexGridStory` |
  | LocatorScrolly.tsx | 1 | `:219` fed into `deriveLocatorStory` |
  | RouteScrolly.tsx | 2 | `:186` comment, `:265` **actual call site** `resolveRouteWalk(l, config.arcBeats)` |
  | SymbolScrolly.tsx | 1 | `:191` fed into `deriveSymbolStory` |

  This is the mirror image of the Reveal family below (§3): every Scrolly component *does* honour
  the confirmed storyboard.

### 2.1 Route is the one type with a real per-step seam

`RouteScrolly.tsx:1-8` — unlike `RouteReveal.tsx`'s continuous, unre-orderable sweep (§3.1), the
scrolly render replaces the single draw with a per-**step** target: the line draws only up to the
active step's territory, and each territory's border/fill/label triggers off the step that reveals
it (`resolveRouteWalk`, `RouteScrolly.tsx:265`). `RouteReveal.tsx:169-171` states directly that this
is *why* a confirmed arc reaches route's scrolly render but not its reveal render.

### 2.2 Reachability caveat (out of this task's scope, but load-bearing for Tasks 2-4)

`docs/splash/reachability-audit-2026-08-03.md` (§0 item 3, dated the same day as this task) found
that `MapScrolly.tsx` + all 7 `*Scrolly.tsx` in `map-native` are **not reachable from any current
producer path** — the Remotion compositions are registered but no producer selects them. This
inventory only answers "if this component renders, what moves" — it does not re-verify
reachability. **Uncertain, flagged for Tasks 2-4 rather than settled here:** whether a vocabulary
entry for this narrative kind should be declared "available" if nothing currently routes to it.
Settling it would require re-running the audit's own `storyComps`/`isLoopBuildable` probes, which
this task's brief does not ask for.

---

## 3. map-native — Reveal family (`reveal` kind — fixed frame, data animates in)

Files: `CartogramReveal.tsx`, `ChoroplethReveal.tsx`, `DotDensityReveal.tsx`, `HexGridReveal.tsx`,
`LocatorReveal.tsx`, `RouteReveal.tsx`, `SymbolReveal.tsx` (7 files).

**Camera does not move between beats** — every one of the six non-route files calls
`map.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 })` exactly **once**, at load
(`duration: 0` = instant, not an animated fly-to):

| file | fitBounds citation |
|---|---|
| CartogramReveal.tsx | `:188` |
| ChoroplethReveal.tsx | `:210` |
| DotDensityReveal.tsx | `:203` |
| HexGridReveal.tsx | `:166` |
| LocatorReveal.tsx | `:181` |
| SymbolReveal.tsx | `:172` |

All six share the definition of a "simple reveal" from `skills/map-native/src/reveal.ts:1-9`
("A simple reveal is a FIXED-camera, data-animates-in clip: one eased progress 0→1 with short blank
holds at both ends"), and its `easedRevealProgress`/`revealCameraPlan` helpers
(`CartogramReveal.tsx:39` imports both).

**What animates**, confirmed per file by reading the per-frame `setPaintProperty` call, not the
header alone:

| file | what ramps 0→1 (or 0→max) with `progress` | citation |
|---|---|---|
| CartogramReveal.tsx | `fill-opacity` 0→0.85, whole layer together | `:202-208` |
| ChoroplethReveal.tsx | `fill-opacity` 0→0.85 on data regions (no-data stays 0) | `:249-269` |
| DotDensityReveal.tsx | `circle-opacity` + `circle-stroke-opacity` 0→1 | `:223-225` |
| HexGridReveal.tsx | `fill-opacity` 0→0.8, whole layer together | `:180-186` |
| LocatorReveal.tsx | `circle-radius` 0→full, `circle-opacity`, `circle-stroke-opacity`, `text-opacity` — all by the same `progress` | `:219-234` |
| SymbolReveal.tsx | `circle-radius` 0→`get(radius)`×progress, `text-opacity` 0→progress | `:218-233` |

None of these six stagger by subject, rank, or bin — **every data-bearing feature receives the
identical scalar `progress` in one paint call.** This directly contradicts one file's own header
comment; see §7.1.

### 3.1 RouteReveal.tsx is the one Reveal file with camera motion — and it is NOT beat-driven

`RouteReveal.tsx` differs from its six siblings in two ways, both confirmed by reading, not by the
grep count alone (the grep in §Step 2 below shows 1 hit, matching the brief's expectation, but the
hit itself needed reading):

1. **`config.arcBeats` is deliberately not read** — the single hit is a comment
   (`RouteReveal.tsx:159-172`) explaining why: the route's line must draw continuously through
   every crossed territory in geographic order, which is not expressible as a reorderable/subsettable
   beat sequence.
2. **The camera still moves — continuously, not in beats.** `RouteReveal.tsx:449-455`: a
   `map.jumpTo` call every frame, lerping `zoom` and `pitch` by the frame's own progress fraction
   `tt` (start-camera → +0.3 zoom, +8° pitch — a "push-in"), driven by `cameraForBounds`, not by any
   discrete beat index. This is a real, per-frame animated camera gesture that the brief's framing
   ("does the camera move, by what call") would otherwise miss if only the `arcBeats` grep were
   read. It is a single continuous move, matching the `reveal` kind's "no beats" character, not the
   `story` kind's "discrete beats" character.

---

## Step 2 (brief's own probe) — `config.arcBeats` mention count per file, confirmed

```
cd skills/map-native/src/components
for f in *Story.tsx *Scrolly.tsx *Reveal.tsx; do printf "%-28s %s\n" "$f" "$(grep -c 'config\.arcBeats' "$f")"; done
```

```
CartogramStory.tsx           1
ChoroplethStory.tsx          1
DotDensityStory.tsx          1
HexGridStory.tsx             1
LocatorStory.tsx             1
SymbolStory.tsx              1
CartogramScrolly.tsx         1
ChoroplethScrolly.tsx        1
DotDensityScrolly.tsx        1
HexGridScrolly.tsx           1
LocatorScrolly.tsx           1
RouteScrolly.tsx             2
SymbolScrolly.tsx            1
CartogramReveal.tsx          0
ChoroplethReveal.tsx         0
DotDensityReveal.tsx         0
HexGridReveal.tsx            0
LocatorReveal.tsx            0
RouteReveal.tsx              1
SymbolReveal.tsx             0
```

**This measurement agrees with the brief's expectation exactly**: every `*Reveal.tsx` is 0 except
`RouteReveal.tsx` (1), and that 1 is a comment stating it deliberately does not read the field
(confirmed by reading `RouteReveal.tsx:159-172`, quoted above). Nothing here contradicts the audit.

---

## 4. chart-native — 41 types, one shared architecture, no camera, no beats of its own

`skills/chart-native/src/components/` does not exist as a directory; the 41 chart types live
directly under `skills/chart-native/src/*.tsx` (e.g. `LineChart.tsx`, `BarChart.tsx`, …), each
paired with an `Interactive<Type>Chart.tsx` sibling. All 41 base files were read (their own header
comment, 1-4 lines each) — not sampled — and every one states the identical architecture:

> `LineChart.tsx:1-11` — "**THE ONE component.** Frame-driven by a single `progress` prop (0→1). …
> The component itself has NO clock/randomness — everything is a pure function of `progress`. The
> clock lives in `InteractiveLineChart`."

**Charts have no camera** (confirmed: no `flyTo`/`fitBounds`/`jumpTo`/map instance anywhere in
`skills/chart-native/src` — these are pure SVG/D3 geometry, not MapLibre). What moves is
type-specific, and every type's header names its own gesture in one line — a representative table
(all 41 read; grouped by shape family, not exhaustively reproduced since each is a one-line variant
of "grow/draw/sweep from the zero baseline or centre"):

| family | representative types | what animates (per the type's own header) |
|---|---|---|
| bar-shaped | Bar, GroupedBar, StackedBar, Diverging(Bar/Stacked), Histogram, Lollipop, Bullet, PopulationPyramid, Waterfall | bars/stems grow from a baseline (`BarChart.tsx:1-3`, `WaterfallChart.tsx:1-4` "builds the bridge step by step") |
| line-shaped | Line, ConnectedScatter, Slope, Bump, Candlestick, Parallel | a line/path draws on by cumulative length (`LineChart.tsx` via `revealLine`/`revealHead`; `ConnectedScatterChart.tsx:1-3` "traces the path by cumulative length") |
| area-shaped | StackedArea, Streamgraph, FanChart | a left→right band wipe (`StackedAreaChart.tsx:1-4` "left→right wipe") |
| point-shaped | Scatter, Beeswarm, DotStrip, Boxplot, Violin, Dumbbell | points/bands fade or grow in place (no path to draw) |
| angular / part-to-whole | Pie, RadialBar, Sunburst, Chord, Waffle, Marimekko, Treemap | an angle sweep or cell scale-in (`PieChart.tsx:1-4` "an ANGLE SWEEP"; `SunburstChart.tsx:1-4` "sweeps"; `ChordChart.tsx:1-3` "blooms the figure") |
| grid / matrix | Heatmap, Calendar | a diagonal fade+scale wave (`HeatmapChart.tsx:1-3`) |
| other | Gantt, Sankey, ArcChart, Radar, Lorenz, Pictogram, Combo | each type's own header names its own single-progress build (e.g. `SankeyChart.tsx:1-3` "fades the nodes in") |

**No chart-native component reads a beat structure.** Confirmed by an exhaustive grep across
`skills/chart-native/src` (all `.tsx`/`.ts`): zero hits for `arcBeats`; `ChartBeat`/`NarrativeBeat`
exist (`chart-story.ts:29-38`, `spec-to-config.ts:14-126`) but **no `.tsx` file in chart-native
imports `chart-story.ts`** — the beat-aware narrative (`deriveChartStory`) is consumed exclusively
by the `scrolly` engine (§5) and orchestration layers (`lib/brain/beats.ts`,
`skills/splash/src/validate-gate.ts`), never by chart-native's own static/interactive/video
renderers. **This is the chart-native mirror of the map-native Reveal-vs-Story split**: chart-native
itself only ever produces the equivalent of a `reveal` (single monotonic progress, no discrete
beats) — a beat-driven, `scrolly`-kind chart narrative exists only inside the `scrolly` package,
and only for 3 of the 41 types (§5.2).

### 4.1 Interactive format: a one-shot reveal, plus separate hover state

`skills/chart-native/src/core/InteractiveChart.tsx:24-99` is the shared wrapper behind every
`Interactive<Type>Chart.tsx`. It owns exactly one gesture: a linear `progress` 0→1 driven by
`requestAnimationFrame` over `durationMs` (default 2000ms), triggered either `on load`, `on scroll`
(`IntersectionObserver`, threshold 0.35, `:71-83`), or `none` (`AnimateOn` type, `:14`,
respects `prefersReducedMotion()`, `:11,32`). This is the *same* progress model as static/video —
"one master `progress`" is genuinely one architecture, not three.

Separately, hover/keyboard-focus state lives **inside each type's own component**, not in the
shared wrapper — confirmed for `LineChart.tsx:131,173,438-441` (`useState<number|null>` hover,
`onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` per point). This is a genuinely distinct gesture
("series/point highlighting on hover") layered on top of the intro reveal, present in the
interactive format only.

---

## 5. scrolly — orchestrator; owns the browser-interactive camera + crossfade dispatch

`skills/scrolly/src/` is the actual **browser-interactive** scrolly engine (as opposed to
map-native's `*Scrolly.tsx` video renders, §2). It imports renderers from map-native, chart-native,
and image-native rather than owning its own chart/map geometry.

### 5.1 Map track — `ScrollyMap.tsx`

`ScrollyMap.tsx:1-3` states directly: "Live-browser sibling of map-native's `ChoroplethStory` video
component. **Camera is driven by scroll (`flyTo`), not by Remotion frames.**" Confirmed:
`ScrollyMap.tsx:448` calls `flyToBeat(map, cam)` (an eased MapLibre eased-fly, imported from the
local `scrolly-camera.ts`) on step change, versus the video family's frame-exact `jumpTo`
(`ScrollyMap.tsx:396,398` use `jumpTo`/`fitBounds` only for the initial frame). This is a
genuinely distinct camera primitive from every map-native video component above — motivated by the
fact that a live browser doesn't need frame-determinism, only a smooth transition.

`MAP_SCROLLY_TYPES` (`scrolly-types.ts:38-45`) = `{symbol, hex-grid, dot-density, locator,
cartogram, choropleth}` — **6 of 7 map-native types; `route` is explicitly excluded** (confirmed by
the comment at `scrolly-types.ts:14-15`: "`route` has no branch and was being drawn as a
choropleth: a wrong render, silently" — this was a real, since-fixed defect, matching the commit
`8de9dc2d` in this branch's own recent history: "scrollySpecErrors refuses a route map track").

### 5.2 Chart track — `ScrollyChart.tsx`

`CHART_SCROLLY_TYPES` (`scrolly-types.ts:13`) = `{line, bar, scatter}` — **only 3 of chart-native's
41 types.** `ScrollyChart.tsx:3-5` imports only `LineChart`, `BarChart`, `ScatterChart`; the
dispatch at `:92,110,124` is an `if/else if` chain with no other branch. This vocabulary gap is
**mechanically enforced, not a silent hole**: `Scrolly.tsx:172` checks
`!CHART_SCROLLY_TYPES.has(nativeType)` **before** calling `deriveChartStory` (which would otherwise
throw) and returns an explicit empty-but-valid story instead (`Scrolly.tsx:170-179`, comment: "the
render shows a clear fallback instead of calling deriveChartStory"). Locked by a test:
`skills/scrolly/tests/scrolly-types.test.ts:5`.

Per the 3 supported types, the gesture differs by type (`ScrollyChart.tsx:90-138`):
- `line` (`:92-108`): continuous scrub — `revealTo` mapped from scroll fraction, the line draws
  further as the reader scrolls (comment `:23-25`: "the checkpoints are the reveal data indices…
  the head reaches each captioned point when its card centres").
- `bar` (`:110-123`): NOT a reveal — `progress={1}` (always fully drawn); the gesture is a
  **highlight walk**, one bar accented per step (`highlightIndex` from the active beat).
- `scatter` (`:124-138`): same highlight-walk pattern — the active beat's point gets labelled
  (`annotate`), not a progress reveal.

### 5.3 Dispatch generality — one stale header comment, corrected by reading the code

`Scrolly.tsx:5-8`'s own header says: "v1 has a single `visual:"map"` track. To add `chart` or
`image`, introduce a `switch(story.visual)`…" — **this is stale.** The actual code already
dispatches three visual tracks by structural discrimination (`"visual" in config` for image,
`"nativeType" in config` for chart, default for map) at `Scrolly.tsx:162-207` and renders all three
at `Scrolly.tsx:716-752` (`ScrollyImage`/`ScrollyChart`/`ScrollyMap`). See §7.2 — the comment
describes a v1 that the file has already moved past.

### 5.4 Image track — see §6, the renderer lives here not in `image-native`

`ScrollyImage.tsx` is the only place the crossfade gesture is actually implemented (§6).

---

## 6. image-native and the crossfade vocabulary

`skills/image-native/src/` has **no `.tsx` components at all** — only `image-story.ts` (pure step
derivation, `action: "crossfade"` at `:331,354,364`), `manifest.ts`, and `format-support.ts`. The
actual crossfade rendering lives in `skills/scrolly/src/ScrollyImage.tsx`:

- **One gesture, one primitive**: an **opacity crossfade** between the active and previous frame —
  `ScrollyImage.tsx:88-89`: `opacity: i === active ? 1 : 0`, CSS `transition: "opacity 600ms
  ease-in-out"`. `prefers-reduced-motion` drops the transition to a hard cut (`:50-51,89`) — the
  opacity still swaps, only the animation is removed.
- **Format scope is deliberately narrow**: `format-support.ts:1-7` — "image-native ships `scrolly`
  ONLY in v1 … static/video are follow-ups." No camera concept applies (photographs, not a
  geometric projection) and no beat/story concept either — the only narrative kind image-native
  supports today is `scrolly` (step carries it, one crossfade per step).

---

## 7. Findings — where reading disagreed with a comment (report, don't fix)

Per the task's instruction: these are recorded, not corrected. No product code was changed to
produce this document.

### 7.1 `ChoroplethReveal.tsx:3` claims a per-region stagger that the paint code does not do

The file's own header states: "Regions reveal in **ascending-value order (stagger by bin index)**,
blank at frame 0." The per-frame effect that actually paints the reveal
(`ChoroplethReveal.tsx:249-269`) computes a single scalar `progress` and applies the **same**
`revealFillOpacity(progress)` to every data-bearing region in one `setPaintProperty` call, gated
only by `__hasData` (`:263-267`). A `__binIdx` field is computed and tagged onto every feature
(`:144-158`) but is **never read anywhere else in the file** (`grep -n "binIdx" ChoroplethReveal.tsx`
→ only the two lines that set it, `:150,163`). **My measurement disagrees with the header comment:
there is no stagger by bin index. All data regions fade in together, identically to its siblings
(Cartogram/HexGrid/DotDensity/Locator/Symbol Reveal).** This matters for Tasks 2-4: declaring
"reveal in ascending-value order" as a choropleth-reveal gesture, on the strength of this comment
alone, would repeat the exact class of defect this sub-project exists to close.

### 7.2 `Scrolly.tsx:5-8`'s "v1 is map-only" is stale — the code already dispatches 3 tracks

Detailed in §5.3. Recorded here as a finding because it is the second instance (of two found) of a
component-level comment describing an earlier state of the code than the code that follows it.
Neither finding was in the brief's own expectation — both were surfaced by reading past the header
into the function body, which is why this inventory does that everywhere, not just where a
discrepancy was suspected in advance.

---

## 8. Summary table — engine × narrative kind × what moves

| engine | `story` (camera) | `scrolly` (step) | `reveal` (fixed frame) |
|---|---|---|---|
| **map-native** | 6 types, `jumpTo` per beat + per-subject staged entrance (§1) | 7 types as **video** (`jumpTo` per step, §2); 6 of 7 types as **browser-interactive** via `skills/scrolly` (`flyTo` per step, §5.1) — route excluded from the browser track | 7 types, fixed `fitBounds(duration:0)` + single `progress` element ramp (§3); route alone keeps a continuous (non-beat) camera push-in (§3.1) |
| **chart-native** | — (no camera concept) | 3 of 41 types, via `skills/scrolly`'s `ScrollyChart.tsx` only (§5.2) — chart-native's own components never read a beat | 41 of 41 types, single monotonic `progress` (bars grow / line draws / angle sweeps / etc., type-specific, §4); shared across static + interactive + video, same component |
| **dw-chart** | — | — | — (delegates rendering to Datawrapper; owns a static PNG export + a hosted embed, no motion of its own — `manifest.ts:49` `formats: ["static","interactive"]`, no `video`) |
| **map-dw** | — | — | — (same as dw-chart — `manifest.ts:16` `formats: ["static","interactive"]`; comments at `manifest.ts:15,16` and `produce.ts:27` state "animated maps are map-native's") |
| **scrolly** (orchestrator) | — | owns the step→camera/highlight dispatch for map (6 types) and chart (3 types) tracks (§5) | — |
| **image-native** | — (no camera concept — photographs) | 1 vocabulary entry: opacity crossfade between ordered frames, 600ms, renderer lives in `skills/scrolly/src/ScrollyImage.tsx` (§6) | — (`format-support.ts:7`: static/video are follow-ups, not built) |

---

## 9. What this task did not settle

- **Reachability** of the map-native video-Scrolly subtree (§2.2) — flagged, not resolved here;
  the brief's scope is component capability, not routing.
- **Whether every one of the 41 chart-native types' single-line header claim is pixel-accurate**
  (e.g. "diagonal fade+scale wave" for Heatmap) — read from the comment plus the shared `progress`
  architecture, not independently re-derived from each `*-geometry.ts` module. The architecture
  claim (one shared `progress`, no per-type beat support) *is* independently confirmed (the
  `chart-story.ts` import-graph check, §4). The exact visual shape of each type's animation was not
  re-verified against a rendered frame. Settling this fully would mean rendering all 41 types and
  is out of proportion to what Tasks 2-4 need (a gesture vocabulary entry, not a frame-by-frame
  motion spec).
- **Whether `ScrollyChart.tsx`'s "clear fallback" for an unsupported type (§5.2) is actually clear
  to a reader**, i.e. what the empty `steps: []` story renders as in the browser. Confirmed only
  that it does not throw and does not silently render blank per the comment's intent — the actual
  rendered UI for that empty-steps case was not opened in a browser for this task.
