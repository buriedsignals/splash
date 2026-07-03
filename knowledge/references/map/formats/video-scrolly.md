# Video map — scrolly sub-format

> Cross-cutting video discipline (frame-determinism, `--gl=angle`, 3 ratios, furniture-per-ratio)
> lives in `video.md`. This doc covers ONLY what is specific to the scrolly-as-video sub-format.
> For the camera-mode taxonomy, see `../camera-modes.md`.

## What a scrolly video is

A scrolly video is an **interactive map-scrolly captured as a deterministic MP4**: the same
`ScrollyStory` that drives the interactive step-by-step experience is replayed frame-by-frame
via Remotion, producing a self-contained video with no browser interaction required.

Use it when the piece is **scroll-native** — when the editorial voice is a sequence of step-by-step
captions that annotate the map one beat at a time, rather than a cinematic travelling shot. The
scrolly is the primary artefact; the video is its sharable, embeddable twin.

Do NOT use this format when the story calls for a guided camera tour between named geographic
places — that is the storytelling format (`video-storytelling.md`). Do NOT use it when the
story is a single readable distribution — that is the simple reveal (`video-reveal.md`).
(FT Visual Vocabulary — the encoding choice dictates the format; a scrolly adds step-by-step
narrative overhead that a plain reveal does not need.)

## Shared content — `ScrollyStory`

The scrolly video consumes the **exact same `ScrollyStory`** as the interactive scrolly:

- **Choropleth + symbol** — story derived via `mapStoryToChapters(layout, features, joinKey, meta)`
- **Route** — story derived via `routeStoryToChapters(layout, meta)`
- **Locator** — story derived via `deriveLocatorStory(markers, meta, opts?)` → `mapStoryToChapters`.
  Two regimes: few-annotated (one beat per PLACE, caption = marker `note`) and categorized (one
  beat per CATEGORY, caption = `"<category> — N sites"` + rank descriptor). Overview and takeaway
  steps are visual-only (no panel); reveal steps carry the panel.

Each `ScrollyStep` carries `{ prose, align?, action, ref }` — `prose` is the panel content, and
`ref` is the beat index (flyTo) or territory index (drawTo) used to drive the map. No separate
video-only content is authored.
This is the core contract: one narrative, two expressions (interactive scroll; frame-deterministic MP4).

## Narrative structure — overview at both ends

Every scrolly opens and closes on the **whole dataset** so the reader sees all the data before
and after the beat-by-beat reveals: `[title] → [OVERVIEW] → [reveal × N] → [TAKEAWAY]`.
`mapStoryToChapters` keeps the `establish` beat as the opening overview and always keeps the
`takeaway` beat as the closing overview; `routeStoryToChapters` adds an overview step (before the
draws) and a takeaway step (after).

On the **video**, the overview + takeaway are shown as **visual establishing/closing shots, not
text panels** — the map holds the full extent with every region painted / every symbol / all
crossed territories visible, and the furniture (title + description) carries the words. Choropleth
and symbol render **no panel** on those two steps; the route **overview tints all crossed
territories** (route not yet drawn) and the route **takeaway** keeps a data-tied summary panel
(e.g. "3 territories, 2,755 km"). Text panels otherwise appear only on the per-beat reveal steps.

**Reveal is synced to its panel.** Each reveal step's data emphasis (choropleth highlight, symbol
emphasis, route territory fill + border + draw) ramps in on the **same frame window** as that
step's panel slide-in — the data appears exactly when its caption arrives, never offset.

## Look

A scrolly video has two regions:

| Ratio | Panel position | Panel width |
|-------|---------------|-------------|
| Landscape 1280 × 720 | Side column (left or right, per `align`) | hugs its text (`fit-content`), capped at a max column |
| Square 1080 × 1080 | Bottom card | hugs its text, capped at a max card |
| Portrait 1080 × 1350 | Bottom card | hugs its text, capped at a max card |

The panel box **fits its text** (never an oversized band around a short caption), anchored per side
(left edge for `left`, right edge for `right`, centred otherwise) so it stays put as it resizes.

The **map is pinned** and reacts per step. The **prose panel slides in** (from off-screen on
the `align` side, or from the bottom for square/portrait), **pins** while the step plays, then
**slides out** to let the next step slide in. This slide-in → pin → slide-out rhythm is the
primary motion; the map is secondary animation underneath.

