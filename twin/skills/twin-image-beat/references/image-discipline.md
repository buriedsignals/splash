# Image discipline

The rules a static image beat is written under. A photograph is not a chart: nothing here is
computed from the data, because there is no data — there is a picture the journalist took and the
words they wrote about it. Every rule below is about handling THAT honestly.

## Alt text and credit are not optional and cannot be derived

A photograph without alt text is unusable to a screen reader. A photograph without a credit is a
rights problem — the newsroom does not own the image, the photographer or the agency that took it
does, and printing it without saying whose it is is not a formatting omission, it is a legal one.

Neither field has a default and neither can be derived from the photo's own pixels — that is
exactly the "vision = matching + ordering ONLY, never captioning" boundary the sibling
`suggest-image` skill states for the orchestration layer above this one, and it holds here too, one
layer down: this skill does not look at a photograph and decide what it shows or who gets credit
for it. Both fields are required inputs, checked in one place — `imageBeatLayout` in
`assets/ImageBeatSeed.tsx` — and a missing one throws before a single pixel is drawn, naming which
photo (by its position and, once alt exists, by its own alt text) and which field. There is no
lower tier where the beat renders anyway with a blank credit line; the render simply does not
happen.

A caption is different and is NOT required by this rule. A caption is the journalist's own
sentence about what a photo means in the story — a photo can honestly need none, the way a chart's
subtitle can honestly be absent. Alt and credit are never optional; a caption can be.

## Aspect ratio: this skill letterboxes, never crops, never stretches

Three ways to fit a photograph of one shape into a box of another, and this skill takes exactly
one of them:

- **Stretch** distorts geometry — a face gets narrower or wider, a straight line stops being
  straight. It always lies, on every photo, regardless of content.
- **Crop** trims the frame — it does not distort what remains, but it silently discards whatever
  fell outside the kept region. Which part of a photograph to keep is a content decision: it can
  remove the one detail a caption is about, or the context that makes a scene legible. That is an
  editorial call, and this skill's whole premise (`SKILL.md`, Overview) is that editorial intent
  never leaves the journalist. A layout that crops on the journalist's behalf, without asking,
  breaks that premise quietly — the output looks fine and nothing in it says a decision was made.
- **Letterbox** (`fitBox` in `scripts/render-still.mjs`, `preserveAspectRatio="xMidYMid meet"` in
  the seed) fits the whole photograph inside the box, unmodified, and fills whatever the photo does
  not reach with the frame's own `grid` colour. It costs density — a portrait photo in a landscape
  box leaves visible bars either side — and it never lies: every pixel a reader sees is a pixel the
  camera actually recorded, undistorted, uncropped.

This skill's own sample render is the proof case for exactly this: `lot-2-during.png` is a portrait
photo (560×900) between two landscape ones (900×560), fitted into the same 820×420 box as its
neighbours. Rendered, it shows clean grey bars left and right — visibly, honestly narrower than the
other two frames' content — rather than a stretched crane or a cropped one. Look at
`assets/preview.png` or `output-proof/preview.png` for the actual render, not this description of
it: this discipline's own verification rule (below) applies here as much as anywhere else in this
twin.

## Colour and orientation

**Orientation: detected, never corrected.** A JPEG can carry an EXIF `Orientation` tag telling a
viewer to rotate or mirror the stored pixels before display — a photo taken with a phone held
sideways is common. `readOrientation`/`checkOrientation` in `scripts/render-still.mjs` read that
tag and throw if it is anything other than "normal" (`1`) or absent. They do not rotate the pixels.
Reading the tag is simple and reliable; correctly transforming all eight EXIF orientation values
— four rotations, four mirrored rotations — needs an image-transform library this skill does not
carry, and a rotation this skill got wrong would ship a photograph sideways with MORE apparent
confidence than a photo this skill simply refused. Detecting and refusing is the honest half of
this problem to close tonight. Correcting it is the other half, left open and named here, not
attempted half-built. The fix, when this throws, is on the journalist's side: re-export the photo
from whatever tool already displays it correctly (most do, by applying the same tag this skill
declines to act on) and supply that file.

