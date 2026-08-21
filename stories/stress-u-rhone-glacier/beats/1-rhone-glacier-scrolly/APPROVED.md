# Approved — beat 1, the Rhone glacier scrolly

**Decision: approve.** Given at the Gate 3 production review, on the render at
`renders/rhone-glacier.html`, after driving it in a real browser at 1600x900, 1280x800 and 375x812
and looking at eight scroll positions at two of them.

What was surfaced for the decision, and what the answer was:

- The page itself, opened and scrolled: `open stories/stress-u-rhone-glacier/beats/1-rhone-glacier-scrolly/renders/rhone-glacier.html`
- `bun skills/scrolly/scripts/verify-scrolly.mjs stories/stress-u-rhone-glacier/beats/1-rhone-glacier-scrolly/renders/rhone-glacier.html` — 0 failures, 18 notes.
- Three corrections were made before this approval, all found by LOOKING and none by any guard:
  the unit printed `km2` instead of `km²`; the head readout was set in the accent (`#1F6FB2`,
  3.34:1 — under the 4.5:1 floor for a run of 18px text) and is now `ink`; the recorded credit was
  printed twice, once inside the graphic and once in the page's source row, and the frame now
  carries the short form.

Approved as-is. No further correction requested.
