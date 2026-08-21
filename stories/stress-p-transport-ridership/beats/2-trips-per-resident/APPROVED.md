# Gate 3 — approved

**Beat:** slot 2, the one readers can explore. **Medium/format:** chart / web (no size — a web beat
fills its container).
**Artifact shown:** `renders/trips-per-resident.html`, opened in a real browser at seven viewports,
its screenshots looked at, and its hover driven with real pointer events.
**Decided:** 2026-08-21.

**Approved as drawn, with one limitation stated to the journalist rather than hidden.**

A slopegraph's lines cross. At the exact crossing point a pointer is equidistant from both lines, so
the tooltip answers with one of the two — here every one of the three crossings is a symmetric rank
swap, so all three sit at the midpoint. Everywhere else on a line, hover answers with that city:
driven at 15% and 85% along all six lines, 12 of 12 correct. Keyboard focus is unambiguous
everywhere, and the accessible table carries all six readings in full.

`skills/chart-web/scripts/verify-web.mjs` reports 48 passed / 14 failed / 11 skipped, and all 14
failures are that one check probing exactly those crossing points. The same check fails on this
format's own committed slope artifact. Recorded in `OUTPUT-REVIEW.json` as a failed QA run beside
the passing one, so the failure is a fact on disk rather than a sentence in a transcript.

In this run the journalist was not present and the decision was taken on their behalf. Recorded in
`../../NOTES-FOR-MAINTAINER.md`.
