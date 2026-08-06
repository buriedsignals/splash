# Map Explainer on the choropleth `story` — render proof, 2026-08-06

Every frame here is pulled from a real mp4, not from a review still.

```
config  = skills/map-native/assets/sample-data/choropleth.json
        + { "type": "choropleth", "cameraMode": "guided-tour", "sweepCarrier": "threshold" }
render  = SPLASH_CHANNEL=article-web bun skills/map-native/scripts/produce.mjs <config> <out> video
extract = ffmpeg -i landscape.mp4 -vf "select=eq(n\,<frame>)" -vsync 0 -frames:v 1 frame-<n>.png
```

720 frames at 30 fps (24 s). The `threshold` carrier descends from the highest share, so the walk is
**Norway 99% → Sweden 68% → Germany 59% → Poland 21%**.

Beat timeline (`buildTimeline` + `AREAL_TIMELINE_OPTS`), and the entrance each reveal triggers:

| beat | camera move | camera still (hold) | entrance (border → fill → label) |
| --- | --- | --- | --- |
| title | — | 0–74 | — |
| Norway | 75–113 | 114–203 | 114 → 177 |
| Sweden | 204–242 | 243–332 | 243 → 306 |
| Germany | 333–371 | 372–461 | 372 → 435 |
| Poland | 462–500 | 501–590 | 501 → 564 |
| takeaway | 591–629 | 630–719 | distribution washes in 630 → 666 |

## The frames, and what each one is evidence of

| frame | what it shows |
| --- | --- |
| `frame-060` | Title card, map hidden. |
| `frame-114` | **(a)** The camera has just landed on Norway and the map is completely unlit — the entrance has not started. This is the frame that proves the entrance is triggered where the camera STOPS, not where it starts. |
| `frame-133` | **(a)** 19 frames later: Norway's border has drawn on (darker shade of its own bin colour) and the fill is blooming. Framing is pixel-for-pixel the same as `frame-114` — the camera has not moved. |
| `frame-177` | **(a)** Label + value risen (`NORWAY / 99%`), camera still. 26 frames (0.87 s) of readable stillness remain before the next move — the `AREAL_REVEAL_HOLD_S` knob's own arithmetic. |
| `frame-243` | **(b)** and **stays-lit**: the camera has landed on Sweden's frame and Sweden is still dark — nothing lit ahead of the camera. Norway, visited one beat ago, is still fully lit. |
| `frame-306` | Sweden's entrance complete (`SWEDEN / 68%`), Norway still lit beside it. |
| `frame-461` | **(b)/(c)** End of Germany's hold. Norway, Sweden and Germany lit; Poland is on screen and dark because the walk has not reached it yet; Britain and France are on screen and dark because they are not subjects of this walk. |
| `frame-590` | All four subjects lit and holding, no dimming anywhere. |
| `frame-645` | **(c)** The close: with the camera pulled back, the rest of the distribution washes in over the takeaway's own hold — Britain, France, Spain, Italy appearing in their bins. |
| `frame-719` | **(c)** Last frame. The four subjects keep their darker subject borders; the whole distribution reads; the takeaway caption states the gap. |

## Answers to the three reported defects

- **(a) Does the camera stay still while the border draws, the fill blooms and the label rises?**
  Yes — `frame-114` / `frame-133` / `frame-177` are one continuous still shot. It was NOT true before
  this lot: at frame 358 of the first explainer render (trigger at the beat's start), Germany's border
  had drawn most of the way round and its fill had bloomed 25 frames into a 39-frame camera glide.
- **(b) Does anything light up outside the frame?** No. Nothing lights except the subject of the beat
  the camera is currently on (`frame-243`, `frame-461`). The old sweep clock ran the whole length of
  the composition independently of the beats, which is what lit regions the camera was nowhere near.
- **(c) Is any region visible on screen that should be lit but is not?** During the walk, yes and
  deliberately — a region the walk has not reached is dark (`frame-461`), which is the device. At the
  end, no: the closing wash brings every data-carrying region in (`frame-645` → `frame-719`). Without
  it the last frame left Britain, France, Spain and Italy grey behind a takeaway about a north–south
  gradient they are half of, and on a choropleth grey means *no data*.

## Byte-identity

The same config **without** `sweepCarrier` renders byte-identical before and after this lot
(sha256 of `landscape.mp4`, 819 frames): `a584d6fbdd856f5f18a94c94044f004c8932bfe5ef8d5f63442b75b1423a1d56`.
