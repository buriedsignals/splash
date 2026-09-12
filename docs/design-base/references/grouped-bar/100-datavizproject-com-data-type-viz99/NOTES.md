# Ferdio / 100.datavizproject.com — #99, the group broken into panels, each with its own baseline

- url: https://100.datavizproject.com/data-type/viz99/
- archive: datavizproject
- type: grouped column chart drawn as small multiples — 2 series ('04, '22) × 3 categories, one
  panel per category, with a connector between the two caps and the percentage change inside
- export: static raster (`img` 823 × 823) served in the page
- readAs: `graphic.png`, picked at `documentTop` 172, photographed at 824 × 823. Both routes `ok`;
  `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the page only — the graphic
  is a raster and carries no type this route can read"**.

## What it is

Three panels — Sweden `13 → 15`, Norway `5 → 8`, Denmark `4 → 10` — each holding one pair of
columns, `'04` in blue and `'22` in coral, with a thin line joining the two caps and the change
(`15.4%`, `60%`, `150%`) set large between them under a small up-triangle.

## What it does with information

**The group has become a panel, and the panel has its own baseline rule** — a short horizontal line
under each pair, exactly as wide as that pair. The between-group gap is no longer a gap; it is the
end of one axis and the start of another. This is the move the type's own guidance recommends when
groups multiply, made at n = 3 rather than waiting for the picket fence.

**The scale is still shared.** All three panels are drawn against one vertical scale — Sweden's `15`
is taller than Denmark's `10` on the page — so the cross-panel comparison the type exists for
survives the split. That is what separates this from three unrelated charts sitting in a row.

**The connector is the third mark, and it carries the argument.** A short segment from the '04 cap
to the '22 cap, drawn as a gradient from the blue to the coral, turns two static columns into a
direction. Its slope is what the reader actually reads, and the big number under it names what the
slope is worth.

**The derived number outranks the measured ones.** `150%` is set larger and bolder than `4` and
`10`, and it sits in the middle of the panel where the eye lands first. The chart's claim is about
change, so change is the largest type on it, and the levels are demoted to small captions above the
caps.

**Panels are ordered by level, not by change** — Sweden, Norway, Denmark, descending on '04 — which
reads oddly against a chart whose headline is change (Denmark's `150%` is largest and comes last).
That is a real cost of the ordering choice and the plate does not resolve it.

## What it does with style

Measured on `graphic.png` (`record.pixel`): ground `#FFFFFF` at **91.351 %** — the emptiest of the
five Ferdio plates, which is what splitting into panels costs in ink and buys in air. Chromatic
`#EE5440` at **4.250 %** (7°) and `#3274D8` at **2.693 %** (216°); then a long faint tail —
`#EF5B48` 0.036 %, `#F7B0A7` 0.034 %, `#B9D0F2` 0.032 % — which is the connector's gradient and the
rounded bar corners. Neutral `#263238` at **0.060 %**. Shape **diverging**, clusters at 7°
(4.457 %, 13 members) and 216° (2.826 %, 10).

**The coral outranks the blue here** (4.250 % against 2.693 %), and it is the only Ferdio plate in
this family where it does: the '22 bars are the taller ones in all three panels, so the series that
carries the story also carries the most ink. Colour share follows the argument rather than the
palette order.

The bars are rounded at the cap only, not at the foot, so the baseline stays square where it meets
the rule.

## What is transferable

- **Split a grouped bar into one panel per group, keeping one shared scale.** The comparison across
  groups survives; the within-group comparison gets its own local baseline and gets easier.
- **Give each panel a baseline rule only as wide as its own group.** The rule is what tells the
  reader the panel is a chart rather than a fragment.
- **Join the two caps and set the derived change larger than the levels** when the chart's claim is
  about change. The levels become captions.
- **Order panels by whatever the headline number is.** Ordering by level while headlining change,
  as here, makes the reader re-sort the page themselves.

## What is this piece's own

The flag roundels beneath each panel, and Ferdio's blue/coral pair.

## What was not verified

The graphic's typography (raster; page-only type source). Whether the connector is a gradient or two
butted segments — it reads as a gradient in the pixel tail (`#B9D0F2`, `#F7B0A7`) but this was not
sampled along the line. Whether the shared scale is enforced or coincidental in this dataset. One
publication.
