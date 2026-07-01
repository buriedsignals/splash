# Video map — storytelling sub-format

> Cross-cutting video discipline (frame-determinism, `--gl=angle`, 3 ratios, furniture-per-ratio)
> lives in `video.md`. This doc covers ONLY what is specific to the storytelling sub-format.
> For the camera-mode taxonomy, see `../camera-modes.md`.

## What a storytelling video is

A storytelling video is a **guided camera tour**: the camera moves between distinct geographic
beats, each one pausing on a feature (a region, a city, a point) with a callout that names
and quantifies it. The full-extent hold at the end consolidates the spatial argument.

Use it when the story is "let me take you somewhere" — when the article identifies specific
places that matter and wants the reader to feel their spatial relationship. The canonical
beat arc (Amini et al. 2015 — event / intent / progress / resolution) maps cleanly to:

```
title card → establish → reveal ×N → takeaway
```

Do NOT use this format when the story is "here is the distribution / here is the magnitude".
That is a single, readable beat — use the simple reveal format (`video-reveal.md`) instead.
(FT Visual Vocabulary — magnitude and distribution encodings are read at-a-glance; a guided
tour adds visual overhead that the story does not need.)

## Beat structure

Beats are a **pure `Beat[]` array** produced by `deriveMapStory` (choropleth) or
`deriveSymbolStory` (proportional symbol). Each element carries the feature key, the callout
text (name + value + unit), and the target camera extent.

Beat sequence:

| Beat | Camera state | Data state |
|------|-------------|------------|
| Title card | — | blank |
| Establish | Fits the full data extent | Data fades in (no callout) |
| Reveal ×N | Flies to each feature's extent | Feature callout appears |
| Takeaway | Returns to full data extent | All features visible, callout cleared |

The ordering within the reveal beats is an editorial choice made by the AI: one hero feature
first, then supporting features in descending importance (consistent with FT Visual Vocabulary's
guidance on hierarchy — the primary point is established before supporting evidence).

## Frame-deterministic camera

**Camera position is a pure function of the frame index — `buildTimeline` + `cameraForFrame`.**

`buildTimeline` converts the `Beat[]` into a flat frame schedule: for each beat, a move
segment (duration proportional to angular distance) followed by a hold. `cameraForFrame(f)`
reads from that schedule and returns a `{center, zoom}` pair.

The render loop calls `map.jumpTo(cameraForFrame(f))` — **never `map.flyTo`**. `flyTo` is
time-based and non-deterministic inside a render loop; it must not appear anywhere in the
storytelling path. (Remotion frame-determinism discipline, Tom Vaillant — every camera
position is `f(frame)`; non-deterministic renders fail the frame-hash comparison.)

## Camera choreography

**Ease every camera transition with `easeInOutCubic`. Minimum move duration ≈ 1.2 s (~36
frames at 30 fps). Hold at each reveal beat ≈ 3 s (~90 frames at 30 fps).**

The in-out cubic ease (Disney twelve basic principles of animation; Chang & Ungar 1993)
accelerates gently from rest and decelerates symmetrically into the hold. A move shorter
than 1.2 s reads as a jarring cut rather than a deliberate pan; the reader loses spatial
orientation (consistent with NN/g guidance on animation purpose — motion should help users
understand spatial change, not startle them).

The 3 s hold is the minimum for a reader to parse the callout (name + value + unit) and
locate the feature on the map. (Amini et al. 2015 — the hold is the "progress" beat;
short holds lose the narrative thread.)

## Callouts

**Callouts are anchored ON the feature, not offset to a corner of the frame.**

- Choropleth beat: anchor at the region centroid (`centroidByKey`).
- Proportional symbol beat: anchor at the point itself.
- Content: name + value + unit. No editorial prose in the callout (consistent with FT Visual
  Vocabulary's guidance on annotation economy — the callout names the thing, the voiceover
  or caption carries the argument).

**No dimming of non-highlighted features.** All features remain at their full opacity through
every reveal beat. Dimming creates a "spotlight" effect that implies the other data is less
trustworthy — a stable frame reads as more authoritative. (FT Visual Vocabulary — a stable
frame of reference; the data, not the camera effect, carries meaning.)

## Reveal count — AI-controlled

**The AI picks how many reveal beats to include per article. Default: one hero + top features,
bounded to keep the total video under a comfortable length.**

Guidelines:
- Minimum: 1 reveal beat (the hero feature alone is a valid story).
- Practical ceiling: 4–5 reveal beats before the takeaway; beyond that the clip outstays its
  welcome on social and the reader disengages. (NN/g — users stop watching short-form video
  before the content finishes if it runs long; keep it tight.)
- For choropleth: the AI ranks regions by absolute value or deviation from median.
- For symbol: the AI ranks cities by the metric value, taking the top-N that fit within the
  bounded count.

## Furniture

Title overlay and source line, as per `video.md` § Furniture — baked and ratio-aware.
Additionally, a **title card** (animated intro slide, first beat) precedes the establish beat.
The title card is the only furniture addition over the simple-reveal format.

## Sources (by name)

- **Amini et al. 2015** — data video grammar; EIPR beat arc (establish/climax/resolution);
  hold duration as the "progress" beat; closing summary beat
- **FT Visual Vocabulary** — hierarchy (primary point before evidence); annotation economy;
  stable frame of reference; magnitude/distribution framing
- **NN/g** — animation purpose (motion aids orientation, not spectacle); short-form video
  engagement length
- **Disney twelve basic principles of animation** — ease-in / ease-out principle
- **Chang & Ungar 1993** — in-out cubic easing for animated transitions
- **Remotion frame-determinism discipline** (Tom Vaillant) — `f(frame)` render contract;
  `jumpTo` not `flyTo` in the render loop

## Enforcement

- `scripts/audit-story.mjs` — render-free gate: validates `Beat[]` structure, checks that
  every beat has a target extent and a callout (reveal beats only), asserts `jumpTo` (not
  `flyTo`) in the camera plan. Runs for both `deriveMapStory` and `deriveSymbolStory` paths.
- `tests/symbol-story.test.ts` — unit tests for `deriveSymbolStory`: beat ordering, reveal
  count bounds, callout content (name + value + unit present).
- Render gate `produce … story` — renders frame 0 (title card), mid-reveal still, and final
  takeaway still; asserts callout visible in mid-reveal, full-extent camera in takeaway.

---

The camera movement in this format is the `guided-tour` mode. For the full camera-mode
taxonomy (including `simple` and the forthcoming `route-reveal`), see `../camera-modes.md`.