**Colour profile: not managed, not converted.** A photograph can carry an embedded ICC colour
profile (Adobe RGB, ProPhoto RGB, a camera manufacturer's own) that a colour-managed viewer uses to
render its colours correctly. `resvg`, the rasteriser this whole twin uses, decodes an embedded
raster's own pixel values and paints them — it does not read or apply an ICC profile. A photo
authored in a wide-gamut profile can therefore render with shifted colours here relative to a
browser or an editor that honours the profile; a plain sRGB JPEG or PNG — the default a phone
camera and most cameras' JPEG output already produce — renders correctly, because there is no
profile to disagree about. This skill does not detect a profile, does not convert one, and does not
warn when one is present; it is stated here as a known, un-closed gap rather than left for someone
to discover by looking at a colour-shifted render and wondering why.

## Weight

A self-contained artifact with embedded photographs can grow enormous fast — this skill's own
output is a self-contained SVG with every photograph inlined as a base64 `data:` URI, and base64
itself costs roughly a third more bytes than the file it encodes on top of whatever the photos
themselves weigh.

`checkWeight` in `scripts/render-still.mjs` sums the RAW (pre-base64) bytes of every photograph a
beat is about to embed and throws before rendering if the total exceeds `WEIGHT_LIMIT_BYTES`
(20 MB). The error names every photo, largest first, with its own size, so a journalist knows
exactly which file to re-export smaller — a total with no names attached says there is a problem
but not which one to fix.

What this skill does NOT do at the limit: recompress or resize a photo on the journalist's own
behalf. That is the same call `imageBeatLayout` already declines to make for cropping, for the same
reason — how much quality to give up in exchange for a smaller file is an editorial judgement, not
a mechanical one, and a beat that silently degrades a journalist's photograph to fit under a limit
has made that judgement for them without saying so. The limit fails loudly instead; closing it
without a silent quality trade-off is a follow-up (an explicit `--max-dimension` re-export step the
journalist runs and approves, not one this skill runs on their behalf).

## Every layer earns its place

Same test `static-discipline.md` states for a chart: encode a photograph, carry its caption and
credit, or mark where a photo of a different shape does not fill its box — a layer doing none of
those comes out. There is no drop shadow, no rounded corner, no vignette; a frame around a
photograph that the photograph itself did not have is exactly the kind of unearned decoration
`static-discipline.md`'s own rule already forbids for a chart, and a photo beat inherits it without
needing its own restatement of the geometry.

## The closed palette applies to the furniture, not to the photograph

`deriveFurniture(ground)` still governs every colour this skill DRAWS — the ground, the title, the
caption ink, the credit's muted grey, the letterbox bars. It says nothing about the colours already
present INSIDE an embedded photograph, which are the photograph's own and are never touched,
recoloured, or filtered to fit a newsroom's palette. A photo of a red door stays a photo of a red
door regardless of the newsroom's own brand colour; the closed-palette rule protects the furniture
this skill invents, not the evidence a journalist supplied.

## Order is the journalist's, never re-sorted

The order photographs appear in this beat is the order they arrive in the `photos` array — never
re-sorted by file name, by size, by colour, or by any property this skill could compute. A before/
after/during sequence only reads as one if the story's own order survives; re-ordering it "more
sensibly" on the journalist's behalf is the same overreach cropping would be, one level up.

## Verification

Applied to the pixels, the same rule `static-discipline.md` states for a chart: grepping the
rendered SVG's markup for a hex, or for the presence of an `<image>` tag, proves neither that the
photo is undistorted nor that its letterbox bars land where the arithmetic says they should. Open
`assets/preview.png` (or a real beat's own render) and look at it — specifically at whichever photo
does not share the others' aspect ratio, because that is the one frame where a layout that only
works on tidy, matching inputs shows itself.
