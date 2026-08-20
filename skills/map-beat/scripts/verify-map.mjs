// Verifies what a MAP BEAT carries, after the render ladder has proved it exists.
//
// `render-map.mjs` runs the join and the claim check and produces a still, a final frame and an mp4.
// Nothing until now asked the two questions this format's own doctrine spends most of its words on:
// does the baked plate describe the same geography the marks were projected into, and is it on the
// same side of the theme as the ground the beat declares.
//
// THE SUBSTRATE IS THE BAKE'S OWN OUTPUT. `bake-plate.mjs` writes `plate/plate.png` and
// `plate/geometry.json` beside each other, and `geometry.json` records the FRAME the marks were
// projected into. Both questions are therefore decidable from two files — exactly, with no
// rasteriser, no browser and no screenshot. `plate/plate.png` is decoded by this skill's own
// `compare-png.mjs`, which is why the plate's luminance needs no canvas either.
//
// WHY NOT `projectionDisagreements`. That decision compares an `<img>`'s CSS `object-fit` against the
// `preserveAspectRatio` of the SVG drawn over it. Measured across this tree, `object-fit` appears in
// exactly two files, both scrolly IMAGE beats, and in no map component at all: a map beat composites
// its plate as an `<image>` INSIDE the marks' own SVG, in the marks' own coordinate system, so there
// are not two projections that could disagree. The same DEFECT is reachable here by another
// mechanism, and `plateMatchesGeometry` is what decides it.
//
// `renderStill` (`render-still.mjs`) also writes the format's own STILL — an SVG with the same baked
// plate inlined as a `data:` URI — beside the PNG it rasterises from. That is a self-contained
// delivered file inlining an asset, the exact shape `duplicatedPayload` was written for; it lives
// here for the same reason the other two do.
//
// AND THE VIDEO GENRE OWES ONE MORE. This format's own doctrine ships both static and video from
// one component family (`assets/timing.ts`, six `*Video.tsx` proof beats declaring a `total` frame
// count), which is exactly the shape `chart-video` earned `neverArrives` for: a ramp over an
// already-clamped progress whose input range ends above 1 never reaches its own end, and the mark
// it fades in is still fading when the reader's video stops. Copied from `chart-video`, not
// reached by import — a skill never crosses another skill's boundary at runtime.

import { decodePng } from "./compare-png.mjs";

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = [
  "plateFollowsGround",
  "revealDashInScreenSpace",
  "plateMatchesGeometry",
  "duplicatedPayload",
  "neverArrives",
  "csvSplitByHand",
];

/** Below this many base64 characters a repeated inline asset is an icon or a font scrap, not the
 *  defect: reporting those would bury the 1.33 MB one under a list of nothing. */
const PAYLOAD_FLOOR = 1024;

/** Every data: asset inlined more than once, worst waste first. A weight ceiling would have been
 *  arbitrary — this tree's own image scrolly is legitimately 3 MB — but a second copy of one asset
 *  is bytes no reader benefits from, whatever the beat, and it is the file-side fingerprint of a
 *  visual duplicated into every step frame. */
export function duplicatedPayload(html) {
  const blobs = new Map();
  for (const match of html.matchAll(/data:[a-z/+.-]+;base64,([A-Za-z0-9+/=]+)/gi)) {
    const body = match[1];
    if (body.length < PAYLOAD_FLOOR) continue;
    const seen = blobs.get(body) ?? { copies: 0, bytes: body.length };
    seen.copies += 1;
    blobs.set(body, seen);
  }
  return [...blobs.values()]
    .filter((b) => b.copies > 1)
    .map((b) => ({
      copies: b.copies,
      bytes: b.bytes,
      wastedBytes: (b.copies - 1) * b.bytes,
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes);
}

/** The relative luminance of a CSS colour, or `null` when the string is not a painted colour.
 *
 *  THE `null` IS THE POINT. This guard failed three correct beats by reading
 *  `getComputedStyle(".scrolly").backgroundColor` — which is `rgba(0, 0, 0, 0)` on an element that
 *  sets no background — and taking its zeros for black. A transparent surface has not been measured;
 *  it has been missed. Returning a number there is how a broken instrument reports confidently.
 *
 *  Translucent is NOT transparent: `rgba(255,255,255,0.5)` is paint, and its own colour is the best
 *  reading available without compositing the whole stack. */
export function surfaceLuminance(css) {
  if (typeof css !== "string") return null;
  const value = css.trim();
  if (!value || value === "transparent" || value === "none") return null;
  let channels = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    channels = [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16));
  } else if (/^rgba?\(/i.test(value)) {
    const parts = value.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return null;
    if (parts.length >= 4 && Number(parts[3]) === 0) return null;
    channels = parts.slice(0, 3).map(Number);
  }
  if (!channels || channels.some((c) => !Number.isFinite(c))) return null;
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(channels[0]) +
    0.7152 * channel(channels[1]) +
    0.0722 * channel(channels[2])
  );
}

