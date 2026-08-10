// THE ASSEMBLY. ONE IMPLEMENTATION, USED TWICE.
//
// `MixedFrame.tsx` imports this in node to SSR the whole composition in its FIRST state; `render.mjs`
// reads the same file as text, strips the `export` keywords and inlines it into the delivered HTML,
// where `initMixedScrolly` drives every state after it. One implementation, so the picture a reader
// meets before any script runs and the picture the scroll drives cannot drift apart.
//
// WHAT THIS BEAT IS, AND WHY IT IS MOSTLY COMPOSITION RATHER THAN NEW MECHANISM. The owner, 2026-08-10:
// *"Pour le multiple, essaye de mélanger de tout : des charts avec navigations, des maps avec
// navigations et des images"* — and then, on how it is driven: *"La navigation se fait au scroll,
// c'est une sorte de mix de tout"*, and *"C'est genre un assemblage."* So this beat carries THREE
// media in one story and navigates INSIDE the chart and INSIDE the map while each holds the screen,
// and it does both from ONE signal.
//
// THE ONE RULE THAT DECIDES THE SHAPE OF THIS FILE: there is no state machine for "which medium",
// and no second interpolation for "where inside it". There is ONE composition state, whose fields
// happen to belong to three different media, and it is interpolated field by field at the reader's
// own fractional position. A medium's own presence (`photoOpacity`, `mapOpacity`, `chartOpacity`)
// is a field of that same record, so the handover from one medium to the next is not a mechanism —
// it is the same lerp, on three more fields. Two levels, one signal, and they cannot get out of
// step because there is only one of them.
//
// WHAT IS COPIED, AND FROM WHERE. Nothing is imported across a beat boundary (`no-cross-skill-
// imports.test.ts` states the rule for skills; `twin-doctrine` states it for beats), so the parts
// below are COPIES, named here so the lineage is legible and so `scroll.test.ts` can check the two
// that must not drift:
//
//   - the interpolation core (`lerp`/`ease`/`lerpState`/`assertNumericStates`/`stateAt`), the
//     progress reader (`progressSourceOf`/`readProgress`) and `detachVisual` are byte-for-byte the
//     two single-visual beats' own — `scrolly-one-chart-swiss-life-expectancy/chart-drive.mjs` and
//     `mapscrolly-one-map-europe-carbon/map-drive.mjs` carry identical copies of each, and
//     `scroll.test.ts` asserts this copy still matches theirs;
//   - the chart geometry (`ticksFor`, `valueAt`, `chartGeometry`, `toFrame`, `annotationPlacement`)
//     is the chart beat's, minus its called-out band, which this story has no reading for;
//   - the camera (contain/cover through a `fit` field, spans interpolated in LOG space, one resolved
//     camera written to every consumer on one frame) is the map beat's model. **It diverges in one
//     way, stated in `BRIEF.md`: there is no baked plate here, so the camera is authored directly in
//     longitude / mercator-y / extent rather than inverted out of plate units, and `MAX_SCALE` — the
//     clamp that stops a plate being magnified past its own raster — is gone with the plate.**
//     This beat's flight covers about 11× of magnification, which no single plate can hold.
//   - the photograph track is this beat's own: it is the one part the two single-visual beats had
//     nothing to copy from.

// ── The interpolation core ─────────────────────────────────────────────────────────────────────

export function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** easeInOutQuad — every flight leaves and arrives calmly and holds still in between. */
export function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function lerpState(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = lerp(a[key], b[key], t);
  return out;
}

export function assertNumericStates(states) {
  const keys = Object.keys(states[0]).join(",");
  states.forEach((state, i) => {
    if (Object.keys(state).join(",") !== keys)
      throw new Error(`state ${i} has different fields from state 0 — they cannot be interpolated`);
    for (const [k, v] of Object.entries(state))
      if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error(`state ${i}.${k} is ${JSON.stringify(v)}; every field of a state must be a finite number`);
  });
  return states;
}

/**
 * The state at a continuous position along the steps. `reduced` is `prefers-reduced-motion`: under
 * it the composition SNAPS to the nearer step, so every reading still arrives — the medium changes,
 * the camera arrives, the axes arrive — with no flight and no dissolve between two of them.
 */
export function stateAt(states, position, reduced) {
  const last = states.length - 1;
  const p = position < 0 ? 0 : position > last ? last : position;
  if (reduced) return states[Math.round(p)];
  const i = Math.min(Math.floor(p), last - 1);
  return lerpState(states[i], states[i + 1], ease(p - i));
}

