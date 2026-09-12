# Information is Beautiful — "Which Fish are Okay to Eat?"

- url: https://informationisbeautiful.net/visualizations/which-fish-best-safest-healthy-to-eat/
- archive: informationisbeautiful
- type: matrix, ordinal class × fishery region, categorical cells
- export: web (an inline SVG, not a raster)
- readAs: the piece's own SVG photographed as the element (`graphic.png`, 1380 × 1403) after a
  **re-harvest** — the first capture carried a newsletter modal across the centre of the graphic and
  was discarded (`METHOD.md`, correction 3)

## What it is

A matrix of edible seafood. Three rows — `YES`, `MAYBE`, `NO` — and four columns —
`Farmed`, `Atlantic`, `Atlantic & Pacific`, `Pacific`. Each cell holds the species that fall in that
class for that fishery, drawn as silhouettes and labelled. Filter chips above (`TOXINS`,
`CRUEL FISHING`, `BY-CATCH`, `ENVIRONMENTAL HARM`, `FISH STOCKS`, `ANIMAL WELFARE`,
`VEGETARIANISM`) re-sort the matrix against what the reader says they care about.

## What it does with information

**The classes of the scale are named AND DEFINED, in the row header, and there is no legend at
all.** `YES` carries `abundant, well-managed or caught in an eco-friendly way`; `MAYBE` carries
`fish are flagged for concern, and may be trawler-caught`; `NO` carries `vulnerable or endangered
species, caught or farmed in harmful ways`. The definition sits where the class is read, so the key
and the axis are the same object. Measured: the class definitions set at
`Quicksand | 15 | 700 | tracking −0.4`, sample `vulnerable or`.

**The class is encoded twice, redundantly.** The row band's ground steps white → pale blue → blue
(pixel route: `#BCE3F9` is the largest single colour at **32.6 %** of the graphic), and the mark
colour steps grey → mid-grey → orange (`rgb(102, 102, 102)` at 51 runs, `rgb(60, 60, 59)` at 22,
`rgb(242, 129, 102)` at 39, style route). Either channel alone would carry the ordinal reading; both
together survive a reader who does not separate the two blues.

**Every cell carries its own qualification, in a second smaller register.** The species name sits at
`Quicksand | 14 | 500` (95 runs) and the condition under which the verdict holds at
`Quicksand | 10 | 500` (**106 runs**) — `(NORTH SEA OTTER TRAWLED, SEINE NETTED)`,
`(MSC OR RFM CERTIFIED)`, `(PELAGIC TRAWL)`. There are more qualifier runs than name runs. No verdict
appears without the basis on which it was given.

**The same species appears in more than one cell, deliberately.** Atlantic Salmon is `YES` when
farmed organically, `MAYBE` off Maine, `NO` in the farmed `NO` band. The matrix refuses to collapse
a fish to one answer, which is the actual finding.

**The mark depicts its subject.** Each cell is a drawing of the fish, so the reader identifies the
row without reading it.

## What it does with style

Ground: the graphic has no single field — the pixel route reports `#BCE3F9` (pale blue, the `NO`
band) as both the modal colour and the largest chromatic entry, at 32.6 %, and classifies the
palette as **diverging**. The one saturated colour on the canvas is `#F28166` (orange, 1.9 %), spent
entirely on the `NO` marks; everything else is a grey or a blue.

Two families: `Quicksand` inside the graphic (400/500/700), `IBM Plex Sans` for the page around it.
The filter chips are set at `Quicksand | 13.5 | 500` in capitals typed as capitals.

## What is transferable

- **Define the classes where they are read.** A three-class ordinal scale can be its own legend if
  each class name carries a one-line definition in the row header.
- **Encode an ordinal class twice** — band ground and mark colour — when the class is the whole
  argument.
- **Every cell carries its qualification in a smaller second register**, so no verdict appears
  without its basis.
- **Let one subject occupy several cells** rather than forcing a single verdict, where the honest
  answer is conditional.

## What is this piece's own

The fish silhouettes, `Quicksand`, and the pale-blue-to-orange pairing.

## What was not verified

- **Any filtered state.** The seven filter chips reorder the matrix and only the unfiltered resting
  state was read.
- **Whether the `NO` band's blue is a band fill or a selected-state highlight.** The eye reads it as
  the band's own ground; nothing in the record settles it.
- The exact hexes of the row-header text; the colours listed are the style route's mark fills, not
  sampled from the class labels.
- Contrast of the grey `MAYBE` marks against the pale blue band was not measured.
