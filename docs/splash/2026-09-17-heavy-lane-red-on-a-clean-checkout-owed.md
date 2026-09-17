# The heavy lane is red on a clean checkout, and CI does not look — 2026-09-17

Measured in a detached worktree of committed `main`, installed with `bun install
--frozen-lockfile` and nothing else on disk: `bun run test:heavy` ran 8 775 tests across 170 files
in 1 342 s and reported **143 failures**. `bun run test` (the fast lane, 4 719 tests, 235 files) is
green, and the fast lane is the only one `.github/workflows/ci.yml` runs — so none of this is
visible to CI, to a pull request, or to anyone who runs the default command.

Forty of the 143 were a stale premise and are fixed in this same pass (see
`the-design-base-is-reachable-from-the-skills.test.ts`, below). The remaining **103** were recorded
here. Every one of them is reproducible from a clean checkout; none is flaky, and none is caused by
a missing key, a missing `.env` or a missing cache — those tests skip and say so.

## What was red, and what has been closed since

Measured again in a detached worktree of committed `main`, same install: **8 876 tests across 170
files, 16 failures**. The rows below say what each one turned out to be.

| file | fails | what it was | now |
| --- | --- | --- | --- |
| `skills/splash/test/video-handover-is-a-cut.test.ts` | 40 → 13 | the guard was reading an EMPTY document — every directed composition opens `ready ? <Frame/> : null` and `renderToStaticMarkup` runs no effects, so all three assertions walked nothing | harness fixed; **13 real crossfades remain, owed** |
| `skills/chart-beat/test/inspect-render.test.ts` | 29 → 0 | fixtures declared no `font-family` while the rasteriser runs with system fonts off, so nothing was drawn and nothing measured | fixed |
| `skills/splash/test/credit-anchors-to-the-frame-bottom.test.ts` | 18 → 0 | 17 credits long enough to WRAP, measured at their opening line instead of their block's foot; 1 subtitle opening with the word "sources" | fixed |
| `skills/splash/test/text-clears-its-contrast-floor-on-the-plate.test.ts` | 5 → 0 | two beats deriving an ink against a colour that is not behind the glyph | fixed, both beats re-rendered |
| `skills/splash/test/annotation-reads-over-what-it-crosses.test.ts` | 3 → 0 | a level rule drawn from inside the column it levels from; and a halo exemption that knew only `paint-order="stroke"`, not the halo-twin spelling four beats use | fixed |
| `skills/splash/test/text-in-a-delivered-plate-does-not-overlap.test.ts` | 2 → 0 | a unit line seated without its own descent; an end label crossed by a gridline | fixed, both beats re-rendered |
| `skills/storyboard/test/type-survey.test.ts` | 1 → 0 | `2026-09-17-type-survey-coverage-owed.md` | fixed |
| `skills/scrolly/test/scroll-integrity.test.ts` | 1 → 0 | one test driving 120 renders under one 600 s ceiling; the sweep needs ~45 min and could never reach its assertion | one test per beat; whole sweep green |
| `skills/splash/test/a-typeface-arrives-as-a-file.test.ts` | 1 → 0 | `typefaces.mjs` memoises per process and the lane loads every file into one, so the suite's own cache directory was never filled | fixed |
| `skills/splash/test/the-palette-reaches-the-pixels.test.ts` | 1 | see below — **owed** | red |
| `skills/splash/test/web-annotation-clears-its-marks.test.ts` | 1 | 18 web beats, real collisions at 375 px — **owed** | red |
| `skills/splash/test/fluid-decisions-are-retaken.test.ts` | 1 | same 18 beats, same width — **owed** | red |

## The three that are still owed

**13 directed videos hand over by crossfade.** `video-area-swiss-co2`,
`video-bar-top-emitters-2024`, `video-box-plot-france-co2-decades`, `video-bump-emitter-rank`,
`video-diverging-bar-eu-per-capita`, `video-dumbbell-life-expectancy-gains`,
`video-gantt-top-ten-tenure`, `video-heatmap-europe-electricity`,
`video-hex-grid-europe-protection`, `video-lollipop-co2-per-person`,
`video-marimekko-electricity-mix`, `video-population-pyramid-swiss-age`,
`video-sankey-electricity-sources`. Each site is named with its frame and its two texts or two
shapes. They came back while the guard was blind, which is exactly the cost the blindness had. The
fix is motion written per beat — a mount/unmount where two nodes now fade past each other — and
then a Remotion re-render of three directions each. That is a production run, not a test fix.

**`the-palette-reaches-the-pixels.test.ts` asks a question this corpus no longer answers.** It
names one beat, `static-electricity-mix-source`, which is now under `archive/` — but re-pointing it
is not the fix. `scripts/two-palette-proof.mjs` runs a beat's FIRST `render*.mjs`, and every one of
the 161 beats now leads with a `render-directions*.mjs` that draws from
`docs/design-base/directions/*.md`; **none of the 161 uses the recorded palette's accent to draw**
(measured: zero matches for `seriesInks`, `palette.accent` or `newsroom.accent` in any of them).
Run against four candidate replacements, the probe reports STILL for all four, correctly. So the
question owed is a design one — does a recorded `PALETTE.md` still reach a delivered picture now
that a composed direction owns the colour, and if so through which runner — and the probe should be
re-aimed at whatever the answer is, not pointed at another beat.

**18 web beats collide at 375 px.** `web-annotation-clears-its-marks` and
`fluid-decisions-are-retaken` report 228 distinct sites across `web-area-swiss-co2`,
`web-beeswarm-co2-per-person`, `web-boxplot-france-co2-decades`, `web-bullet-low-carbon-share`,
`web-calendar-heatmap-geneva`, `web-connected-scatter-lowcarbon`, `web-diverging-bar-eu-per-capita`,
`web-donut-world-co2-share`, `web-dot-strip-lowcarbon-spread`, `web-dumbbell-life-expectancy-gains`,
`web-gantt-top-ten-tenure`, `web-histogram-carbon-footprint`, `web-line-swiss-co2`,
`web-lollipop-co2-per-person`, `web-population-pyramid-switzerland`,
`web-scatter-income-life-expectancy`, `web-streamgraph-swiss-electricity` and
`web-bump-emitter-rank` — annotations printed over each other or over the marks they name at phone
width. Real, and per-beat placement work.

## What the lane costs now

3 392 s, of which `scroll-integrity.test.ts` is about three quarters of an hour on its own: it
drives 120 rendered pages at three widths through a real browser, and that is what the guard is.
Wiring the heavy lane into CI is now a question of that budget rather than of 103 failures — but
the three items above should close first, so a red build means something.