/** The relative luminance of a CSS colour, or `null` when the string is not a painted colour.
 *
 *  THE `null` IS THE POINT. This guard failed three correct beats by reading
 *  `getComputedStyle(".scrolly").backgroundColor` — which is `rgba(0, 0, 0, 0)` on an element that
 *  sets no background — and taking its zeros for black. A transparent surface has not been measured;
 *  it has been missed. Returning a number there is how a broken instrument reports confidently.
 *
 *  Translucent is NOT transparent: `rgba(255,255,255,0.5)` is paint, and its own colour is the best
 *  reading available without compositing the whole stack. */
export function surfaceLuminance(css) {
  if (typeof css !== "string") return null;
  const value = css.trim();
  if (!value || value === "transparent" || value === "none") return null;
  let channels = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    channels = [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16));
  } else if (/^rgba?\(/i.test(value)) {
    const parts = value.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return null;
    if (parts.length >= 4 && Number(parts[3]) === 0) return null;
    channels = parts.slice(0, 3).map(Number);
  }
  if (!channels || channels.some((c) => !Number.isFinite(c))) return null;
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(channels[0]) +
    0.7152 * channel(channels[1]) +
    0.0722 * channel(channels[2])
  );
}

/** The two sides a mid-grey band apart: below this a surface is DARK, above it LIGHT, and in
 *  between it belongs to neither and this guard says nothing. */
const DARK_SIDE = 0.25;
const LIGHT_SIDE = 0.6;

/** Whether a baked plate is on the same side as the ground its beat declared.
 *
 *  The delivered route beat declared `--ground: #16191B` and painted every label white on a dark
 *  halo — right for that ground — over a basemap baked in `dataviz-light`. The furniture was correct
 *  and unreadable, which is what correct furniture looks like over the wrong ground. Both sides are
 *  numbers, so a machine can settle it; what it must not do is prescribe a direction, since a dark
 *  beat and a light one are equally legitimate. Only the two-sided disagreement is refused. */

export function plateFollowsGround({ ground, plate }) {
  if (plate == null || ground == null) return true;
  const side = (value) => (value < DARK_SIDE ? "dark" : value > LIGHT_SIDE ? "light" : "middle");
  const one = side(ground);
  const two = side(plate);
  if (one === "middle" || two === "middle") return true;
  return one === two;
}

/** Marks whose dash MEASURES their own path while being computed in screen space — the reveal that
 *  cannot work, and the one this tree shipped for months without seeing.
 *
 *  `vector-effect: non-scaling-stroke` takes the stroke, and with it the dash pattern, out of the
 *  path's own user units. A dash pattern repeats forever, so a pattern one path-length long measured
 *  against a line the camera has scaled up draws dash, gap, dash: a head, a hole and a tail, sliding
 *  together as the offset moves. A DECORATIVE dash — a gridline, a leader — belongs in screen space
 *  and is left alone here; what is refused is a dash that measures, recognised by a declared
 *  `pathLength` or by an offset that is not zero. */
export function revealDashInScreenSpace(marks) {
  return marks
    .filter((mark) => mark.vectorEffect === "non-scaling-stroke")
    .filter(
      (mark) => mark.pathLength != null || Number.parseFloat(mark.dashoffset) !== 0,
    )
    .map((mark) => mark.id);
}

