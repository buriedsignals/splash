# Approved — the deaths moved

**Decision:** approve. **At:** G3, per beat. **Render approved:**
`renders/the-deaths-moved.html`, digest bound in `OUTPUT-REVIEW.json`.

The journalist was shown the opened HTML and the eight driven step screenshots in `drive/` and
asked approve-or-correct. No delivery form was named in that turn: the forms are `offerForms`'
output and cannot be known before it runs.

**What was shown**

- `renders/the-deaths-moved.html` — four steps, three media, self-contained, no network request,
  343 KB against this format's 3.6 MB ceiling.
- `drive/1600x900-step-1-where.png` … `-4-forecast.png` and the same four at 375×812, each captured
  at the scroll position where `data-progress` reaches that step.
- A DOWN-then-UP continuous pass at 1600×900, 800×900 and 375×812.

**What was said about it**

The argument arrives in the order a reader needs it — where, what the two terrains are, what
changed, what the forecast said — and every figure is recomputed from the frozen register. The
takeaway's four numbers are sums over subsets of rows, which the profiler cannot check either way,
so `grounding` is recorded `unverifiable` and not upgraded; `test/facts.test.ts` recomputes them
independently and asserts the delivered HTML carries each. The publisher's own warning about the
danger-level reading is printed verbatim on the frame that makes it.

**What was measured**

- `verify-scrolly.mjs`: **0 failures, 28 notes** at 1600×900, 1280×800 and 375×812.
- Card 409×142 — 17% of the frame's height, inside the 16–22% band this format's own beats sit in.
- Every step redraws 92.2–99.7% of the graphic's marks; the floor is 1%.
- Graphic fills 90.8% / 87.8% / 73.4% of the window; the floor is 65.7%.
- `data-progress` spans 0.00–3.00; worst step/progress drift 0.59 against a 0.65 ceiling.
- Prose card travel 627 / 931 / 912 / 639 px, 0 frames held.
- Longest sliced label run: **none** at 1600 and at 375; 9 frames on one x-axis tick at 1280.
- Continuous scroll DOWN and UP at three widths: all four frames painted in both directions, in
  order and in reverse, 0 non-monotonic progress frames, 0 frames with more than one active frame,
  0 frame/panel desync.
- Panel contrast 17.66:1 — `rgb(255,255,255)` on `rgb(22,25,27)`.
- Plate luminance 0.022 against ground 0.009: both dark, the pairing `plateFollowsGround` requires.

**What was approved with a named limit**

- **JavaScript off, the graphic never changes.** Every step's prose survives and the column
  scrolls, but the map stays on screen under all four cards, so three of the four steps are read
  against a picture that is not theirs. This is the scaffold's own no-JS behaviour, not this beat's;
  it is written up in `../../NOTES-FOR-MAINTAINER.md`.
- **The map is short on a phone.** Fitted rather than cropped, a 1.94:1 plate is 375×193 in a
  375×596 frame. Cropping it would have deleted a third of the country; the trade was taken
  deliberately and is stated in `BRIEF.md`.
- **The two series colours are 1.75:1 against each other.** Both clear the non-text floor against
  the ground, which is the only measurement this toolchain makes. They are told apart by line style
  and by a direct label as well as by hue.
