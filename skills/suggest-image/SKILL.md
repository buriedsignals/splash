---
name: suggest-image
description: Use when a journalist has a NARRATIVE claim (a place, a process, a before/after, a sequence of scenes), their OWN images (photos, satellite, archives), and the chart data test fails — orchestrates an image-scrolly. Matches each image to its article passage (vision = matching + ordering ONLY), derives captions from the matched passages, collects alt + credit from the journalist, and emits the image-story.json manifest behind a MANDATORY veto gate; skills/image-native then produces the scrolly deterministically. Keywords image scrolly, photo sequence, satellite, before after, evidence one frame at a time, image-native, crossfade, captions, alt text, photo credit.
---

# suggest-image — orchestrate a journalist-supplied image sequence

## Overview

The ② orchestration skill of the **image-native** engine (spec:
`docs/superpowers/specs/2026-07-10-image-scrolly-design.md`). A journalist brings a narrative
text block + a folder of their own images; this skill proposes an **ImageStory** — order,
article-derived captions, key frame — that the journalist confirms or edits on a mandatory
gate, then hands the manifest to the deterministic engine (`skills/image-native`). v1 builds
the **scrolly** format only (static/video are follow-ups); a scrolly is interactive-family, so
the channel must be **article-web**.

## When to use

- `suggest-chart`'s Image-scrolly recognition rule (C5) fired: the claim is narrative, the
  data test failed (< 3 usable numbers), and the journalist kept the image-scrolly candidate.
- Or the journalist directly asks for a photo/satellite sequence advancing on scroll.
- Requirements to proceed: **3–6 images** (the embedded-scrolly floor/cap), the article text,
  and — per image — an **alt** and a **credit** supplied by the journalist (collected below).

## The gotcha — splash NEVER generates images or editorial text

Non-negotiable (spec §2 non-goals):

- **No image generation**, no retouch, no upscale.
- **Vision is used for matching + ordering ONLY** — "which article passage does this image
  belong to?" — an appariement task, never a description task. The **words** of every caption
  come from the matched article passage (rephrased self-contained, never verbatim), never
  from what the model "sees".
- **`alt` and `credit` are asked for, never generated.** `alt` (what is VISIBLE, WCAG 1.1.1)
  is journalist-supplied and must differ from the caption; `credit` is the per-frame photo
  attribution. Missing either → ask before composing the manifest, never fill in.
- Nothing is produced before the journalist confirms the proposal on the gate below — it is
  the ONLY correctness control for order + captions (nothing deterministic verifies them).

## Architecture

```
journalist images + article        ② suggest-image (THIS skill, vetoable)      ③ image-native (deterministic)
──────────────────────────        ───────────────────────────────────────     ──────────────────────────────
imageDir + alt/credit per image → vision: match each image ↔ article passage → produce.mjs scrolly:
article text                       → propose order + captions + keyFrame        conformance → prep-images
                                   → MANDATORY GATE (confirm/edit/cull)          → skills/scrolly build
                                   → image-story.json                            → scrolly.html (self-contained)
```

The schema + conformance live in `skills/image-native/src/image-story.ts`
(`ImageStory`, `checkImageConformance`); the renderer is `skills/scrolly/src/ScrollyImage.tsx`
(crossfade, per-frame credit, alt on every `<img>`, `prefers-reduced-motion` → hard cut).

## How it works

1. **Collect the inputs.** The image folder (`imageDir`), the article text, and per image:
   `alt` (what is visible) + `credit` (name; url/licence optional). Any missing alt/credit →
   ask the journalist for it now. Also confirm `source` (the ARTICLE/DATA provenance — a
   different axis from the per-frame photo credit) and the module `title` (the insight) +
   `description` (what/when/where).
2. **Match and order (vision, scoped).** Look at each image only to answer: *which passage of
   the article talks about this?* From the matches, propose the narrative order and the
   `keyFrame` (the single frame that carries the story — feeds the static export later).
   - **Cull, vetoable**: more than 6 images → propose the best 3–6 for the story and SURFACE
     the dropped ones by name (never a silent truncation).
   - **Unmatched image**: surface it — « je ne rattache cette image à aucun passage :
     légende-la toi-même ou retire-la » — never auto-dropped, never auto-captioned.
3. **Derive the captions.** Each caption answers *what does this image prove in the story?*,
   rephrased self-contained from the matched passage — never a verbatim excerpt. Record the
   matched passage as the frame's `sourcePassage` (required; the engine's overlap tripwire
   compares caption ↔ passage and fails a copy). Inherits the `prose-provenance` discipline
   (`2026-06-27-prose-extracted-provenance-design.md`).
4. **★ GATE — MANDATORY, non-skippable (mirror Gate 1b's confirm-back).** Present, per frame:
   the image, its proposed position, its caption, and **the matched passage it came from** (so
   a bad match is caught before rendering), plus the cull list if any. Ask explicitly:
   « Voici l'ordre et les légendes que je propose — confirme, corrige ou retire des images
   avant que je produise quoi que ce soit. » Then CONFIRM BACK what was decided (order +
   captions + kept frames) and get an explicit yes. Never proceed on silence; never treat the
   proposal itself as approval. The journalist's edits win verbatim.
5. **Emit `image-story.json`** (the `ImageStory` shape — title, description, source, frames
   with id/frameRef/caption/alt/credit/sourcePassage, keyFrame, fit, lang, imageDir).
   Self-check: run `checkImageConformance(story, { format: "scrolly" })` and fix every
   violation (3–6 frames, alt ≠ caption, credit present, sourcePassage present, overlap under
   threshold).
6. **Produce** (after the gate only):
   `bun skills/image-native/scripts/produce.mjs <image-story.json> <outDir> scrolly`.
   Any other format exits 1 (v1 is scrolly-only). On the splash spine the accepted proposal
   carries `producer: "image-native"`, `format: "scrolly"`, `channel: "article-web"`, and the
   manifest as its spec — the validate gate re-runs the same conformance.

## Quick start

```bash
# 1. after the gate: manifest confirmed by the journalist
bun skills/image-native/scripts/produce.mjs exports/<slug>/image-story.json exports/<slug>/canal scrolly
# → exports/<slug>/canal/scrolly.html (self-contained: frames inlined as data URIs)
```

## Tuning knobs (each = one number)

- **frames floor/cap (scrolly)**: 3 / 6 (`FRAME_FLOOR`/`FRAME_CAP`, image-story.ts)
- **captionOverlapThreshold**: 0.6 (bigram containment, `checkImageConformance` opts)
- **fit default**: `canvas-frame` (contain + matte — zero content loss; `crop` is per-frame opt-in)
- **cropDiscardThreshold**: 0.30 (warn when a crop throws away more)
- **jpeg quality**: 82 (prep-images.mjs)
- **maxInputDimension**: 12000 px (prep fail-hard guard)

## Files

- `skills/suggest-image/SKILL.md` — this orchestration procedure (②)
- `skills/image-native/src/image-story.ts` — schema + conformance + `imageStoryToChapters` (③, pure)
- `skills/image-native/scripts/prep-images.mjs` — deterministic prep (fit/sRGB/strip/report)
- `skills/image-native/scripts/produce.mjs` — single-format entry (scrolly v1)
- `skills/scrolly/src/ScrollyImage.tsx` — the crossfade renderer (visual:"image" track)
