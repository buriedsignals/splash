# The seed, and what it is not

`assets/ImageBeatSeed.tsx` carries `REPLACE ME. Do not parameterise me.` on its first line. That
line is the whole contract. What follows says why, and what to keep when you throw the file away.

## What it is

One static image beat, written out end to end, so the next beat can be written from scratch in the
same shape:

```
the journalist's own photos -> one consistent box, letterboxed -> the journalist's own words
(title, per-photo caption, alt, credit) -> nothing generated, nothing interpreted
```

Three things, in that order, are the anatomy. Everything else in the file is this seed's own corner
lot.

**① The journalist's own photos, untouched.** `imageBeatLayout` takes a `PhotoInput[]` — a
`dataUri`, an intrinsic size, an `alt`, a `credit`, an optional `caption` — and never asks a
photograph anything about itself beyond its own pixel dimensions (needed for the box math, not for
its content). It does not look at what is IN a photo. That is `suggest-image`'s job, one layer up,
and it stops at matching and ordering — never captioning (`references/image-discipline.md`, "Alt
text and credit").

**② One consistent box, letterboxed.** `fitBox` (in `scripts/render-still.mjs`) answers where an
intrinsic-sized photo lands inside a fixed box without cropping or stretching it. Every photo in a
beat gets the SAME box — same width, same height — whatever its own aspect ratio, so a reader can
compare frame to frame without the box itself shifting the comparison.

**③ The journalist's own words, and nothing this skill added.** A title, and per photo: a required
alt, a required credit, an optional caption. No word in the rendered frame was written by this
skill — every string a reader sees came in as a prop.

## What it is not

- **Not an image gallery.** There is no `layout="grid"` and there will not be one. A beat that
  needs a grid instead of a stack, a different box shape, or a fourth photo writes its own
  component, the same rule `twin-chart-beat/references/seed-anatomy.md` states for a second series.
- **Not a captioning tool.** `imageBeatLayout` throws on a missing alt or credit; it never invents
  one, and it never derives a caption from a photo's own pixels. Vision, in this project, matches
  and orders — it does not write prose about what it sees (`suggest-image`'s own boundary, restated
  here one layer down because this skill is exactly where a shortcut would be easiest to take: the
  photo is right there, in memory, decoded).
- **Not a place for story content.** The 900px frame width and the 420px box height are this
  seed's own tuned numbers, not the story's. The next beat is not necessarily three photos of a
  lot; it edits the constants and the `PhotoInput[]` it is handed, because it edits the file.

Replacing the seed per story is the expected behaviour, not a shortcut. The knowledge that has to
survive lives in `references/`, not in props.

## The props it does take

`photos`, `title`, `ground`. `photos` is an array the caller has ALREADY resolved from files —
`dataUri`/`intrinsicWidth`/`intrinsicHeight` come from `readImageMeta`/`toDataUri`, called once, by
`scripts/render-preview.mjs`'s own seed runner (a real beat's own runner does the same, from its
own files). The component itself never reads a file and never calls the rasteriser's own file-I/O
helpers — the same "geometry and paint in here, I/O out there" split `ChartSeed.tsx` keeps, drawn
one step earlier because a photo, unlike a chart's own numbers, starts life as bytes on disk.

None of the three props selects a behaviour. That is the line between an input and a parameter.

## The seed's own layout decisions, and why

- The frame's HEIGHT is derived from the content, not fixed — see `imageBeatLayout`'s own
  doc-comment in `assets/ImageBeatSeed.tsx`. A photo essay is as tall as its own captions make it;
  a fixed height would either clip a long caption or waste space under a short one, unlike a chart's
  fixed frame, which absorbs a wrapped title in the padding instead of growing.
- The box is filled with `grid` before the photo is drawn into it — a photo whose own aspect ratio
  does not fill the box leaves a visible, explained bar of frame colour, never an unexplained gap of
  raw ground the same colour as the page around it.
- `role="img"` + `<desc>` sit on the `<g>` wrapping each photo, not on the `<image>` element itself
  — an `<image>` cannot carry a `<desc>` child in the SVG content model, and the group is what a
  screen reader, or a reader who opens the `.svg` file directly rather than the rasterised `.png`,
  actually reaches.
- Caption and credit are two separate lines, in that order, because they answer two different
  questions — the same "a subtitle answers what, a source answers where from" split
  `static-discipline.md` states for a chart's own header block. A caption that also carries the
  credit, or a credit that tries to double as a caption, answers neither question fully.
