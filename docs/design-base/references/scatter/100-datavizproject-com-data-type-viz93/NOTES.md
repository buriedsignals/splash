# 100 datavizproject — #93, the scatter whose mark is a donut

- url: https://100.datavizproject.com/data-type/viz93/
- archive: datavizproject
- type: scatter — two quantitative axes, the mark carrying a third, part-to-whole reading
- export: static
- readAs: the encoding as the page draws it, at rest

## What it is

The three countries on **x = 2004** against **y = 2022**, where each point is not a dot but a
**donut** split into two arcs, with the country's flag in the hole.

## What it does with information

**The mark carries a second reading without leaving its position.** Each donut's two arcs are a
share (`87 % / 13 %` for Sweden, `62 % / 38 %` for Norway, `60 % / 40 %` for Denmark), printed as
percentages diagonally outside the ring in the entity's own colour. The point still means what its
coordinates say; the ring adds a proportion the axes have no room for.

**The identity is inside the mark and the values are outside it.** The flag sits in the donut's
hole — no label, no key, no legend — and the two percentages sit beyond the ring at opposite
corners, tinted so that the lighter arc's number is in the lighter tint and the darker arc's in the
darker.

**The axis titles are the two dates**, `2004` under the x and `2022` rotated on the y, in grey at a
larger size than the ticks — the same construction as `#7` in this archive.

## What it gets wrong, and it is worth recording

**The x axis's ticks are `0, 5, 15, 20` at equal spacing.** Four gridlines, evenly spaced across the
plot, labelled with a sequence that is not evenly spaced. Verified by crop and enlargement of
`screenshot.png` at `400,830 → 1060,900`: the four labels sit at x ≈ 463, 640, 818 and 996 px —
178 px apart every time. Either a `10` was mislabelled `15`, or the axis is genuinely non-linear and
unmarked as such. Either way every horizontal position on this plate is unreadable, in a published
piece, from a house whose whole subject is encoding.

It is recorded because a corpus of "what good desks do" that never records a good desk getting it
wrong is a corpus of advertising. And because it names a floor worth guarding: **an axis's tick
labels must be arithmetically consistent with their spacing**, which is a mechanical check, not a
matter of taste.

## What it does with style

Same site-chrome contamination as the other records from this archive. Re-measured on the chart card
(`crop 308,170,824,730`): ground **`#FFFFFF` at 95.0 %**; chromatic `#3274D8` 0.64 % (216°),
`#F6988C` 0.40 % and `#ED5440` 0.31 % (both 7°), `#86ADE8` 0.09 % (216°) — each entity's hue
appearing twice, once full and once tinted, which is the two arcs. Neutrals `#283250` 0.47 % and
`#7A8092` 0.35 % — again the third entity's pair, on the neutral side of the chroma split.

**And the contamination here is not merely dilution.** The site header's `#3274DA` is **the same
hue as the chart's own blue entity** (`#3274D8`, 216° in both). On the uncropped page shot a 216°
cluster cannot be attributed to the chart at all. Every colour figure above is the cropped
re-measurement; nothing is quoted from this record's own `pixel` field.

## What is transferable

- **A scatter's mark can carry a part-to-whole reading** — a small donut at the point's coordinates
  — when there is a share the axes have no room for and the point count is small.
- **Identity inside the mark, values outside it**, so neither crowds the other.
- **Tint the value's type to match the arc it names.**

## What is NOT transferable

The donut mark at any real point count. Three of these are legible; thirty would be a texture. This
is the encoding's own ceiling and the piece does not state it.

## What is this piece's own

The triad, the flags, and the house sans.

## What was not verified

- **What the percentages are shares of.** The piece names them nowhere in the captured region.
- Whether the `15` is a typo or a deliberate non-linear scale. Only the inconsistency was measured.
- **One publication**, as with every record from this archive.
