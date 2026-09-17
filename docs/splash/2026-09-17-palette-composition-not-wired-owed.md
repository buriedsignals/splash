# Palette composition owed — four video final frames, not 155 beats

Superseded same day. The first version of this note, and the test that produced it
(`skills/splash/test/the-palette-reaches-the-pixels.test.ts`), asserted a PRODUCTION promise — the
accent `composeDirection` composes from `PALETTE.md` — over the whole `proof/` CATALOGUE, including
its FILED-direction bench renders. `composeDirection`'s own doc says a filed-direction bench is not
that promise: "`proof/` renders three only as a bench, to show that a rule is not lucky on one
palette" — a bench of a filed direction, not a composed one. Confirmed against
`skills/chart-beat/scripts/static-plumbing.mjs` ("`--filed` for every filed demo direction — a
catalogue or demo proof, never a production render") and against
`proof/static-histogram-europe-solar-spread/render-directions.mjs`, which renders BOTH modes off one
flag and defaults to composed. The test was rewritten to hold two separate promises against two
discovered, disjoint populations. That test now measures the real debt:

**Of 161 beats: 5 are composed (all 5 carry the composed accent). 156 are filed — 152 carry their
own filed direction's own accent; 4 do not.**

## What is owed

All four are video beats whose chart type draws its accent only through a mixed ramp
(`mix(accent, ink, …)` / `mix(accent, ground, …)` — see `CalendarFrame.tsx`'s `blend(...,
colours.ramp[d.bin], ...)`), never as a solid fill of the pure accent:

- `video-calendar-heatmap-geneva`
- `video-hex-grid-europe-protection`
- `video-marimekko-electricity-mix`
- `video-proportional-symbol-europe-capacity`

The SAME chart types in the static genre (`static-calendar-heatmap-geneva`,
`static-hex-grid-europe-protection`, `static-marimekko-electricity-mix`,
`static-proportional-symbol-europe-capacity`) all carry the pure filed accent somewhere in their
committed PNG (a legend swatch or a tracked-element stroke, distinct from the ramp fill) — so the
ramp itself is not the defect. What differs is specific to the video genre's own
`renders/creme-final-frame.png`: measured directly, its top chromatic pixels are desaturated/darker
than the filed accent by tens of RGB units per channel (e.g. `video-marimekko-electricity-mix`'s
`creme-final-frame.png` tops out at `#4F637F`/`#092145` against a filed accent of `#1757B6` — not an
anti-aliasing gap), which reads as the frame Remotion actually exports not being the fully-settled
one the static genre's own render reaches. Not diagnosed further here — that is Remotion
timeline/opacity work (`states.mjs`, `scene.mjs`) in these four beats' own video pipeline, not a
palette-composition question, and not fixed blind in this pass.

It leaves the ratchet by being diagnosed and fixed in the four beats' own video timing, not by the
number moving on its own:

1. for one of the four, compare `renders/creme-final-frame.png` against a frame extracted a beat
   later in the same `.mp4` and confirm the accent settles by then;
2. if it does, the final frame is being captured before the last interpolation resolves — move the
   export point in that beat's `states.mjs`/`scene.mjs`;
3. re-render, re-check with
   `bun test skills/splash/test/the-palette-reaches-the-pixels.test.ts -t "<beat> (filed)"`;
4. repeat for the other three.
