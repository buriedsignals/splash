# Gate 3 — approved

**Beat:** slot 3, the Aveiro line as far as the frozen data goes. **Medium/format:** chart / static,
landscape.
**Artifact shown:** `renders/aveiro-network.png` (1920 x 1080), opened and looked at.
**Decided:** 2026-08-21.

The journalist asked for "one that shows the Aveiro line itself". They were told, before this
artifact was drawn, that the frozen data cannot show the line in any medium — no route, no
coordinates, no stops, no opening date, one year — and that `network_km` is the only column that is
about the line at all. That refusal is written into `BRIEF.md` and into slot 3 of `STORYBOARD.md`,
and `render.mjs` asserts the absence of a geometry column before it draws, so a later freeze that
adds one reopens the slot loudly instead of quietly shipping this again.

**Approved as the nearest honest thing.** The bound record is `OUTPUT-REVIEW.json` beside this file.

In this run the journalist was not present and the decision was taken on their behalf. Recorded in
`../../NOTES-FOR-MAINTAINER.md`.
