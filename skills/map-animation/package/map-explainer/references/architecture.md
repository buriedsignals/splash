# Map Explainer — architecture reference

Deep detail behind `SKILL.md`: the timing model, the river reveal + electric head, the per-country
sequence, label projection, and the camera. Values from the operator-approved water-wars Pilot A render.
The full runnable code is `../assets/RiverReveal.tsx` + `../assets/CountryLabel.tsx` + `../assets/tokens.ts`.

## 1. The render harness (per frame)

Init the MapTiler map once (ref guard). On `load`: strip clutter (see `geo-prep.md`), add sources/layers,
`jumpTo(START)`, `once('idle') → continueRender`. Per frame:

```
delayRender → setData/setPaintProperty/jumpTo → map.once('idle', continueRender) → triggerRepaint
```

`preserveDrawingBuffer:true` so Remotion's screenshot captures the canvas. Render `--gl=angle`.

## 2. Timing model — time-based; beat length derived from the sequences

Everything keys off **seconds** (`t = frame / fps`), not reveal-units. The river draws over a window;
each country **triggers when the river reaches it** and runs a fixed sequence. The beat is exactly as
long as the sequences need.

```ts
const RIVER_START = 0.3, RIVER_END = 8.0;            // river draws over this window
const BORDER_S = 2.5, FILL_S = 1.0, LABEL_S = 0.7;   // per-country sequence (constant durations)
const trigger = (c) => RIVER_START + META[c].stop * (RIVER_END - RIVER_START);  // river-arrival time
// beat length = max over c of (trigger(c) + BORDER_S + FILL_S + LABEL_S) + tail   → water-wars = 12 s
const reveal = interpolate(t, [RIVER_START, RIVER_END], [0,1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
```

**Constant durations matter:** drive the border draw by *time since trigger*, not a slice of the reveal —
otherwise the long borders (India, Bangladesh) flash by in a fraction of a second.

## 3. River animation — line reveal + electric draw-head

The "electricity" is a **white-hot head** leading the draw — the last few % of the drawn line in its own
bright + glow layers, faded out once the river completes.

```ts
const riverDrawnKm = lineKm * reveal;
map.getSource("river").setData(turf.lineSliceAlong(line, 0, Math.max(0.001, riverDrawnKm)));
const headKm = lineKm * 0.03;
map.getSource("river-head").setData(turf.lineSliceAlong(line, Math.max(0, riverDrawnKm - headKm), Math.max(0.001, riverDrawnKm)));
let headFade = 0;
if (reveal > 0.002 && reveal < 0.999) headFade = 1;
else if (reveal >= 0.999) headFade = 1 - clamp01((t - RIVER_END) / 0.5);  // fade out at the mouth
map.setPaintProperty("river-headglow", "line-opacity", 0.85 * headFade);
map.setPaintProperty("river-head", "line-opacity", headFade);
```

Layers, bottom→top: `river-glow` (electric blue `#49C6FF`, w11, op0.32, blur6) → `river-line`
(icy core `#E8F7FF`, w3) → `river-headglow` (`rgba(120,225,255,.95)`, w16, blur9) → `river-head`
(white `#FFFFFF`, w4.5). **No dark casing** — the bright icy core reads over every fill on its own.

## 4. Country animation — border draws → fill blooms → label rises

Triggered by river arrival, each country runs three sequential phases. The border is a **darker shade**
of the country colour (the electricity is on the river, not here).

```ts
const lt = t - trigger(c);                                   // local seconds since trigger
// 1) border draws on over a constant BORDER_S, multi-segment-safe
const bp = interpolate(clamp01(lt / BORDER_S), [0,1], [0,1], { easing: Easing.inOut(Easing.cubic) });
map.getSource(`trail-${c}`).setData(sliceBorder(DRAW[c], 0, DRAW[c].total * bp));   // COUNTRY_DARK line
// 2) fill blooms in (opacity overshoots, then settles) after the border completes
const fp = clamp01((lt - BORDER_S) / FILL_S);
const fo = interpolate(fp, [0, 0.6, 1], [0, FILL_OPACITY * 1.25, FILL_OPACITY], { ...clamp, easing: Easing.out(Easing.cubic) });
map.setPaintProperty(`fill-${c}`, "fill-opacity", fp <= 0 ? 0 : fo);
// 3) label rises in after the fill
const lp = clamp01((lt - BORDER_S - FILL_S) / LABEL_S);
```

`sliceBorder(d, fromKm, toKm)` reveals a portion of a (possibly multi-segment) border as a
MultiLineString, slicing each segment by cumulative length — no joins across gaps:

```ts
const sliceBorder = (d, fromKm, toKm) => {
  const out = [];
  for (let i = 0; i < d.segLines.length; i++) {
    const start = d.cum[i], end = start + d.segLen[i];
    const a = Math.max(fromKm, start), b = Math.min(toKm, end);
    if (b - a <= 0.0008) continue;
    out.push(turf.lineSliceAlong(d.segLines[i], a - start, b - start).geometry.coordinates);
  }
  return { type:"Feature", properties:{}, geometry:{ type:"MultiLineString", coordinates: out } };
};
```

Fill colours = a brand trio at `FILL_OPACITY = 0.5` (china amber `#D4A853`, india teal `#5B8A8A`,
bangladesh clay `#C07B57`); borders the darker shades (`#9A7530` / `#3C5C5C` / `#855239`).

## 5. Labels — Space Grotesk HTML overlay, projected each frame

Labels are React, not map symbols (font control). `CountryLabel` (Space Grotesk via
`@remotion/google-fonts`): an accent rule that draws out above the name, rise-and-fade entrance.
Positioned by projecting the anchor to screen pixels **every frame**, stored in state:

```ts
const p = map.project(META[c].anchor);   // lngLat → screen px (respects the live camera)
pos[c] = { x: p.x, y: p.y, reveal: lp };
setLabels(pos);                          // re-render the overlay; effect deps exclude `labels`
```

`CountryLabel` styling: name in Space Grotesk, weight 600, size 34, `letterSpacing 0.22em`, uppercase,
cream `#F5F2ED`, strong text-shadow; an accent rule (`width 64, height 3`, country colour) with
`transform: scaleX(reveal)` and a glow; entrance `opacity = easeOut(reveal)`, `translateY((1-e)*16)`.
`paddingLeft:"0.22em"` balances the trailing letter-spacing so the word stays centred. `pointerEvents:none`.

## 6. Camera — gentle 2D push-in

Low pitch, slow zoom-in over the whole beat, lerped by overall progress `tt = frame/(dur-1)`:

```ts
const START = { center:[89.6,27.7], zoom:4.75, pitch:0 };
const END   = { center:[90.2,27.0], zoom:5.05, pitch:10 };
map.jumpTo({ center:[lerp(START.center[0],END.center[0],tt), lerp(START.center[1],END.center[1],tt)],
             zoom: lerp(START.zoom,END.zoom,tt), pitch: lerp(START.pitch,END.pitch,tt), bearing:0 });
```
