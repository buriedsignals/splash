# Zone kits — how the local 12B produces a beat

The 12B cannot write a whole bespoke component under doctrine. For each chart or map type, in each
format, the harness ships a **kit**: the worked example's component plus a generic runner. The model
writes one small file, `beat.mjs`, which says what THIS story's plate says. Code draws, measures and refuses.

## Layout

```
craft/
  _shared/            guards.mjs (the refusals every kit calls), series.mjs (by-name series reader)
  <format>/<slug>/    one kit; <format> is static | web | video | scrolly
```

`<slug>` is the type-survey name (`skills/storyboard/references/type-survey.md`, read by
`typeSurvey()`), lower-cased, every non-alphanumeric run turned into `-`, trimmed: "Box plot" →
`box-plot`, "Waterfall (bridge)" → `waterfall-bridge`, "Flow map (route — and origin-destination)" →
`flow-map-route-and-origin-destination`. `src/adapters.ts` `adapterFor(type, format)` finds a kit only
by that slug, and a kit exists only if its folder holds `render-beat.mjs`.

At craft time the driver copies the kit folder **and** `_shared/` flat into `stories/<slug>/beats/<id>/`,
next to the analyst's `data.json`, `PALETTE.md` two levels up and `STORYBOARD.md` two levels up. The model
may write only `beat.mjs` there (`src/tools/fs.ts` refuses the rest).

## The four files of a kit

1. **The worked example's component(s)**, copied from the proof the type sheet names
   (`skills/chart-beat/references/types/<type>.md` or `skills/map-beat/references/types/<type>.md`,
   "worked example"). Copy verbatim; a constant about the worked example's subject (a unit, a locale, a
   label) becomes a prop with the old value as its default. Keep every doctrine behaviour (direct
   annotation, one accent, furniture derived from the ground, the component's own refusals).
2. **`render-beat.mjs`** — the generic half of the proof's runner (`render-directions.mjs` or the
   format's equivalent) with everything about ITS subject removed, importing `./beat.mjs` and the
   component. It must, before drawing:
   - `import { applyStoryboard, … } from "./guards.mjs"` and call `applyStoryboard(beat, HERE)` right after
     importing the beat (credit line with date, title = takeaway verbatim, standfirst carries the limits);
   - refuse missing fields by name (`REQUIRED`), call `beat.check()`;
   - call the shared guards that apply to its marks: `assertNumbers`, `assertLegibleLabels` (value labels),
     `assertOnePerX` (anything keyed by year), `assertHeadlineNumbersDrawn`, `assertDrawsClaimColumn`;
   - add the type's own refusals (what the component cannot draw honestly), each message saying what to
     change in `beat.mjs`;
   - render with the story's palette and run direction exactly as the proof's runner does, and print the
     output path (static: `rendered renders/<name>.png`).
3. **`CONTRACT.md`** — the fields of `beat.mjs`'s default export in a table, the rules, and how to read
   the data. Follow `static/line/CONTRACT.md`: same Rules section (title's first form = takeaway copied
   literally; numbers in other sentences computed; story language; draw the takeaway's measure; rates on a
   readable base; `check()` only what the drawn data decides), and point at `series.mjs` when the type
   draws series keyed by x. Use NEUTRAL column names in examples — never a held-out story's columns.
4. **`beat.example.mjs`** — the worked example's own content written as a `beat.mjs`, every number on the
   plate computed from `data.json` (`{ columns: [{ name, type }], rows: [[…]] }`, rows are arrays).

## Verifying a kit (required)

Make a scratch story under `~/.splash-harness/bench/root/stories/zz-<you>-<slug>/` with `beats/1/`,
a `PALETTE.md` (`---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`), copy the kit and
`_shared/` into `beats/1/`, build `data.json` from the proof's own data in the shape above, copy
`beat.example.mjs` to `beat.mjs`, and run from the bench root:
`cd ~/.splash-harness/bench/root && bun stories/zz-<you>-<slug>/beats/1/render-beat.mjs`.
LOOK at the output (PNG for static) and confirm it is a correct, legible plate. Then mutate `data.json` so
the title is no longer true and confirm `check()` (or a guard) refuses. Delete the scratch story.

## Format-specific obligations

Two kinds of kit. A **gesture kit** (`<format>/<slug>.gestures/`, `gestures/GRAMMAR.md`) composes the staging
from the story: the 12B writes an ordered `gestures` list, code renders it per format and refuses false or
conflicting gestures. A **per-type kit** (`<format>/<slug>/`) keeps the worked example's gesture, choreography
or scroll states — the type's design, written once by a person and reviewed — and the 12B fills only the
subject (data, words, checks); it is the fallback where a gesture kit exists, and the only kit elsewhere. Whatever the
format, `render-beat.mjs` must leave something the model can LOOK at (a PNG) and print its path on a line
`look at: <absolute png path>`, and must leave `renders/` non-empty only when the render succeeded.

- **static** — PNG + SVG in `renders/` (see the existing kits).
- **web** — the proof's `render-directions-web.mjs` / `render-web.mjs` path (`skills/chart-web`,
  `skills/map-web` for maps): write the HTML page(s) into `renders/`, then run the skill's verification
  (`scripts/verify-web.mjs --shots` or the map equivalent) and keep its screenshots; print a desktop
  screenshot as `look at:`. The page must degrade to the static frame without JavaScript, as the skill
  requires. The interaction is the worked example's; the 12B words its labels and tooltips through
  `beat.mjs`.
- **video** — the proof's split (`subject.mjs`, `states.mjs`, `scene.mjs`, `timing-contract.ts`, the
  frame components, `render-directions-video.mjs`): `beat.mjs` replaces the SUBJECT (data, words, the
  claim's numbers); the timing contract and shots stay the worked example's unless the data's shape
  forces a change the kit computes. `render-beat.mjs` renders the `--look` stills first (print one as
  `look at:`), then the mp4 into `renders/`. Rendering is slow on the target Mac: keep it to the
  directions the run direction selects.
- **scrolly** — the proof's `render-directions-scrolly.mjs` + drive file: `beat.mjs` gives the subject and
  the prose of each card; the states and the drive stay the worked example's. Render the page into
  `renders/` and a screenshot per card for `look at:` (first card at least).

Verify a non-static kit the same way as a static one, LOOKING at its screenshots or stills (and, for video,
at stills extracted from the mp4 — a still from the composition does not prove the mp4).
