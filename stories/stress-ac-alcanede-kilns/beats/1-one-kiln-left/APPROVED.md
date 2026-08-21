# Approved — One kiln left

**Decision:** approve. **At:** G3, per beat. **Render approved:**
`renders/one-kiln-left.html`, digest bound in `OUTPUT-REVIEW.json`.

The journalist was shown the opened HTML and the four driven step screenshots in `drive/` and asked
approve-or-correct. No delivery form was named in that turn: the forms are `offerForms`' output and
cannot be known before it runs.

**What was shown**

- `renders/one-kiln-left.html` — four steps, three media, self-contained, no network request.
- `drive/1600x900-step-1-record.png` … `-4-site.png` and the same four at 375×812 — each captured
  at the scroll position where `data-progress` reaches that step.

**What was said about it**

Three media in the order the article asked for; every figure recomputed from the frozen file; the
article's own "steepened after 2010" sentence stated in the reading the data supports and refused
in the reading it does not; the two supplied photographs printed at their own aspect ratio, dated
on the picture, with the beat saying plainly that nothing measures anything from a photograph.

`verify-scrolly.mjs`: **0 failures** at 1600×900, 1280×800 and 375×812.