// ── Where the reader is: READ off the scaffold, never re-derived ───────────────────────────────
//
// Copied verbatim from both single-visual beats, including the reason. Each of them once DERIVED
// this number from panel overlaps against a band at the bottom of the scrollport; the vehicle's
// eighth correction moved the prose into a travelling card and that derivation started returning 0
// for most of every step, so the picture froze while every guard stayed green. The repair was not
// better arithmetic — it was having ONE opinion. `twin-scrolly` publishes `data-progress` on its own
// root on every scroll (the fractional index of the panel on the lane's centre line) and this reads
// it. `data-prose-lane` is deliberately not read: bending that number to make a consumer's sums work
// would be corrupting a value to fit its reader.

export function progressSourceOf(el) {
  let node = el;
  while (node) {
    if (node.getAttribute && node.getAttribute("data-progress") !== null) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * The published position, or a throw naming what it looked for. A default here would be the whole
 * defect back in a quieter form: a composition that silently renders state 0 forever looks exactly
 * like one whose script never ran.
 */
export function readProgress(source) {
  const raw = source == null ? null : source.getAttribute("data-progress");
  const value = Number(raw);
  if (raw === null || raw === "" || !Number.isFinite(value))
    throw new Error(
      `this beat is driven by the scrolly scaffold's continuous signal and read ${JSON.stringify(raw)} ` +
        `for data-progress on the nearest ancestor carrying it (twin-scrolly/assets/interaction.mjs ` +
        `writes it on the .scrolly root on every scroll)`,
    );
  return value;
}

// ── Placement, shared with the scaffold ────────────────────────────────────────────────────────

/** RECLAIMED, and it is 0 — the vehicle's ninth correction sends the prose card down the middle of
 *  the frame and rests it nowhere, so a band at the bottom protects the one place the card never
 *  dwells. The map takes the whole frame, which is also the owner's own instruction for a scrolly
 *  map: *"la map doit prendre toute la largeur."* */
export const PROSE_LANE = 0;

/**
 * The plot box. Its three edges are FRACTIONS of the frame; its floor is not, and that is a
 * correction this beat's own driving forced.
 *
 * `geometry stretches, type does not` is the rule every frame in this project keeps — so the strip
 * of x-tick LABELS below the plot, and the credit below that, are both stacks of type at a fixed
 * pixel size, and reserving room for them as a fraction reserves the wrong number at every height
 * but one. Measured on the first build, where the floor was a flat `0.88`: at 1600×900 the strip had
 * 68px of clear air under it, and at 375×812 — where the fixed header wraps to five lines and the
 * graphic is barely 400px tall — **every one of the seven x-tick labels sat on top of the credit, on
 * 72 of the 139 frames of a sweep.** Reserved in pixels it clears at both, and a shorter frame gives
 * the plot up rather than giving the furniture up.
 */
export const TICK_STRIP_PX = 26;
export const FLOOR_PX = 30;

export function plotBox(frame) {
  return {
    left: 0.115,
    right: 0.955,
    top: 0.14,
    bottom: Math.max(0.45, 1 - (TICK_STRIP_PX + FLOOR_PX) / frame.height),
  };
}

/** The geometry-only viewBox the plot's SVG stretches across. Type is never inside it. */
export const VIEWBOX = { width: 1000, height: 500 };

export const Y_SLOTS = 8;
export const X_SLOTS = 9;

// ── The chart part ─────────────────────────────────────────────────────────────────────────────

/** A 1/2/5 × 10ⁿ step that puts about `slots` ticks across the span. */
export function niceStep(span, slots) {
  const raw = span / Math.max(1, slots - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / magnitude;
  const step = scaled >= 5 ? 10 : scaled >= 2 ? 5 : scaled >= 1 ? 2 : 1;
  return step * magnitude;
}

export function fmt(value, decimals) {
  return value.toFixed(decimals);
}

/**
 * Exactly `slots` tick descriptors for a domain. Slots past the end come back `visible: 0` rather
 * than absent, so the driver never adds or removes a node and the SSR'd and driven markup are the
 * same shape. The precision comes from the STEP and never from the span: taken from the span, a
 * label format flips in the MIDDLE of an axis flight, which reads as a glitch.
 */
export function ticksFor(lo, hi, slots) {
  const step = niceStep(hi - lo, slots);
  const decimals = step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));
  const first = Math.ceil(lo / step) * step;
  const out = [];
  for (let i = 0; i < slots; i++) {
    const value = first + i * step;
    const inside = value <= hi + step * 1e-9;
    out.push({ value, label: fmt(value, decimals), at: (value - lo) / (hi - lo), visible: inside ? 1 : 0 });
  }
  return out;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/** The reading at a fractional year, linearly between the two years that bracket it — so a
 *  highlighted RUN can start and end anywhere and grow continuously as the reader scrolls. */
export function valueAt(readings, year) {
  if (year <= readings[0].year) return readings[0].value;
  const last = readings[readings.length - 1];
  if (year >= last.year) return last.value;
  for (let i = 1; i < readings.length; i++) {
    const b = readings[i];
    if (b.year >= year) {
      const a = readings[i - 1];
      return lerp(a.value, b.value, (year - a.year) / (b.year - a.year));
    }
  }
  return last.value;
}

/**
 * Everything the chart needs, for one state. Pure: no DOM, no React, no colours.
 *
 * `marks` keep FIXED years and move only in opacity — a mark whose year interpolated would slide
 * through decades of meaningless positions on its way from one annotation to the other. They fade
 * over the last 7% of EACH axis, on different sides of it: the X domain ends on a data year, so a
 * mark on the last reading has to be at full strength there and its fade runs outside the edge; every
 * Y domain here is padded away from its own extremes, so the vertical fade runs inside and reaches
 * zero at the edge. That second half was learned on the chart beat, where a mark sank out of the
 * bottom of the plot at opacity 0.54 while its own x was still comfortably inside.
 */
export function chartGeometry(readings, state, marks) {
  const { x0, x1, y0, y1 } = state;
  const sx = (year) => ((year - x0) / (x1 - x0)) * VIEWBOX.width;
  const sy = (value) => (1 - (value - y0) / (y1 - y0)) * VIEWBOX.height;

  const base = readings.map((r) => `${round(sx(r.year))},${round(sy(r.value))}`).join(" ");

  const from = Math.min(state.hiFrom, state.hiTo);
  const to = Math.max(state.hiFrom, state.hiTo);
  const inner = readings.filter((r) => r.year > from && r.year < to);
  const highlight = [
    [from, valueAt(readings, from)],
    ...inner.map((r) => [r.year, r.value]),
    [to, valueAt(readings, to)],
  ]
    .map(([year, value]) => `${round(sx(year))},${round(sy(value))}`)
    .join(" ");

  const point = (year) => {
    const value = valueAt(readings, year);
    const x = sx(year);
    const y = sy(value);
    const EDGE_X = VIEWBOX.width * 0.07;
    const EDGE_Y = VIEWBOX.height * 0.07;
    const inside = Math.min(
      clamp01((x + EDGE_X) / EDGE_X),
      clamp01((VIEWBOX.width + EDGE_X - x) / EDGE_X),
      clamp01(y / EDGE_Y),
      clamp01((VIEWBOX.height - y) / EDGE_Y),
    );
    return { x: round(x), y: round(y), value, inside };
  };

  return {
    base,
    highlight,
    hiOpacity: state.hiOpacity,
    marks: marks.map((mark, i) => {
      const at = point(mark.year);
      return { ...at, opacity: (i === 0 ? state.markA : state.markB) * at.inside, label: mark.label };
    }),
    yTicks: ticksFor(y0, y1, Y_SLOTS),
    xTicks: ticksFor(x0, x1, X_SLOTS),
  };
}

/** viewBox units → a fraction of the whole FRAME, which is how every word on the chart is placed:
 *  type is HTML at a fixed pixel size over a plot that stretches. */
export function toFrame(x, y, frame) {
  const plot = plotBox(frame);
  return [
    plot.left + (plot.right - plot.left) * (x / VIEWBOX.width),
    plot.top + (plot.bottom - plot.top) * (y / VIEWBOX.height),
  ];
}

export function pct(v) {
  return `${(v * 100).toFixed(3)}%`;
}

/** An annotation hangs above its point and flips to the inside near an edge, so it can never be the
 *  thing that leaves the frame. */
export function annotationPlacement(x, y, frame) {
  const [fx, fy] = toFrame(x, y, frame);
  const nearRight = fx > 0.62;
  const nearLeft = fx < 0.2;
  return {
    left: pct(fx),
    top: pct(fy),
    transform: nearRight ? "translate(-100%, -145%)" : nearLeft ? "translate(0, -145%)" : "translate(-50%, -145%)",
  };
}

// ── The map part ───────────────────────────────────────────────────────────────────────────────
//
// The projection is Web Mercator at MapLibre's own 512px tile size, so a camera resolved here and a
// camera handed to MapLibre are the same camera by construction rather than by agreement. The map
// beat paid for two opinions of one number twice; this file has one.

export const TILE_SIZE = 512;

/** The zoom the vector overlay's own path coordinates are written at. Any value works — it only
 *  fixes the units the paths are in — and 14 keeps this beat's deepest camera near scale 1, where a
 *  browser's own transform arithmetic is most comfortable. */
export const REF_ZOOM = 14;
export const REF_WORLD = TILE_SIZE * 2 ** REF_ZOOM;

export function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

export function inverseMercatorY(y) {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
}

/** Longitude → the normalised world X in [0,1]. */
export function normX(lon) {
  return (lon + 180) / 360;
}

/** Mercator y → the normalised world Y in [0,1], 0 at the top. */
export function normY(merc) {
  return 0.5 - merc / (2 * Math.PI);
}

/**
 * The camera, resolved against the box it is actually drawn in.
 *
 * `fit` is a FIELD OF THE STATE, interpolated like any other, and it is the map beat's own finding:
 * contain and cover are both wrong on their own. Contain a close reading into a wide frame and a
 * tall subject zooms OUT; cover an overview and half of it is cropped while the sentence over it
 * names the part that was cut. So an overview carries `fit: 0` and a close reading carries a higher
 * one, and the scale between them is interpolated in LOG space — a constant-rate zoom in what the
 * eye sees rather than a flight that races at the start and crawls at the end.
 *
 * There is no `MAX_SCALE` here and that is a real difference from the map beat, not an omission: its
 * clamp exists to stop a BAKED PLATE being magnified past its own raster. This beat has no plate —
 * its flight spans about 11× of magnification, which no single plate can hold — so the ceiling it
 * protects does not exist.
 */
export function resolveCamera(state, frame) {
  const spanNX = Math.exp(state.mapLogSpanLon) / 360;
  const spanNY = Math.exp(state.mapLogSpanMerc) / (2 * Math.PI);
  const contain = Math.min(frame.width / spanNX, frame.height / spanNY);
  const cover = Math.max(frame.width / spanNX, frame.height / spanNY);
  const worldPx = Math.exp(lerp(Math.log(contain), Math.log(cover), state.mapFit));
  const cx = normX(state.mapLon);
  const cy = normY(state.mapMercY);
  return {
    worldPx,
    zoom: Math.log2(worldPx / TILE_SIZE),
    centre: [state.mapLon, inverseMercatorY(state.mapMercY)],
    cx,
    cy,
    width: frame.width,
    height: frame.height,
  };
}

/** A place, in the frame's own pixels. */
export function projectLonLat(point, camera) {
  return [
    (normX(point[0]) - camera.cx) * camera.worldPx + camera.width / 2,
    (normY(mercatorY(point[1])) - camera.cy) * camera.worldPx + camera.height / 2,
  ];
}

/**
 * The transform that moves the pre-drawn vector overlay under this camera. The paths are written
 * ONCE, at `REF_ZOOM`, relative to `origin` — so a 2,081-point park outline is never re-serialised
 * on an animation frame, which is what re-projecting per frame would cost.
 */
export function cameraTransform(camera, origin) {
  const scale = camera.worldPx / REF_WORLD;
  const tx = camera.width / 2 + (origin.nx - camera.cx) * camera.worldPx;
  const ty = camera.height / 2 + (origin.ny - camera.cy) * camera.worldPx;
  return `translate(${tx}px, ${ty}px) scale(${scale})`;
}

/** Ground metres per delivered pixel, at the camera's own latitude. */
export function metresPerPixel(camera) {
  const lat = camera.centre[1];
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / camera.worldPx;
}

const SCALE_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

/**
 * A scale bar the reader can measure the picture against — the one piece of furniture that turns a
 * photograph's basin and a continental outline into the same kind of statement. It picks the largest
 * round distance whose bar is at most `maxPx` wide, so the bar's LENGTH changes on every frame the
 * camera moves and its label changes when the round number does.
 */
export function scaleBar(camera, maxPx) {
  const mpp = metresPerPixel(camera);
  let chosen = SCALE_STEPS[0];
  for (const km of SCALE_STEPS) if ((km * 1000) / mpp <= maxPx) chosen = km;
  return {
    km: chosen,
    px: (chosen * 1000) / mpp,
    label: chosen < 1 ? `${chosen * 1000} m` : `${chosen} km`,
  };
}

/**
 * A LABEL IS NEVER CUT DOWN ITS SIDE BY THE PROSE CARD — the map beat's own rule, copied with its
 * reason. The vehicle's ninth correction sends an opaque card down the middle of the frame, and its
 * discipline file states the only guarantee left: a label UNDER the card reads as absent, which is
 * what a card over a picture means, but a label the card's vertical edge cuts down the middle reads
 * as broken text for every frame the card spends at that row. So this returns the nearest centre
 * that is wholly inside the stripe or wholly outside it. `stripe` is null on a phone, where the card
 * is edge to edge and has no interior edge to cut anything against.
 */
export function avoidStripe(x, halfWidth, stripe, frame) {
  if (!stripe) return x;
  const left = x - halfWidth;
  const right = x + halfWidth;
  const straddles = (stripe.left > left && stripe.left < right) || (stripe.right > left && stripe.right < right);
  if (!straddles) return x;
  const options = [];
  if (halfWidth * 2 <= stripe.right - stripe.left)
    options.push(Math.min(Math.max(x, stripe.left + halfWidth), stripe.right - halfWidth));
  if (stripe.left - halfWidth >= halfWidth) options.push(stripe.left - halfWidth);
  if (stripe.right + halfWidth <= frame.width - halfWidth) options.push(stripe.right + halfWidth);
  if (options.length === 0) return x;
  return options.reduce((best, o) => (Math.abs(o - x) < Math.abs(best - x) ? o : best));
}

// ── The photograph part ────────────────────────────────────────────────────────────────────────
//
// The one part with nothing to copy from: neither single-visual beat carries a photograph, and the
// image beat that does has no scroll signal inside it — it hands the vehicle one frame per step.

/**
 * The photograph's own box inside the frame: CONTAINED, never cropped — the owner's ruling, *"garder
 * le ratio, remplir jusqu'à l'axe qui contraint en premier"*. Four frames normalised to one box is
 * the whole claim of a repeat-photography sequence, and a cover crop would make the comparison be
 * between two different crops at two different viewports.
 */
export function containBox(frame, aspect) {
  const width = Math.min(frame.width, frame.height * aspect);
  const height = width / aspect;
  return {
    left: (frame.width - width) / 2,
    top: (frame.height - height) / 2,
    width,
    height,
  };
}

/**
 * How present each photograph is at a fractional index. A frame is at full strength on its own
 * integer and gone one index away, so the sequence DISSOLVES continuously as the reader scrolls
 * rather than cutting at a boundary.
 */
export function photoOpacities(at, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(clamp01(1 - Math.abs(at - i)));
  return out;
}

/** Which photograph the reader is mostly looking at — the one whose credit is shown. */
export function dominantPhoto(at, count) {
  return Math.max(0, Math.min(count - 1, Math.round(at)));
}

/**
 * WHERE THE READER IS IN TIME, and the reason this track has any geometry at all.
 *
 * A photograph sequence's only native motion is a dissolve, which is an opacity and nothing else.
 * That is not a defect to hide: it is what a photograph does. What this beat adds is the fact the
 * four frames cannot state on their own — that the gaps between them are 43, 17 and 11 years, so
 * the reader is NOT watching an even march through time. The rail is a real time axis, the cursor is
 * the reader's own position on it, and both are computed from `photographs.csv`.
 *
 * `at` is the fractional index; the returned `year` is the year at that index, interpolated between
 * the two photographs that bracket it, and `t` is that year's position on a LINEAR axis from the
 * first to the last. The two are deliberately different numbers: index 1.5 is halfway between two
 * photographs and 0.55 of the way through the years they span.
 */
export function railAt(years, at) {
  const i = Math.max(0, Math.min(years.length - 2, Math.floor(at)));
  const f = clamp01(at - i);
  const year = lerp(years[i], years[i + 1], f);
  const first = years[0];
  const last = years[years.length - 1];
  return {
    year,
    t: (year - first) / (last - first),
    ticks: years.map((y) => (y - first) / (last - first)),
  };
}

// ── The driver (browser only) ──────────────────────────────────────────────────────────────────

/* eslint-env browser */

/**
 * Where the prose card's own vertical edges are, in this frame's coordinates, or null when it has
 * none inside the frame. MEASURED off the rendered card rather than re-derived from the vehicle's
 * own `min(46ch, 100%)` and its 600px breakpoint — a second copy of two numbers the scaffold owns
 * is a second opinion, and this project has paid for one of those twice.
 */
export function stripeOf(root, frame) {
  const doc = root.ownerDocument;
  const card = doc.querySelector(".step-panel");
  if (!card) return null;
  const box = card.getBoundingClientRect();
  const own = root.getBoundingClientRect();
  const left = box.left - own.left;
  const right = box.right - own.left;
  if (left <= 1 && right >= frame.width - 1) return null;
  return { left, right };
}

/**
 * Move the persistent visual OUT of the per-step frame stack.
 *
 * The scaffold's contract is N pictures of which exactly one is painted. This beat has ONE
 * composition whose contents change; left inside step 1's wrapper it would be faded out the moment
 * step 2 became active. Moved one level up into the stack it is a permanent sibling the swap never
 * touches — and with JavaScript off it stays where it was SSR'd, inside the wrapper the scaffold
 * marks active by default, so a no-JS reader still gets the whole of the first reading.
 *
 * Reported, not patched around, exactly as both single-visual beats report it: the vehicle has no
 * way for a beat to declare "my visual is one persistent element". This is what that missing
 * declaration costs — and this beat is the case that makes it worth fixing, because "N pictures,
 * one painted" is very nearly what a multi-medium scrolly wants and is not quite it.
 */
export function detachVisual(root) {
  const wrapper = root.parentElement;
  const stack = wrapper && wrapper.parentElement;
  if (!stack) return;
  stack.appendChild(root);
  root.style.position = "absolute";
  root.style.inset = "0";
  root.setAttribute("aria-hidden", "true");
  for (const sibling of Array.from(stack.children)) if (sibling !== root) sibling.style.pointerEvents = "none";
}

/**
 * Which medium the composition is mostly showing. Used for ONE thing — the credit line, which has
 * to name the source of what the reader is actually looking at — and deliberately not used to decide
 * anything about what is drawn. Nothing branches on it; every layer is painted at its own opacity on
 * every frame whatever this says.
 */
export function dominantMedium(state) {
  const entries = [
    ["photo", state.photoOpacity],
    ["map", state.mapOpacity],
    ["chart", state.chartOpacity],
  ];
  return entries.reduce((best, e) => (e[1] > best[1] ? e : best))[0];
}

/**
 * `config` carries what the composition needs and cannot derive: the photograph years and credits,
 * the chart's readings and marks, the vector overlay's origin, the two map labels, and the credit
 * line per medium. `onCamera` is the LIVE MAP's subscription — `(view)` on every painted frame, or
 * null for a page with no live layer (which is what a committed proof carrying the delivery
 * placeholder is). It is a parameter rather than a call into `live-scroll-map.mjs` because this file
 * is the one thing that decides where the camera is, and the live layer must stay something that can
 * fail without taking the beat with it.
 */
export function initMixedScrolly(root, config, states, onCamera) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  detachVisual(root);

  const progressSource = progressSourceOf(root);
  if (!progressSource)
    throw new Error(
      "no ancestor of this beat's visual carries data-progress — twin-scrolly's scaffold publishes it " +
        "on the .scrolly root, and this beat is driven by nothing else",
    );

  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const layers = {
    photo: root.querySelector('[data-layer="photo"]'),
    map: root.querySelector('[data-layer="map"]'),
    chart: root.querySelector('[data-layer="chart"]'),
  };
  for (const [name, node] of Object.entries(layers))
    if (!node) throw new Error(`this beat's composition carries no [data-layer="${name}"] — all three media are load-bearing`);

  const nodes = {
    photoBox: root.querySelector("[data-part=photo-box]"),
    photos: Array.from(root.querySelectorAll("[data-photo]")),
    year: root.querySelector("[data-part=year]"),
    railCursor: root.querySelector("[data-part=rail-cursor]"),
    camera: root.querySelector("[data-part=camera]"),
    shapes: Array.from(root.querySelectorAll("[data-shape]")),
    markers: Array.from(root.querySelectorAll("[data-marker]")),
    labels: Array.from(root.querySelectorAll("[data-label]")),
    leaders: root.querySelector("[data-part=leaders]"),
    scaleRule: root.querySelector("[data-part=scale-rule]"),
    scaleText: root.querySelector("[data-part=scale-text]"),
    plot: root.querySelector("[data-part=plot]"),
    base: root.querySelector("[data-part=base]"),
    hi: root.querySelector("[data-part=highlight]"),
    marks: Array.from(root.querySelectorAll("[data-mark]")),
    annotations: Array.from(root.querySelectorAll("[data-annotation]")),
    yTicks: Array.from(root.querySelectorAll("[data-ytick]")),
    yGrid: Array.from(root.querySelectorAll("[data-ygrid]")),
    xTicks: Array.from(root.querySelectorAll("[data-xtick]")),
    credit: root.querySelector("[data-part=credit]"),
  };

  let queued = false;
  let lastPosition = -1;

  function paint() {
    queued = false;
    const position = readProgress(progressSource);
    if (Math.abs(position - lastPosition) < 0.0005) return;
    lastPosition = position;
    const state = stateAt(states, position, reduced.matches);
    const box = root.getBoundingClientRect();
    const frame = { width: box.width, height: box.height };
    const stripe = stripeOf(root, frame);

    root.dataset.position = position.toFixed(3);

    // ── the three presences, written first: everything below is painted whatever they are ──────
    layers.photo.style.opacity = String(state.photoOpacity);
    layers.map.style.opacity = String(state.mapOpacity);
    layers.chart.style.opacity = String(state.chartOpacity);

    // ── the photograph track ───────────────────────────────────────────────────────────────────
    const photoBox = containBox(frame, config.photoAspect);
    nodes.photoBox.style.left = `${photoBox.left}px`;
    nodes.photoBox.style.top = `${photoBox.top}px`;
    nodes.photoBox.style.width = `${photoBox.width}px`;
    nodes.photoBox.style.height = `${photoBox.height}px`;
    const presences = photoOpacities(state.photoAt, nodes.photos.length);
    nodes.photos.forEach((node, i) => {
      node.style.opacity = String(presences[i]);
    });
    const rail = railAt(config.photoYears, state.photoAt);
    if (nodes.year) nodes.year.textContent = String(Math.round(rail.year));
    if (nodes.railCursor) nodes.railCursor.style.left = `${(rail.t * 100).toFixed(3)}%`;

    // ── the map track ──────────────────────────────────────────────────────────────────────────
    const camera = resolveCamera(state, frame);
    nodes.camera.style.transform = cameraTransform(camera, config.origin);
    // THE STROKE IS DIVIDED BY THE CAMERA'S OWN SCALE, and `vector-effect="non-scaling-stroke"` is
    // NOT what does it. That attribute compensates for transforms INSIDE the SVG; this camera is a
    // CSS transform on an ancestor `<div>`, which scales the rasterised result and the stroke with
    // it. Measured by opening the render: at the park camera the scale is 0.044, so the park's
    // 2px outline was drawn at 0.09px — a dotted hairline, which is exactly what the screenshot
    // showed — while at the cirque camera the scale is 1.57 and the glacier's 3px outline came out
    // at 4.7px. One outline too faint to see and one too heavy, from the same missing division.
    const strokeScale = camera.worldPx / REF_WORLD;
    for (const shape of nodes.shapes) {
      const base = config.strokes[shape.dataset.shape];
      if (base) shape.setAttribute("stroke-width", String(base / strokeScale));
    }
    if (onCamera) onCamera({ center: camera.centre, zoom: camera.zoom });
    const gates = [state.markViewpoint, state.markGlacier];
    let leaderPath = "";
    nodes.markers.forEach((node, i) => {
      const [x, y] = projectLonLat(config.marks[i].at, camera);
      node.style.left = `${x.toFixed(2)}px`;
      node.style.top = `${y.toFixed(2)}px`;
      node.style.opacity = String(gates[i]);
    });
    nodes.labels.forEach((node, i) => {
      const opacity = gates[i];
      node.style.opacity = String(opacity);
      if (opacity < 0.02) return;
      const [ax, ay] = projectLonLat(config.marks[i].at, camera);
      // The pure placement clamps against the frame; this clamps against the LABEL'S OWN measured
      // box, which no pure function can know — the map beat found labels centred on a legal point
      // and still hanging half off a 375px screen.
      const halfWidth = node.offsetWidth / 2 + 6;
      const height = node.offsetHeight + 6;
      const wantedY = ay - config.lift;
      const x = avoidStripe(Math.max(halfWidth, Math.min(frame.width - halfWidth, ax)), halfWidth, stripe, frame);
      const y = Math.max(height, Math.min(frame.height - 24, wantedY));
      node.style.left = `${x.toFixed(2)}px`;
      node.style.top = `${y.toFixed(2)}px`;
      if (Math.abs(x - ax) > 1 || Math.abs(y - wantedY) > 1) leaderPath += `M${x.toFixed(1)} ${(y + 6).toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`;
    });
    if (nodes.leaders) nodes.leaders.setAttribute("d", leaderPath);
    const bar = scaleBar(camera, Math.min(300, frame.width * 0.34));
    if (nodes.scaleRule) nodes.scaleRule.style.width = `${bar.px.toFixed(1)}px`;
    if (nodes.scaleText) nodes.scaleText.textContent = bar.label;

    // ── the chart track ────────────────────────────────────────────────────────────────────────
    const plot = plotBox(frame);
    const geometry = chartGeometry(config.readings, state, config.marksChart);
    if (nodes.plot) nodes.plot.style.height = pct(plot.bottom - plot.top);
    nodes.base.setAttribute("points", geometry.base);
    nodes.hi.setAttribute("points", geometry.highlight);
    nodes.hi.style.opacity = String(geometry.hiOpacity);
    geometry.marks.forEach((mark, i) => {
      const node = nodes.marks[i];
      if (node) {
        const [dx, dy] = toFrame(mark.x, mark.y, frame);
        node.style.left = pct(dx);
        node.style.top = pct(dy);
        node.style.opacity = String(mark.opacity);
      }
      const annotation = nodes.annotations[i];
      if (annotation) {
        const place = annotationPlacement(mark.x, mark.y, frame);
        annotation.style.left = place.left;
        annotation.style.top = place.top;
        annotation.style.transform = place.transform;
        annotation.style.opacity = String(mark.opacity);
      }
    });
    geometry.yTicks.forEach((tick, i) => {
      const node = nodes.yTicks[i];
      if (!node) return;
      const [, fy] = toFrame(0, (1 - tick.at) * VIEWBOX.height, frame);
      node.style.top = pct(fy);
      node.style.opacity = String(tick.visible);
      if (node.textContent !== tick.label) node.textContent = tick.label;
      const rule = nodes.yGrid[i];
      if (rule) {
        const y = String((1 - tick.at) * VIEWBOX.height);
        rule.setAttribute("y1", y);
        rule.setAttribute("y2", y);
        rule.style.opacity = String(tick.visible * 0.28);
      }
    });
    geometry.xTicks.forEach((tick, i) => {
      const node = nodes.xTicks[i];
      if (!node) return;
      const [fx] = toFrame(tick.at * VIEWBOX.width, 0, frame);
      node.style.left = pct(fx);
      // The strip's own row is re-resolved every frame, not left where the SSR put it: `plotBox`'s
      // floor is a PIXEL reserve subtracted from the frame's height, so it moves with the height.
      node.style.top = `calc(${pct(plot.bottom)} + 6px)`;
      if (node.textContent !== tick.label) node.textContent = tick.label;
      // HIDDEN WHOLE RATHER THAN CUT IN HALF. A y tick lives in the frame's left gutter, outside the
      // card's stripe at every width; an x tick has to sit under its own value and cannot move, so at
      // some widths one of them lands exactly on the card's vertical edge. Measured before this
      // existed: at 1280×800, "2010" was sliced down the middle on 13 frames of every sweep and
      // "2000" on one. There are nine of these labels and the axis reads perfectly with eight, so
      // the one under the edge is switched off — which is the vehicle's own answer for a label a
      // travelling card meets (`scrolly-discipline.md`: hidden whole is what a card over a picture
      // means, broken text is not).
      let cut = false;
      if (stripe && tick.visible) {
        const half = node.offsetWidth / 2;
        const centre = fx * frame.width;
        const left = centre - half;
        const right = centre + half;
        // The margin runs OUTWARD (1.5px) while `scroll-report.mjs`'s own `straddles` runs inward
        // (0.5px), so the fix is strictly more conservative than the guard that checks it. At exactly
        // equal thresholds one label of nine slipped through per sweep at 1280x800 — sub-pixel
        // rounding between a `left` written to three decimals and a box the browser lays out.
        cut =
          (stripe.left > left - 1.5 && stripe.left < right + 1.5) ||
          (stripe.right > left - 1.5 && stripe.right < right + 1.5);
      }
      node.style.opacity = String(cut ? 0 : tick.visible);
    });

    // ── the one credit, naming what is on the screen ───────────────────────────────────────────
    const medium = dominantMedium(state);
    const credit =
      medium === "photo" ? config.credits.photo[dominantPhoto(state.photoAt, nodes.photos.length)] : config.credits[medium];
    if (nodes.credit && nodes.credit.textContent !== credit) nodes.credit.textContent = credit;

    // Published on the element itself, because a screenshot proves a frame was painted and never
    // proves WHICH state its geometry is in — and "the visual arrives at the wrong moment" is a
    // claim about exactly that. `medium` and the three presences are here so a driving run can
    // measure the HANDOVER as well as the navigation inside a medium.
    root.dataset.state = JSON.stringify({
      medium,
      photoAt: Number(state.photoAt.toFixed(4)),
      photoOpacity: Number(state.photoOpacity.toFixed(4)),
      mapOpacity: Number(state.mapOpacity.toFixed(4)),
      chartOpacity: Number(state.chartOpacity.toFixed(4)),
      year: Number(rail.year.toFixed(2)),
      zoom: Number(camera.zoom.toFixed(4)),
      lon: Number(camera.centre[0].toFixed(5)),
      lat: Number(camera.centre[1].toFixed(5)),
      metresPerPixel: Number(metresPerPixel(camera).toFixed(3)),
      x0: Number(state.x0.toFixed(3)),
      x1: Number(state.x1.toFixed(3)),
      y0: Number(state.y0.toFixed(3)),
      y1: Number(state.y1.toFixed(3)),
      hiFrom: Number(state.hiFrom.toFixed(3)),
      hiTo: Number(state.hiTo.toFixed(3)),
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    view.requestAnimationFrame(paint);
  }

  // `capture: true` on the window catches a scroll from ANY scroller, including the inner column the
  // fixed-page model actually scrolls. The scaffold listens on that column in the TARGET phase, so
  // `data-progress` is already written for this frame by the time this rAF runs.
  view.addEventListener("scroll", schedule, { capture: true, passive: true });
  // INVALIDATED rather than merely re-scheduled on a size change: the camera and the photograph's
  // contained box both resolve against the frame's own width and height, and a published progress
  // can be bit-identical across a resize while the box it is drawn in is a different shape.
  const invalidate = () => {
    lastPosition = -1;
    schedule();
  };
  view.addEventListener("resize", invalidate, { passive: true });
  view.addEventListener("orientationchange", invalidate, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener("change", invalidate);
  doc.addEventListener("visibilitychange", schedule);
  schedule();
  return { paint };
}
