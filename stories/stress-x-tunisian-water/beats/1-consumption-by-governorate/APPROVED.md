# Gate 3 — approved

**Beat:** slot 1, consumption by governorate. **Medium/format:** chart / static, landscape.
**Artifact shown:** `renders/consumption-by-governorate.png` (1920 x 1080), opened and looked at.
**Decided:** 2026-08-21.

The journalist was shown the PNG and asked to approve or correct. Nothing about delivery was said in
that turn: the forms are `offerForms`' output and cannot be known before it runs.

**Approved as drawn.** The bound record is `OUTPUT-REVIEW.json` beside this file — it binds this
approval to the exact bytes of `renders/`, so re-rendering the beat invalidates it.

What was checked in the pixels, and not only in the markup:

- Every Arabic run is joined and in reading order, at 6x zoom on the ends of every wrapped line.
  Nothing in any string is reversed or reordered: the strings are the frozen ones.
- Sentence-final full stops sit at the LEFT end of their line, which is where an Arabic sentence
  ends. The first render put them at the right; the cause and the fix are in `WaterBars.tsx`'s own
  `rtl()` header.
- No tofu. Every glyph the frame draws — Arabic letters, the Arabic-Indic digits inside the note,
  the Latin digits, the colon, the em dash — has a real glyph behind it in the recorded face.
- The frame was rendered on the newsroom's dark ground AND on white, and both were opened.
  `inspectSvg` measured 22 painted runs against each ground with nothing under the 4.5:1 floor.

In this run the journalist was not present and the decision was taken on their behalf. Recorded in
`../../NOTES-FOR-MAINTAINER.md` rather than dressed up as an answer somebody gave.
