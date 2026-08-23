---
size: landscape
type: photograph sequence
---

# Beat 1 — the crater floor, three times in twenty months

**Medium/format:** image / static. **Channel:** article web — **size: landscape (1920 x 1080)**,
**destination: screen**. Slot 1 of `STORYBOARD.md`, treatment `Photograph sequence`.

## Claim

Three photographs from the observatory's own record show the floor of Halemaʻumaʻu being rebuilt
from below: the same fixed webcam is looking into a far shallower crater after fifty fountaining
episodes than it was at the first, and the two later frames show the resurfacing still under way.
The arithmetic beside them — 60% of the 2018 collapse volume filled, the floor 490 m higher, the
vents still 65 m below the rim — is the observatory's, quoted, not computed here.

## The photographs, in the desk's order

| file (frozen manifest) | date | intrinsic (as re-exported) | aspect | alt in `source/data.csv` | credit in `source/data.csv` |
| --- | --- | --- | ---: | --- | --- |
| `episode_1_vs_50.jpg` | 2 Jul 2026 | 2115 x 2400 | 0.881 | **empty** | **empty** |
| `multimediaFile-4684.jpg` | 16 Jul 2026 | 2400 x 1600 | 1.500 | present | `USGS photo by E. Johnson` |
| `multimediaFile-4699.jpg` | 12 Aug 2026 | 2400 x 884 | 2.715 | present | `USGS photo by M. Patrick` |

Three aspect ratios, the widest 3.08 times the narrowest. One consistent letterboxed box, per
`image-discipline.md`: never cropped, never stretched. The panorama is the frame that tests it.

## What was re-exported, and why

The three files as USGS serves them weigh **27.3 MB** together — 2.1 + 12.0 + 13.2 — and
`checkWeight` refused the beat at the 20 MB ceiling, which is correct. `image-discipline.md` names
the remedy as an explicit re-export the journalist runs and approves, and that is what happened:
`sips -Z 2400` on each file, longest side to 2400 px, **3.3 MB** in total. The originals are the
ones linked in `source/data.csv`'s `source_url` column and are unmodified there. Nothing was
cropped and no aspect ratio changed.

## The two fields the frozen manifest does not carry

USGS publishes a caption and a usage line for every image and **no alt text at all**, so the `alt`
column arrived empty for all four rows of the manifest; the picture desk wrote two before hand-over
and left the webcam pair alone. Its `credit` cell is empty too.

- **Alt for the webcam pair** is written by hand, at the desk, by a person who opened the file and
  looked at it. Nothing mechanical wrote it and nothing mechanical could: `image-beat/SKILL.md`
  forbids describing a photograph on the journalist's behalf and `image-discipline.md` says neither
  field can be derived from the pixels.
- **Credit for the webcam pair.** The observatory's own caption ends *"USGS webcam images."* — there
  is a rightsholder and there is no photographer, and the credit line says exactly that:
  `USGS webcam images — no photographer stated`. The recorded sentinel `Source: not stated` would
  be wrong here: the source IS stated, it is the individual who is not.

Both answers live in `render.mjs`'s `DESK_ANSWERS`, not in the manifest. The manifest is frozen and
stays exactly as it arrived.

## The frame

1920 x 1080, drawn at 1:1 and measured back off the delivered PNG's own IHDR by
`assertDeliveredSize`. This is NOT the seed's shape and the difference is deliberate:
`ImageBeatSeed` stacks its photographs and derives the frame's HEIGHT from the content, which
cannot honour a size pinned at gate 2c. A pinned frame has to derive the BOX instead — three boxes
in one row, the box height being whatever is left after the title, the deck, the captions, the
credits and the source footer, refused below a 280 px floor.

Three abreast rather than stacked because three boxes in a 1080 px column would be about 130 px
tall each, at which point a photograph is a stripe.

## Type floor

`landscape` carries `minTypePx: 26` (`sizes.mjs`) — 12 CSS px read in a 900 px article column at a
1920 px frame. Title 57, deck 33, caption 33, credit 29. No token under 26; `assertTypeFloor`
measures the rendered markup rather than trusting this paragraph.

## Evidence hierarchy

1. The three photographs. Everything else on the frame is furniture.
2. The caption under each, naming the date and the episode that produced what the frame shows —
   the lesson `STORYBOARD.md` records off reference row 4, the Kashmir map.
3. The credit under that, in muted ink, verbatim from the manifest where the manifest has one.
4. Below a rule in the house accent, the source footer: where the photographs came from, where the
   numbers came from, and the sentence saying nothing here was computed by us.

## Anti-patterns this case invites

- **Cropping the panorama to the others' shape.** It would throw away two thirds of the 12 August
  photograph to make three incompatible frames look like a set. Letterbox.
- **Writing the missing alt mechanically.** The one thing this skill exists not to do.
- **Printing the numbers as if this frame had checked them.** G1 returned `unverifiable` and said
  why. The footer says whose the figures are.
- **Re-ordering the photographs.** The array order is the desk's.

## Source

`source/data.csv` and `source/article.md`, frozen 23 August 2026. Credit and effective date from
`STORYBOARD.md`'s hand fields. Palette from `PALETTE.md`; typeface recorded in `TYPEFACE.md` and —
see the hand-over — not read by this format at all.
