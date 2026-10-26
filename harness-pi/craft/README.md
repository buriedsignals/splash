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