/** Every JSX element in `source` that carries a dash, as the shape `revealDashInScreenSpace` reads.
 *
 *  READS A COMPONENT OR THE FILE IT PRODUCES. The four attributes it needs are written literally in
 *  both — camelCase in JSX, kebab-case in rendered SVG — as an attribute, inside a `style={{ }}`
 *  object, or inside a `style="a:b;c:d"` string. One reader for both is what lets a format verify its
 *  own SOURCE where that is the only thing that exists (a chart video's marks live only inside
 *  Remotion's render) and its own ARTIFACT where the artifact is a real file (a web beat ships
 *  self-contained HTML).
 *
 *  Deliberately a text scan and not a parser: a scan cannot be wrong about an attribute that is not
 *  there. What it cannot see is a dash assembled elsewhere and spread in — stated in the
 *  test's header, and the reason the walking test asserts how MANY marks it found.
 *
 *  AN ABSENT OFFSET IS ZERO, NOT UNKNOWN. The DOM reader this mirrors gets `"0px"` from a computed
 *  style for an element that declares no offset; here the attribute is simply missing, and reading
 *  that as unknown would refuse every decorative rule in the corpus. */
export function marksFromSource(source, where) {
  const marks = [];
  // One JSX opening tag: `<name ... >` or `<name ... />`. `[^<>]` means a `>` inside a brace
  // expression (`strokeDasharray={a > b ? x : y}`) would cut the tag short — measured: zero such
  // cases, the reader finds 22 of the corpus's 22 literal `strokeDasharray` occurrences, and the
  // walking test asserts that count so the day one appears the reader fails instead of skipping it.
  for (const match of source.matchAll(/<([A-Za-z][\w.]*)\s([^<>]*?)\/?>/g)) {
    const [whole, tag, attributes] = match;
    if (!/stroke-?[Dd]ash/i.test(attributes)) continue;
    /** Balance from the `{` at `open`, and return what is inside it. */
    const braced = (source, open) => {
      let depth = 0;
      let at = open;
      for (; at < source.length; at++) {
        if (source[at] === "{") depth++;
        else if (source[at] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      return source.slice(open + 1, at);
    };
    // `style={{ strokeDasharray: 1, strokeDashoffset: 1 - reached }}` is how a reveal is written as
    // often as the attribute form is — every route reveal in this tree uses it. A reader that knew
    // only attributes returned a mark with no offset and PASSED it, which is worse than not reading
    // the element at all.
    // A RENDERED artifact writes the same thing as a CSS string — `style="stroke-dasharray:1;
    // stroke-dashoffset:0.4"` — so both forms are read here and one reader serves a component and
    // the file it produces. `,` ends a property in the object form and `;` in the string form.
    const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const styleAt = /\bstyle=\{\{/.exec(attributes);
    // Balanced from the INNER brace, so what comes back is the object's contents without its own
    // braces — otherwise the last property runs to the closing `}` and reads as `1 - reached }`.
    const cssAt = /\bstyle="([^"]*)"/.exec(attributes);
    const style = styleAt
      ? braced(attributes, styleAt.index + styleAt[0].length - 1)
      : (cssAt?.[1] ?? "");
    const read = (name) => {
      const quoted = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`).exec(attributes);
      if (quoted) return quoted[2] ?? quoted[3];
      const opened = new RegExp(`\\b${name}=\\{`).exec(attributes);
      // Balance the braces, so `{\`${a} ${b}\`}` comes back whole.
      if (opened) return braced(attributes, opened.index + opened[0].length - 1).trim();
      const inStyle = new RegExp(`\\b${kebab(name)}\\s*:|\\b${name}\\s*:`).exec(style);
      if (!inStyle) return null;
      let at = inStyle.index + inStyle[0].length;
      let depth = 0;
      const start = at;
      for (; at < style.length; at++) {
        const c = style[at];
        if (c === "{" || c === "(" || c === "[") depth++;
        else if (c === "}" || c === ")" || c === "]") depth--;
        else if ((c === "," || c === ";") && depth <= 0) break;
      }
      return style.slice(start, at).trim();
    };
    const line = source.slice(0, match.index).split("\n").length;
    marks.push({
      id: `${where}:${line} ${tag}`,
      dasharray: read("strokeDasharray") ?? read("stroke-dasharray"),
      dashoffset: read("strokeDashoffset") ?? read("stroke-dashoffset") ?? "0",
      pathLength: read("pathLength"),
      vectorEffect: read("vectorEffect") ?? read("vector-effect"),
    });
    void whole;
  }
  return marks;
}


/** How far a plate's aspect ratio may sit from its frame's before it letterboxes. A frame is
 *  integers and a ratio is not: 936x827 baked at 2x is 1872x1654, and the two ratios agree to five
 *  decimals. One part in a thousand covers that rounding and nothing a reader could see — the
 *  smallest real disagreement in this corpus's history was 8%. */
const ASPECT_SLACK = 0.001;

/** Does the baked plate describe the frame its own marks were projected into?
 *
 *  A map beat draws the plate as one `<image>` filling the frame. An `<image>` whose own aspect ratio
 *  differs from the box it is given is letterboxed by the default `preserveAspectRatio="xMidYMid
 *  meet"` — scaled down and centred — so the basemap shifts and shrinks while the projected marks do
 *  not, and every one of them lands somewhere the basemap never claimed. Nothing in the render fails;
 *  the picture is simply wrong, which is the same shape as the cropped-plate defect a scrolly earned
 *  its projection guard from.
 *
 *  Returns the numbers as well as the verdict: a failure a reader cannot act on is half a failure. */
export function plateMatchesGeometry({ plate, frame }) {
  const plateRatio = plate.width / plate.height;
  const frameRatio = frame.width / frame.height;
  const drift = Math.abs(plateRatio - frameRatio) / frameRatio;
  return {
    ok: drift <= ASPECT_SLACK,
    plateRatio,
    frameRatio,
    drift,
    scale: plate.width / frame.width,
  };
}

/** The ground a beat declares, out of its own `PALETTE.md` frontmatter, or `null`.
 *
 *  `null` and never a default: the guard that read a transparent box as black failed three correct
 *  beats for eight days, and the lesson it left is that a value which was not read must not be able
 *  to travel as a value that was. */
export function groundFromPalette(source) {
  if (typeof source !== "string") return null;
  const found = /^ground:\s*"?(#[0-9a-fA-F]{3,8})"?\s*$/m.exec(source);
  return found ? found[1] : null;
}

/** The mean relative luminance of a decoded plate, sampled on a 64x32 grid.
 *
 *  The same grid `verify-scrolly.mjs` samples through an `OffscreenCanvas`, computed here from
 *  `decodePng`'s own bytes — no browser, and no screenshot, which is the reading this tree stopped
 *  trusting. A grid rather than every pixel because a 4000x4000 plate is 64 million channels and the
 *  question is which SIDE of the theme it is on, not its exact mean. */
export function plateLuminance(image) {
  const stepX = Math.max(1, Math.floor(image.width / 64));
  const stepY = Math.max(1, Math.floor(image.height / 32));
  let sum = 0;
  let seen = 0;
  for (let y = 0; y < image.height; y += stepY)
    for (let x = 0; x < image.width; x += stepX) {
      const at = (y * image.width + x) * 4;
      sum += surfaceLuminance(`rgb(${image.data[at]},${image.data[at + 1]},${image.data[at + 2]})`);
      seen++;
    }
  return sum / seen;
}

/** Ramps that cannot finish before the beat does — the reveal ends with something still on its way.
 *
 *  THE DEFECT, and why it is read here rather than declared. `scrolly` catches the same thing with a
 *  vocabulary: a mark the reveal reaches declares `data-state="reached"`, and one that never got
 *  there is still `pending` when the reveal ends. No video component in this tree declares one —
 *  measured 2026-08-20, zero `data-state` in 53 of them — and a video signals arrival by opacity
 *  driven by a progress instead. So the same question is asked of the LAST FRAME, which for this
 *  format is arithmetic rather than a picture: at the end of the composition, is anything still
 *  ramping?
 *
 *  `checkTiming` already guarantees every NAMED event ends with the composition, so a named window
 *  cannot be the offender. One level down it can: a ramp over an already-normalised progress is
 *  driven by a value CLAMPED at 1, so an input range ending above 1 never reaches its own end and
 *  the mark it fades in is still fading when the reader's video stops. A ramp driven by the raw
 *  frame is measured against the last frame index instead.
 *
 *  An early finish is not a defect: `interpolate(conclusion, [0, 0.45], ...)` deliberately lands
 *  before its window closes, which is how a beat holds still at the end. Only the ceiling that
 *  cannot be reached is refused. */
export function neverArrives(ramps) {
  return ramps
    .filter((ramp) => ramp.ceiling != null && ramp.ceiling > ramp.limit)
    .map((ramp) => ramp.id);
}

/** Every `interpolate` ramp in `source`, as the shape `neverArrives` reads.
 *
 *  READS SOURCE, for the reason this whole file does: a video beat's marks exist as marks only
 *  inside Remotion's own render. The driver is the first argument — `frame` measured against the
 *  composition's last frame, anything else taken to be one of this format's normalised progresses
 *  and measured against 1. That convention is the corpus's, not an assumption: all 178 ramps in the 26
 *  components this repository ships drive off `progressOf(...)` output or a spring built from one,
 *  and not one takes a raw frame. The day one does under another name, this reader measures it against 1 and says so
 *  loudly rather than silently, because a frame index is always greater than 1.
 *
 *  A ramp whose bounds are COMPUTED (`[w.start, w.end]` — 18 of the 178) is returned with a `null`
 *  ceiling and decided on by nothing. It is kept rather than dropped so the walking test can count
 *  what was read and what was left undecidable: a reader that goes quiet must fail, not pass. */
export function rampsFromSource(source, where, { total }) {
  const ramps = [];
  for (const match of source.matchAll(
    /interpolate\(\s*([A-Za-z_$][\w.$]*(?:\[[^\]]*\])?)\s*,\s*\[([^\]]*)\]/g,
  )) {
    const [, driver, bounds] = match;
    const parts = bounds.split(",").map((part) => Number(part.trim()));
    const last = parts[parts.length - 1];
    const line = source.slice(0, match.index).split("\n").length;
    ramps.push({
      id: `${where}:${line} interpolate(${driver})`,
      driver,
      ceiling: parts.some((value) => Number.isNaN(value)) ? null : last,
      limit: driver === "frame" ? total - 1 : 1,
    });
  }
  return ramps;
}

/** A `.csv` this script reads whose own row is cut on every literal comma instead of a parser that
 *  understands a quoted field — the pattern beat `proof/more-line-swiss-life-expectancy/render.mjs`
 *  shipped for months and every author since copied: `"1,234.5"` (a thousands separator) and
 *  `"Netherlands, the"` (a name carrying its own comma) both tear in two under a bare
 *  `row.split(",")`, silently — an extra field, every column after it one off, and nothing throws.
 *
 *  Reads SOURCE TEXT, not a delivered artifact: the defect lives in how a beat is WRITTEN, not in
 *  what it renders, so there is no rendered signal to inspect after the fact.
 *
 *  Two shapes have to appear TOGETHER for a match. A newline split that tokenises rows by hand
 *  (`.split(/\r?\n/)`, or the quoted `"\n"` / `"\r\n"` forms) is proof the source is walking a csv's
 *  own rows itself; paired with a bare single-comma split (`.split(",")`, either quote style) that
 *  cuts each one into fields. Either alone proves nothing — a comma split with no row split nearby
 *  is cutting something else (`place.split(" of ").pop().split(",")[0]`, a sentence, not a row: the
 *  false positive measured against `proof/mapgen-symbol-web/render-web.mjs`, which mentions "csv"
 *  repeatedly and reads a real one through a proper parser elsewhere), and a row split with no
 *  comma split nearby means the
 *  fields are read some other, safe way. Returns every offending `.split(",")` snippet found; empty
 *  means this source does not hand-cut a comma on its own csv rows. */
export function csvSplitByHand(source) {
  if (!/\bcsv\b/i.test(source)) return [];
  const rowSplitByHand =
    /\.split\(\s*(\/\\r\?\\n\/|["'`]\\r\\n["'`]|["'`]\\n["'`])\s*\)/.test(source);
  if (!rowSplitByHand) return [];
  return [...source.matchAll(/\.split\(\s*(["'`]),\1\s*\)/g)].map((m) => m[0]);
}
