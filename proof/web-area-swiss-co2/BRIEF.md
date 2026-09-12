---
format: web
type: area
---

# Beat — La moitié du CO₂ suisse depuis 1858 a été émise après 1986 (web)

**Type:** area (chart). **Medium/format:** chart / **web**. **Frame:** fluid — the geometry stretches
to whatever container it is given, the type never does.

The first `area` beat in this tree's web format, and **the first directed beat in any format other
than static**: it is drawn once per filed direction, through the direction's own six registers,
and nothing about its colour or its type is written in this workspace.

## What "directed" means for a page

The static pass proved the design base could reach a pixel. A page is not a pixel, and the two
halves of the base arrive here differently:

- **Colour** arrives the same way. The direction's ground and accent are the only colours named;
  `deriveFurniture` resolves ink, muted and grid against that ground at render time, and
  `render-web.mjs`'s own stylesheet reads them back as custom properties. The tinted half of the
  surface is `mix(accent, ground, 0.62)` lifted until it clears the non-text floor — never a second
  hue.
- **Type** arrives translated. A plate sets its words as SVG `<text>`; this format draws no `<text>`
  at all, because a word inside a `preserveAspectRatio="none"` viewBox stretches with the geometry.
  So `#shared/design-base/web.mjs` turns each register into a CSS declaration block instead, and two
  things change on the way: case is applied by `text-transform` rather than baked into the string
  (the words are in the DOM here — they are read out, copied and searched), and the resolved face
  carries a generic fallback, because the machine that renders is not the machine that reads.

## The claim

**Switzerland has emitted 3 158 Mt of CO₂ since 1858, and 51,2 % of it since 1986** — 39 years out
of 167. The runner recomputes the total, the crossing year and the split from the frozen file and
throws rather than render if the split is not near half or if the recent span is not far the
shorter one.

## What the web adds, and it is not the static beat repeated

An area chart's claim is that the SURFACE is a quantity — the stock a rate accumulates to. The
static plate states that claim, prints the total and marks the crossing year, and has room to label
perhaps six of its 167 readings. It cannot let a reader check the accumulation anywhere else.

So the one thing this page adds is exactly the reading the plate had to omit: **every year answers
with its own annual figure and with the share of the whole surface that lies to its left.** Hover,
tap and keyboard all reach it; the detail string is baked server-side from the same arithmetic that
drew the mark, so the browser never formats a number.

Nothing that the static frame states is gated behind that ask. The title, the caveat, the crossing
rule and its note, the end label, the reading line, the source and the total are all drawn
unconditionally and survive with JavaScript off — verified by driving the page with scripting
disabled.

## The two refusals, both checked rather than commented

**An area closes across a gap.** The polygon joins the years either side of a missing one and the
reader integrates a value nobody measured, with nothing on the page to show it. The runner refuses a
series whose years are not consecutive, before a mark is drawn.

**An area needs its zero.** The moment a series is filled, every clipped tonne becomes surface a
reader integrates. The component throws if the ticks it is handed do not start at zero.

## One thing this build learned, and it is the format's, not this beat's

The first render scrolled sideways at three of the seven verified viewports — "document 558px in a
375px window". The cause was an overlay annotation: the shared stylesheet gives `.note`
`white-space: nowrap` and no transform, which is right for a label anchored at 0 % and wrong for one
anchored at 50 %. An unwrapped run started at the middle of a 300px plot and 230px long IS 80px of
horizontal document scroll.

The fix is positional and belongs to every directed web beat, so it went into the shared spine as
`noteAnchor(xPct)`: a label near the left edge hangs right, one near the right edge hangs left, one
in the middle is centred, and any of them may wrap. Every beat after this one gets it for free.

A second defect the same first render showed, and only the eye could: the top tick's own label sat
on top of the caveat line, because the scale's maximum WAS the top tick and the label is centred on
its own height. The scale now carries 6 % of headroom.

## Verification

`bun skills/chart-web/scripts/verify-web.mjs --file proof/web-area-swiss-co2/renders/creme.html` —
**56 checks passed, 0 failed, 5 skipped** (all five skips are the filter's, which this beat declares
none of). Fit at seven viewports from 3440×900 to 375×812, real pointer events over 40 of the 167
marks at two viewports, the same again through the overlay, and every argument-bearing word drawn
with scripting on and with JavaScript disabled.

Then the frames were looked at, in all three directions, which is what caught both defects above.

## Source

Global Carbon Budget 2025, via Our World in Data · Switzerland, 1858–2024, 167 consecutive annual
readings. `data.csv` is a byte-for-byte copy of `proof/static-area-swiss-co2/data.csv` — the same
frozen file, re-parsed independently here, per this tree's "duplicate, do not link" rule between
beats.
