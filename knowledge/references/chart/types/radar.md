---
id: radar
engines:
  chart-native: radar
intent: [ranking]
shape: wide
limits: { maxSeries: 3 }
formats: [static, interactive, video]
bestFor:
  - "comparing up to about three entities across 4-8 comparable dimensions, where the profile (the shape) is the message"
notFor:
  - "precise comparison — area scales with the square of the value, exaggerating large values; use a grouped bar or a dot plot instead"
  - "many series — the polygons overlap into mush; or non-comparable axes with different units/scales — the shape becomes meaningless"
  - "ordinal/ranked data where the axis order is arbitrary — reordering axes changes the shape and can mislead"
---

# Radar / spider chart — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "ranking" / multivariate radar ·
> data-to-viz.com (the spider/radar — and its strong caveats) · credited.
> Inherits: `global/dataviz.md` (L0). A POLAR multi-axis layout (not cartesian).

A radar chart plots several variables on **axes radiating from a centre**; each series is a polygon
joining its value on every axis. It answers **"compare a few entities across several dimensions at a
glance — who is strong/weak where, what's the shape of each profile"**. The SHAPE of each polygon is
the read, not exact values.

## When to use / when NOT — read the caveats first

- **Use** sparingly for: comparing ≤ ~3 entities across 4–8 comparable dimensions, where the PROFILE
  (the shape) is the message — candidate/product/team profiles.
- **Not** for: precise comparison — area scales with the SQUARE of the value, so a radar exaggerates
  large values and the enclosed area is misleading. If exact comparison matters, use a grouped bar or
  a dot plot (data-to-viz: "spider/radar" — its headline warning).
- **Not** for: many series (the polygons overlap into mush) or non-comparable axes with different
  units/scales (the shape becomes meaningless).
- **Not** for: ordinal/ranked data where the axis ORDER is arbitrary — reordering axes changes the
  shape and can mislead.

## Correctness "de base" (radar-specific)

1. **Every axis shares ONE scale starting at the centre = 0** (or a stated common min), so positions
   are comparable. → `checkRadarConformance` (≥ 3 axes; a documented common max).
2. **Label every axis** at its spoke end; the reader must know each dimension.
3. **Light concentric gridlines + a scale label** so the polygon's reach is readable.
4. **≤ 3 series, each an Okabe-Ito hue**, drawn as a translucent fill + a solid outline so overlaps
   stay legible; a legend names them.
5. **Order axes deliberately** (group related dimensions) and keep the order fixed across series.

## data-to-viz caveats (credited)

- The radar is "controversial": area distortion + arbitrary axis order make it easy to mislead. Use
  it for the SHAPE/profile story, label the values, and prefer a bar/dot plot when accuracy matters.

## Motion grammar (how a radar *builds*)

See `formats/video.md`; the radar gesture:

- chrome (the spokes + concentric rings + axis labels) fades in first;
- each series polygon **grows from the centre outward** — every vertex interpolates from the centre to
  its value (the profile inflates), eased-out, staggered by series; vertex dots pop as it lands;
- the legend fades in with the chrome.
A vertex never grows from its outer point — always from the centre (rule 1), so frame N is a pure
function of the frame.
