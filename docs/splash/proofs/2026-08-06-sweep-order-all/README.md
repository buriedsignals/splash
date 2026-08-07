# The other five story types on one clock — render proof, 2026-08-06

`ChoroplethStory` was moved to the beat-order shape first
(`../2026-08-06-map-explainer/`). The five others carried the identical two-clock split. Every
frame here is pulled from a real mp4, not from a review still.

```
config  = skills/map-native/assets/sample-data/<sample>.json
        + { "cameraMode": "guided-tour", "sweepCarrier": "<carrier>" }
render  = SPLASH_CHANNEL=article-web bun skills/map-native/scripts/produce.mjs <config> <out> video
extract = ffmpeg -i landscape.mp4 -vf "select=eq(n\,<frame>)" -vsync 0 -frames:v 1 frame-<n>.png
```

| type | sample | carrier | why that carrier |
| --- | --- | --- | --- |
| SymbolStory | `symbol.json` | `threshold` | its points carry a value |
| LocatorStory | `locator-few.json` | `space` | its markers carry **no** value — `threshold` is refused by name (`whyNotOffered`), `space` and `order` are what this data drives |
| CartogramStory | `cartogram-grid.json` | `threshold` (+ a second run on `space`) | its cells carry the value their area encodes |
| DotDensityStory | `dot-density-uni.json` | `threshold` | a region's dot count IS the mapped quantity |
| HexGridStory | `hex-grid-count.json` | `threshold` | a hex cell carries its own aggregate |

## One timeline, shared by all five

A declared carrier resolves the reveal mode to `sequential` (`resolveRevealMode`), which drops
the establish beat — so every one of these renders is **title → 5 reveals → takeaway, 849
frames at 30 fps**, from `buildTimeline` + `AREAL_TIMELINE_OPTS`. Verified with `ffprobe
-count_frames` on all five mp4s.

| beat | camera move | camera still (hold) |
| --- | --- | --- |
| title | — | 0–74 |
| reveal 1 | 75–113 | **114–203** |
| reveal 2 | 204–242 | **243–332** |
| reveal 3 | 333–371 | 372–461 |
| reveal 4 | 462–500 | 501–590 |
| reveal 5 | 591–629 | 630–**719** |
| takeaway | 720–758 | 759–**848** (the close ramps 759 → 795) |

The same five frame numbers therefore mean the same thing in every type, which is why they are
the frames saved here.

## The three defects, answered per type

### (a) Is the framing pixel-identical while a subject's border draws, its fill blooms and its label rises?

**Yes, for all five.** Frame 114 is the first frame of reveal 1's hold — the camera has just
landed and *nothing has started*. Frame 177 is 63 frames later, entrance complete. Between them
the framing does not move by a pixel.

