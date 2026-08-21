# Gate 3 — approved

**Beat:** slot 1, hospital beds per 10 000 inhabitants. **Medium/format:** chart / static, landscape.
**Artifact shown:** `renders/beds-per-resident.png` (1920 x 1080), opened and looked at.
**Decided:** 2026-08-21.

The journalist was shown the PNG and asked to approve or correct. Nothing about delivery was said in
that turn: the forms are `offerForms`' output and cannot be known before it runs.

**Approved as drawn.** The bound record is `OUTPUT-REVIEW.json` beside this file — it binds this
approval to the exact bytes of `renders/`, so re-rendering the beat invalidates it.

What was checked in the pixels, and not only in the markup:

- **Every Polish diacritic, at 4x.** `Ś` `ą` `Ł` `ó` `ż` `ę` `ń` `ś` `ź` `ć` all draw as real glyphs
  in the recorded stack — the ogonek is attached in `Śląskie` and `Dolnośląskie`, the stroke is on
  the `Ł` of `Łódzkie` and the `ł` of `Małopolskie`, the acute is on the `Ź` of `Źródło`. No tofu, no
  empty boxes, nothing substituted. This had to be done by eye: `useTypeface` probes with a Latin
  string and the recorded option is `origin: default`, which it does not probe at all.
- **The em dash is an em dash**, in the title and in the credit line — not two hyphen-minus
  characters. `doubleHyphenInDeliveredText` reads the delivery, and the delivery is written from
  these strings.
- **The reference rule no longer strikes a value.** The first render put each row's value at its own
  bar tip, and the average rule at 38,0 was drawn straight through `38,5`, `37,0`, `36,7`, `35,4`
  and `35,3` — every row below the average, by construction. The values now sit in one right-aligned
  column past the longest bar, where a rule inside the track cannot reach them. Both renders were
  opened; the first is the reason the second exists.
- **The field ink was decided by rendering both candidates and looking**
  (`probe/field-grid.png`, `probe/field-muted.png`). The trade it accepts, and why the compliant
  option does not exist on this ground, is written out in `render.mjs` beside the decision.
- **The frame's own measurements**, run by hand because no producer calls them:
  `frameFillFraction` 76.25 % against this skill's `FLOOR_FRACTION` of 35.15 %; `inspectSvg` 25
  painted runs against `#FFFFFF`, none under its floor, alt text present, no root `<title>`;
  `revealDashInScreenSpace` clean on the one dashed mark; `mislabelledRows` empty.
- `assertDeliveredSize`, `assertTypeFloor`, `assertWithinStage` and `assertDrawnInActiveTypeface`
  all passed against the delivered PNG and SVG, from the file's own bytes.

In this run the journalist was not present and the decision was taken on their behalf. Recorded in
`../../NOTES-FOR-MAINTAINER.md` rather than dressed up as an answer somebody gave.
