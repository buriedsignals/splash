# Palette composition not wired owed — the accent recorded in PALETTE.md never reaches most renders

Measured 2026-09-17 over `proof/` (161 beats), by the same walk
`skills/splash/test/the-palette-reaches-the-pixels.test.ts` runs: for every beat, ask
`composeDirection` (`shared/design-base/compose.mjs`) what accent that beat's own `PALETTE.md`
composes to on the filed direction it actually shipped a render for, then read the pixels of the
COMMITTED render — a PNG or video final frame already in the repo, or a screenshot of the committed
HTML for a scrolly/web beat — and ask whether that exact colour is in the picture.

**6 of 161 beats draw the accent their own record composes to. 155 do not.**

| genre | beats | draw the composed accent | owed |
| --- | --- | --- | --- |
| static | 38 | 3 | 35 |
| scrolly | 40 | 1 | 39 |
| video | 40 | 0 | 40 |
| web | 40 | 2 | 38 |
| more / co2-suisse | 3 | 0 | 3 |
| **total** | **161** | **6** | **155** |

## What passes, and why

`static-flow-map-ukraine-protection`, `static-locator-zaporizhzhia`, `web-flow-map-ukraine-protection`,
`web-hex-grid-europe-protection`, `static-histogram-europe-solar-spread`, `scrolly-heatmap-coal-share-europe`.

Every one of these six is a runner whose `render-directions*.mjs` calls `composeDirection` (singular)
and threads its `.accent` into the component. That call is the only place in this codebase that turns
a beat's recorded hue into the accent hex a renderer should paint with — `composeAccent`'s own
comment: "the record owns the hue, the direction owns the value."

## What is owed, and why it is not fixed here

The other 155 runners call `composeDirections` (PLURAL) only to print an offer report to the
console, then draw with:

```js
const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
```

— the raw filed direction, straight off disk, carrying whatever accent that direction's own record
holds (a generic corpus blue, roughly 206-216° of hue on `creme`/`nocturne`), never composed against
the beat's own `PALETTE.md`. `compose.mjs`'s own docstring names this defect and says it is closed
("both now come out of this file, from the same call"); the wiring inside `proof/`'s 155 other
runners never took up the fix. A beat recording a teal `#0B7A75` and a beat recording a green
`#1B7F4B` both ship a render in the same corpus blue.

This is a rewiring project across the catalogue's own runners — swapping
`resolveDirectionFamilies(readDirection(...))` for a `composeDirection({ direction, palette, ... })`
call in each of 155 `render-directions*.mjs` files, then re-rendering every one of them (video beats
through Remotion) — not a beat-level colour mistake fixable in the scope of one small job. It is
recorded here rather than fixed.

It leaves the ratchet by being rewired and re-rendered, not by the number moving:

1. pick one genre (static is smallest at 35 owed) and change its `render-directions.mjs` template
   (`skills/chart-beat/assets/static-beat-scaffold/render-directions.mjs.tmpl`, mirrored across the
   craft skills) to call `composeDirection` per filed direction instead of
   `resolveDirectionFamilies(readDirection(...))` directly;
2. apply the same change to each of that genre's already-shipped runners under `proof/`;
3. re-render every changed beat and commit the new PNGs/HTML/MP4s;
4. re-run `the-palette-reaches-the-pixels.test.ts` for that genre's beats and confirm they move from
   red to green;
5. repeat per genre until the table above reads 0 owed.

No test's assertion should be weakened to absorb this count in the meantime — the 155 failing named
tests are that debt, made visible.
