---
id: image-scrolly
engines:
  image-native: image-scrolly
intent: [spatial, change-over-time]
shape: narrative
limits: { minPoints: 3, maxPoints: 6 }
formats: [scrolly]
bestFor:
  - "a place or an object the reader should look at while the text explains it"
  - "a sequence of 3-6 frames where each one is a step of the same argument"
notFor:
  - "anything whose message is a quantity — an image cannot be measured"
  - "images the newsroom does not have the rights to publish"
---

# Image scrolly — per-type best practice

> Source: the engine's own design, `docs/superpowers/specs/2026-07-10-image-scrolly-design.md`.
> Inherits the interactive-web discipline (reflow, keyboard, `prefers-reduced-motion`) in
> `knowledge/references/formats/interactive.md`.

An image scrolly pins a photograph (or a sequence of them) and advances it as the reader
scrolls: a crossfade between frames, one editorial beat per frame. The pictures carry the
observation; the text carries the claim — splash formats and sequences the images, it never
generates them.

## When to use / when NOT

- **Use** for: a place or an object the reader should look at while the text explains it — a
  single portrait, or a sequence where each frame is one step of the same argument.
- **Use** for: a 3–6 frame sequence advanced by scroll, one editorial beat per frame. A
  two-frame before/after crossfade is a **future, separate format** (design spec §2) — this
  engine's scrolly floor is 3 frames, not 2.
- **Not** for: anything whose message is a quantity — an image carries no data to explore or
  measure. The engine's grid is `static + video + scrolly`; there is no interactive
  pan/zoom/hover format, because there is nothing to explore.
- **Not** for: images the newsroom does not have the rights to publish — every frame requires a
  credit, and the caption is not a substitute for it.

## Correctness

1. **Every frame carries its own `alt` and `credit`, distinct from its caption.** `alt` describes
   what is seen (journalist-supplied, never vision-generated); `caption` is what the frame proves
   in the story (article-derived from the matched passage). The two must not collapse into one
   string. `checkImageConformance` returns a violation string for a missing/blank `alt`, an
   `alt` equal to the `caption`, or a missing `credit.name` — the producer refuses to render
   while that list is non-empty.
2. **Scrolly ships 3–6 frames.** Below the floor there is no narrative arc to advance through;
   above the ceiling the orchestrator's cull must surface and trim the excess before the manifest
   reaches this engine — never a silent truncation here.
3. **`prefers-reduced-motion` is a hard-cut, not a slower fade.** The frame transition is a knob
   (`crossfade` | `direct-cut`); under the reduced-motion media query the direct-cut is the honest
   fallback, not a gentler animation.
4. **A caption may never sit too close to the source passage it was derived from.** Every
   article-derived caption carries a `sourcePassage`; a normalised token-overlap (Jaccard/shingles)
   above the configured threshold is a tripwire, not a style note — the caption's words are
   proposed by the orchestrator, not rendered deterministically from data the way a chart or map
   label is, so the anti-copy guard is the only mechanical check standing between the source text
   and a near-verbatim caption.