| frame | what it shows |
| --- | --- |
| `symbol-114` | Camera on London. Not one circle drawn. |
| `symbol-133` | 19 frames in: London's circle growing, label rising. Dublin, Manchester, Norwich, Cardiff, Plymouth sit on exactly the same pixels as in `symbol-114`. |
| `symbol-177` | `LONDON / 296$bn` at full. Same framing again. |
| `cartogram-grid-114` / `-177` | Empty canvas → Norway's tile lit, its border in a darker shade of its own bin colour, `NORWAY / 98`. Legend and title band unmoved. |
| `dot-density-uni-114` / `-177` | Bare basemap → Germany's border drawn navy, its dots stippled in, `GERMANY / 84M`. Neighbouring France, Poland and Britain still carry no dots. |
| `hex-grid-count-114` / `-177` | Faint empty grid → the densest cell filled and ringed, `THE DENSEST / 18 points`. Irish and Scottish coastlines identical. |
| `locator-few-114` / `-177` | Empty Paris → the Eiffel Tower marker and its label. **Weak evidence by construction**: `deriveLocatorStory`'s few-annotated regime frames every reveal on `allBounds`, so this type's camera never moves after the title and identical framing proves nothing about the trigger. The trigger is the same `atHoldStart` opt-in as the other four, and the coverage test pins it in all six files. *(Superseded 2026-08-07 — that regime now frames each place in its own box, so a re-run of this proof would carry real evidence. The pinning is why a locator scrolly of this shape could not be built at all; see `core/tour-box.ts`'s `tourStopBox`.)* |

Before this lot, on the carrier path, the entrance ran on `sweepFrameWindow`'s own clock — it
started when the sweep reached the mark, which had no relation to where the camera was.

### (b) Does anything light up outside the frame?

**No.** Frame 243 is the first frame of reveal 2's hold: the camera has landed on the second
subject and the second subject is still dark. Nothing ahead of the walk is lit anywhere.

| frame | what it shows |
| --- | --- |
| `symbol-243` | Camera on Paris; no Paris circle yet. London, one beat old, still lit at the top edge of the frame — a visited subject stays lit. |
| `cartogram-grid-243` | Camera on Austria's tile; frame entirely dark. Norway, already lit, is off-screen behind the camera — which is the correct direction. |
| `dot-density-uni-243`, `hex-grid-count-243` | Same: landed, nothing lit yet. |
| `locator-few-243` | The camera never moves here, so every marker is always in frame; what this shows instead is that Pont Alexandre III (the next stop west→east) is **not** lit at the moment its own beat begins, while the Eiffel Tower — visited — is still drawn (dimmed by this type's own dim-the-rest tour, which is pre-existing and unrelated to the carrier). |

Before this lot, the sweep ran the full length of the composition independently of the beats,
which is exactly what lit marks the camera was nowhere near.

### (c) Is any subject visible on screen that should be lit but is not?

**During the walk, yes and deliberately** — a mark the walk has not reached is dark. That is the
device. **At the end, no**, and that needed a fix of its own.

Frame 719 is the last frame before the takeaway: the five subjects are lit, everything else is
not. On `cartogram-grid-719` that means ~15 tiles are *completely invisible* (the grid variant
paints a flat canvas with no basemap under it); on `hex-grid-count-719` the grid is a ghost of
outlines. On a map where every mark carries a value that reads as "no data", not as "not a
subject" — the same misreading frame 719 of the first choropleth explainer made.

So the takeaway beat brings back what the walk sat inside, on that beat's own hold
(`explainerCloseProgress`). Frame 848 is the last frame of each video:

| frame | what it shows |
| --- | --- |
| `symbol-848` | All six cities, **including Amsterdam** — the one point past `maxReveals`, which the walk never visits and which was invisible for the whole story before the close existed. |
| `cartogram-grid-848` | The whole cartogram in its bins; the five subjects keep their darker subject borders. |
| `dot-density-uni-848` | All 14 countries stippled. |
| `hex-grid-count-848` | The whole grid, subject cells still ringed. |
| `locator-few-848` | All five markers at full, undimmed. (This sample has exactly `maxReveals` markers, so its close is not exercised — every marker is a subject.) |

## Does the carrier actually re-order anything?

On a type whose deriver already ranks by value descending — symbol, cartogram, dot-density,
hex-grid — `threshold` descending produces **the same order the deriver produced**, so the
permutation is the identity and those four runs prove the *timing*, not the *ordering*. Two
things prove the ordering:

- `locator-few` under `space`: the deriver's order is the config's own
  (Pont d'Austerlitz → Notre-Dame → Louvre → Pont Alexandre III → Eiffel Tower), and the render
  walks it **west→east**, opening on the Eiffel Tower (`locator-few-177`).
- `cartogram-grid` re-run under `space` — a second mp4, same config, carrier swapped — walks the
  tiles across the territory instead of down the values.
- `tests/story-sweep-order.test.ts` pins the permutation itself, including that it never
  re-sorts an `authored` (journalist-confirmed) arc and never changes the beat count.

## Byte-identity without a carrier

The same five configs **without** `sweepCarrier`, rendered before the change and after it —
`sha256(landscape.mp4)`:

| type | sha256 (before == after) |
| --- | --- |
| symbol | `af3c21332018d70d66ac…` |
| locator-few | `db42a3e6a80ac4588e86…` |
| cartogram-grid | `ba1ebb3285272b08c71f…` |
| dot-density-uni | `068caffe8da4000d2708…` |
| hex-grid-count | `3e280c91dbbbaffbd517…` |

Full digests and the comparison command are in `byte-identity.txt` beside this file.

## Known, and NOT introduced here

`locator-few-preexisting-790.png` is frame 790 of the **carrier-less baseline**, where the
Eiffel Tower reveal is the last beat rather than the first. Its `CountryLabel` runs off the left
edge of the canvas in exactly the same way as `locator-few-177`. The centred callout is not
viewport-clamped for a marker near the frame edge — a pre-existing LocatorStory defect that the
carrier's re-ordering makes visible *earlier* in the story, not one it causes.
