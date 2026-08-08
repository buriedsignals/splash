# A `us-states` dot-density VIDEO joins — render proof, 2026-08-07

This is the measurement that decided a **capability**, not a bug fix: whether the loop's
dot-density refusal should stay format-blind.

## What was refused, and why that was wrong

`skills/map-native/src/DotDensityMap.tsx:41` pins its join key — `const JOIN_KEY = "iso_a3"` — so a
dot-density built **static** or **interactive** against any basemap but `world` joins state postal
codes against country ISO codes: boundaries, a legend, and not one dot. That is real, and it is
still refused.

But `lib/loop/assemble/map-native.ts` refused **every** non-world dot-density in **every** format,
while its `cartogram` sibling — the same fact, the same components family — was scoped to the two
formats that actually pin the key. The asymmetry was never a decision; the cartogram fix said so in
as many words, deferring the narrowing as "a capability decision owed its own rendered proof".

`DotDensityStory.tsx:199`, `DotDensityReveal.tsx:134` and `DotDensityScrolly.tsx:140` resolve the
key through `resolveVideoGeometry` (`skills/map-native/src/core/video-geometry.ts`), which prefers
`config.geography.joinKey` — `"postal"` here. So the format-blind refusal was deleting something.
This is the render that shows what.

## How it was produced

```
SPLASH_DOT_DENSITY_VIDEO_E2E=1 SPLASH_KEEP_PROOF=<dir> \
  bun test lib/loop/dot-density-video-e2e.test.ts
extract = ffmpeg -i landscape.mp4 -vf "select=eq(n\,<frame>)" -frames:v 1 frame-<n>.png
```

Through the loop's own `produce()` — not the engine script directly — so the brief, the assembler,
the geometry resolution and the producer are all the ones a run walks. Four US states by
population, `article-web`, format `video`:

```
state,population
CA,39000000
TX,30000000
NY,19000000
WY,580000
```

## The frames, and what each is evidence of

| frame | what it shows |
| --- | --- |
| `frame-018-title-card.png` | The title card. The reveal has not started — this is the "before" the 198.6 mean diff is measured against. |
| `frame-final-four-states-joined.png` | The engine's own review still (frame 140). **All four states joined**, over correct North-American bounds. |

The second frame is the whole proof, and it is worth reading closely rather than glancing at:

- **California, Texas and New York** carry dense scatters; **Wyoming** carries about 29 dots. At the
  legend's own `1 dot = 20,000`, 580,000 people is 29 dots — the dot counts encode the values, so
  the join reached the right row for the right polygon, not merely *a* polygon.
- The dots are **clipped to real state outlines** (California's coast, Texas's panhandle and gulf,
  Long Island). A world-geometry join would have produced no dots at all.
- The camera sits on the **United States**. The failing static/interactive path renders a world map;
  the cartogram equivalent of this bug rendered a bare basemap of *Europe*.

## The numbers (`video-verify.json`, written by `skills/map-native/scripts/snap-video.mjs`)

| measurement | value | floor |
| --- | --- | --- |
| violations | `[]` | — |
| `revealMeanDiff` | 198.61 | 0.5 |
| duration / frames | 27.3 s · 819 frames @ 30 fps | — |
| mp4 | 6 912 627 bytes, 1280×720 | 2048 bytes |
| `stillDiffRatio` | 0.0083 | ≤ 0.01 |

Zero violations proves the frames MOVE; it does not prove they show a joined map. That is what the
still above is for, and it is why this directory exists rather than a line in a commit message.

## What it decided

`lib/loop/assemble/map-native.ts` now asks the shared predicate
(`skills/map-native/src/region-join-support.ts`'s `isoA3PinnedJoinError`) which formats the pinning
reaches — for both types, in one place — instead of two branches disagreeing. The static and
interactive formats stay refused, in the same sentence they always were.

The mp4 itself is not committed (6.9 MB). Re-run the command above to regenerate it; the always-on
half of that test file runs in the ordinary gate and keeps the fixture from rotting.
