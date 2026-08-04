---
name: image-native
description: The image engine — turns a journalist-validated image-story.json plus their OWN photographs into a self-contained image scrolly, deterministically. ZERO vision and ZERO generated text live here: the matching, the ordering, the captions and the alt come from suggest-image, behind its mandatory veto gate; this engine normalizes the frames to one box and builds the scroll. v1 ships the scrolly format only. Reach it through suggest-image unless you already hold a gated manifest. Keywords image scrolly, photo sequence, crossfade, frames, satellite, before after, archive photographs, prep, sRGB, EXIF, alt text, photo credit, self-contained html, image-story.json, deterministic producer.
---

# image-native — the image engine

## Overview

The third engine, alongside `chart-native` and `map-native`. Where they draw **data**, this one
sequences **photographs the newsroom already owns** — a place before and after, a process in four
scenes, an archive series — and hands the reader one frame at a time as they scroll.

It is deliberately the dumbest engine in the repo. It has **no vision model, no text generation and
no `.tsx` components of its own**. Every editorial judgement — which image answers which passage, in
what order, what the caption says, what the alt describes, who is credited — is made upstream in
`suggest-image` and validated by the journalist at a **mandatory veto gate**. What arrives here is a
manifest that has already been approved. This engine's whole job is to make that manifest render the
same way every time.

## When to use it

Use it when a claim is **narrative and visual** — a place, a process, a before/after, a sequence of
scenes — the journalist has their **own** images, and the chart data test fails (there is no series
to plot).

**Route through `suggest-image`, not through here.** That skill holds the journalist contract: it
matches images to article passages, orders them, derives the captions, collects alt and credit, and
puts the whole thing behind a veto gate before anything is built. Calling this engine directly is
legitimate **only when you already hold an `image-story.json` that a journalist has approved** — a
re-render, a format change, a repair. It is not a shortcut around the gate: a manifest that never
went through one will simply fail conformance below, because the fields the gate collects are the
fields conformance requires.

Do **not** use it to illustrate an article with stock or generated imagery. The engine refuses
nothing on provenance — that is `suggest-image`'s and the journalist's call — but the format only
makes sense as *evidence*, one frame at a time.

## The gotcha

**v1 builds `scrolly` and nothing else.** Any other format exits 1 with a stated message. `static`
and `video` are follow-ups whose conformance floors already exist in the code (1 and 2 frames
respectively) and are unreachable from the CLI; `interactive` is a **non-goal** — an image sequence
has no data to explore.

The second gotcha follows from the first: an image scrolly is an **embedded module**, so it is capped
at **6 frames**. A story that arrives with more is refused rather than silently truncated — the cull
belongs upstream, where a human can choose which frames go.

## Architecture

```
journalist images + article
        │
        ▼
② suggest-image ──── vision: matching + ordering ONLY ──── MANDATORY veto gate
        │
        │  image-story.json (approved)
        ▼
③ image-native (this skill, deterministic)
        │
        ├── src/image-story.ts     schema + conformance + imageStoryToChapters (pure)
        ├── scripts/prep-images.mjs   every frame → ONE box, sRGB, EXIF baked, metadata stripped
        └── scripts/produce.mjs    → delegates the scroll scaffold to skills/scrolly
                                      (frames inlined as data URIs → one self-contained html)
```

The engine **never re-implements the scroll**. `skills/scrolly` owns the scaffold, the `chapters[]`
storyboard and the step dispatcher; `image-native` supplies a `visual: "image"` config and the
prepared frames. The single gesture is a **crossfade** between the active and previous frame,
rendered by `scrolly`'s `ScrollyImage.tsx` — 600 ms, dropped to a hard cut under
`prefers-reduced-motion`.

## How it works

1. **Conformance, fail-hard, before any work.** `checkImageConformance(story, { format })` returns
   violations as prose and the producer exits 1. It refuses, among others: fewer than 3 frames for a
   scrolly or more than 6; a `keyFrame` out of range; a duplicate or empty frame id; an id that is
   not a safe slug, **because the id becomes an output filename**; a `frameRef` that is absolute or
   contains `..`, **because it is resolved under the image folder** and a traversal in an
   LLM-composed manifest is an arbitrary read primitive; an empty caption; an empty alt; an alt that
   merely repeats its caption (alt describes what is *visible*, the caption states what it *means*);
   a missing credit; and a caption that is a **pasted article passage** rather than a written one.
2. **Prep.** `prep-images.mjs` writes `frames/<id>.jpg` in story order, every frame at exactly the
   same box so a crossfade never jumps, plus a `prep-report.json`. It bakes EXIF orientation, outputs
   sRGB and **strips metadata**. The default fit is `canvas-frame` (contain, on a matte derived from
   the story theme) because a blind crop distorts editorial meaning; `crop` is an explicit per-frame
   opt-in and warns loudly when it discards too much.
3. **Build.** `produce.mjs` hands the assembled config to `skills/scrolly`, which inlines the frames
   as data URIs, then asserts a non-empty `scrolly.html` exists. The output is one self-contained
   file the newsroom owns.

Everything after the gate is **deterministic**: same manifest and same images in, same bytes out. No
`Date.now()`, no randomness.

## Quick start

```bash
# The normal path — the journalist never types this; suggest-image runs it after its gate.
bun skills/image-native/scripts/produce.mjs exports/<slug>/image-story.json exports/<slug>/out scrolly

# Prep alone, to inspect the normalized frames without building.
bun skills/image-native/scripts/prep-images.mjs exports/<slug>/image-story.json /tmp/prep
```

`produce.mjs` takes the same `<config> <outDir> <format>` shape as every other engine, so the splash
dispatcher routes an accepted `image-native` proposal to it with no special case.

## Tuning knobs

Each is one number, and each is in `scripts/prep-images.mjs` unless stated.

| Knob | Value | What it decides |
|---|---|---|
| `TARGET_WIDTH` | 1200 | the article-web media box width every frame is normalized to |
| `TARGET_HEIGHT` | 675 | its height — one box for all frames is what keeps a crossfade from jumping |
| `JPEG_QUALITY` | 82 | the photographic-web quality floor; lower it and gradients band |
| `MAX_INPUT_DIMENSION` | 12000 | px, above which an input is refused rather than resized forever |
| `CROP_DISCARD_THRESHOLD` | 0.3 | the share of a frame a `crop` may discard before it warns loud |
| `FRAME_FLOOR.scrolly` | 3 | fewer frames is not a sequence (`src/image-story.ts`) |
| `FRAME_CAP` | 6 | the embedded-module ceiling; cull upstream (`src/image-story.ts`) |

## Files

- `src/image-story.ts` — the `ImageStory` schema, `checkImageConformance`, and
  `imageStoryToChapters` (pure, no I/O)
- `src/format-support.ts` — the v1 format allow-list and the message a refused format prints
- `src/manifest.ts` — self-registers the producer with the shared registry (`formats: ["scrolly"]`,
  type `image-scrolly`, gesture `crossfade`)
- `scripts/prep-images.mjs` — the deterministic prep layer
- `scripts/produce.mjs` — the single-format entry point
- `tests/` — `image-story.test.ts`, `prep-images.test.ts`, `produce.test.ts`
- `output-proof/` — `scrolly-step-before.png`, `scrolly-step-after.png`: two steps of a real build
