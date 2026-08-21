---
size: landscape
type: photograph sequence
---

# Beat 1 — the same quay in 1994, 2010 and 2025

**Medium/format:** image / static. **Channel:** article web — **size: landscape (1920 x 1080)**.
Slot 1 of `STORYBOARD.md`, treatment `Photograph sequence`.

## Claim

Three photographs of one stretch of quay. In 1994 fishing boats are moored three deep. By 2025 the
berths are empty and the crane has gone. The 2010 frame is the only surviving picture of the quay
from that decade.

Nothing here is computed, because there is nothing to compute: `source/data.csv` is a photograph
manifest — file name, year, alt, credit — and carries no quantity at all. G1 grounded the takeaway
as `unverifiable` and said why.

## The photographs, in the journalist's own order

| file | year | intrinsic | alt in `source/data.csv` | credit in `source/data.csv` |
| --- | --- | --- | --- | --- |
| `w-quay-1994.png` | 1994 | 1600 x 1067, landscape 3:2 | present | `Régie du port` |
| `w-quay-2010.png` | 2010 | 1200 x 1600, **portrait 3:4** | **empty** | **empty** |
| `w-quay-2025.png` | 2025 | 2400 x 900, **panoramic 8:3** | present | **empty** |

Three different aspect ratios, and the widest is 3.2 times the aspect of the narrowest. One
consistent letterboxed box, per `image-discipline.md`: never cropped, never stretched.

## The two fields that are missing, and what this beat does about them

`imageBeatLayout`'s rule — required alt, required credit, no lower tier — is the one this format
enforces at write time. Two of these three photographs do not meet it.

- **2010: no alt.** Nobody at the paper can say what to write, and *this producer must not write
  it*: `image-beat/SKILL.md` forbids describing a photograph on the journalist's behalf, and
  `references/image-discipline.md` says neither field can be derived from the pixels. This beat
  therefore does not invent one. It carries the desk's own sentence about the gap instead, written
  by a person, in the reader's own language, printed where the alt goes.
- **2010 and 2025: no credit.** The story's own recorded vocabulary already has an honest empty
  answer for this — `credit: unattributed`, which prints **`Source: not stated`** on the artefact
  (`storyboard/scripts/storyboard.mjs`, round-four finding 11). This beat prints that same
  sentence per photograph, so the reader sees an absence rather than a blank line that reads as a
  rendering fault.

## The frame

1920 x 1080, the landscape row, drawn at 1:1 and measured back off the delivered PNG's own IHDR.
This is NOT the seed's shape and the difference is deliberate: `ImageBeatSeed` stacks its photos
and derives the frame's HEIGHT from the content, which cannot honour a pinned export size. A beat
whose frame is pinned has to derive the BOX from the frame instead — three boxes in one row, box
height computed from what is left after the title, the captions and the credits.

## Evidence hierarchy

1. The photographs. Everything else on the frame is furniture.
2. The year under each frame, as its caption — the journalist's own datum, not a description.
3. The credit under that, in muted ink; `Source: not stated` where there is no photographer.

## Type floor

`landscape` carries `minTypePx: 26` (`chart-beat/scripts/sizes.mjs`) — 12 CSS px read in a 900 px
article column at 1920 frame px. Title 48, caption 34, credit 28. No token under 26.

## Anti-patterns this case invites

- **Cropping the panorama to match the others.** It would make one consistent-looking row out of
  three incompatible frames by throwing away two thirds of the 2025 photograph. Letterbox.
- **Writing the missing alt text.** The one thing this skill exists not to do.
- **A blank credit line.** Reads as a rendering fault, not as an absence.
- **Re-ordering the photographs.** The array order is the journalist's.

## Source

`source/data.csv` and `source/article.md`, frozen. Credit and effective date from `STORYBOARD.md`'s
hand fields. Palette from `PALETTE.md`; typeface recorded in `TYPEFACE.md` and — see the hand-over
— not read by this format.