The `align` field on each `ScrollyStep` is honoured in landscape (left/right column), ignored
in square/portrait (always bottom card).

## Per-type map actions

### Choropleth + symbol — `flyTo`

Each step triggers a **`flyTo`** to the beat's target extent: the camera animates (ease
in-out) to frame the region or point of interest for that step. This is the same beat
camera the storytelling guided-tour uses, now driven by the scrolly step index rather
than a `buildTimeline` frame schedule.

`flyTo` here is a **pure `f(frame)` implementation** — the camera position is computed
deterministically from the current frame within the step, using eased interpolation.
It does not call the MapTiler SDK's async `map.flyTo()`. (Remotion frame-determinism
discipline — every state is `f(frame)`; SDK-level async transitions must not appear in
the render loop.)

### Route — `drawTo`

Each step triggers a **`drawTo`**: the electric route line **draws through** the territories
crossed up to and including the current step, one territory at a time. As the line crosses
each territory boundary:

- The territory fill and border animate in.
- The draw-head (the animated electric tip) advances along the line geometry.

**On-map country labels are intentionally omitted.** The prose panel names the territory at
each step — a redundant label over the map would compete with the panel text. (FT Visual
Vocabulary — annotation economy; the panel carries the argument, the map carries the geometry.)

The `ScrollyStep.ref` field holds the **territory index** for route steps — the draw head
stops at the segment end for territory `ref`.

**Editorial notes per territory.** A route step's panel text is the territory's `note` when the
config provides one (`territories[].note`), else the territory label. This lets the journalist
write a real caption for each crossing ("In Arunachal Pradesh the river becomes the Brahmaputra…")
while unnamed territories fall back to their label. The on-map country labels stay omitted — the
panel is the single place the territory is named.

## Frame-determinism

The scrolly video is **pure `f(frame)` throughout** — Remotion's render contract. Within each
step's frame range, the panel slide and map state are computed from the frame offset alone:

```
stepSlide(frame, phases, i, fps, total) → slide fraction
```

`scrollyFrames(stepCount, fps)` computes the total duration. The compositions are
`MapScrolly` (1280×720), `MapScrollySquare` (1080×1080), `MapScrollyPortrait` (1080×1350).

No wall-clock, no `Date.now()`, no `Math.random()` anywhere in the scrolly path.
(Remotion frame-determinism discipline, Tom Vaillant.)

## Produce format

`produce.mjs <config.json> <outDir> scrolly` emits `scrolly-{landscape,square,portrait}.mp4`
and a `PRODUCE_RESULT` JSON with a `scrolly: { landscape, square, portrait }` block.

Format coverage by type:

| Type | static | reveal | story | scrolly |
|------|--------|--------|-------|---------|
| Choropleth | ✓ | ✓ | ✓ | ✓ |
| Symbol | ✓ | ✓ | ✓ | ✓ |
| Route | ✓ | — | ✓ | ✓ |
| Locator | ✓ | ✓ | ✓ | ✓ |
| Dot density | ✓ | ✓ | ✓ | ✓ |
| Hex-grid | ✓ | ✓ | ✓ | ✓ |
| Cartogram | ✓ | ✓ | ✓ | ✓ |

`all` includes `scrolly`. Route gains `scrolly` alongside `story` (route has no simple-reveal in
the narrated sense; its only video formats are `story` and `scrolly`).

## Conformance

`checkScrollyConformance({ story, territoryCount })` validates the derived scrolly story as a
contract gate at authoring time: every step must have non-empty `prose`; `ref` must
be in range; the action must be `flyTo`/`drawTo`; territory count (route) must be consistent. It is exercised in the test suite — it
does NOT run inside `produce.mjs` at render time (consistent with all other map-native conformance,
which is test-only).

## Sources (by name)

- **FT Visual Vocabulary** — annotation economy; encoding choice dictates format; stable frame
  of reference; the path is the primary encoding for linear geographic stories
- **Remotion frame-determinism discipline** (Tom Vaillant) — `f(frame)` render contract;
  no SDK-level async transitions in the render loop; `--gl=angle --concurrency=1`
- **data-to-viz** — credit source data; encoding choice grounded in data type and story intent
