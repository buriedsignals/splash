// The guards `map-web` carries, kept in their own module so a TEST can import them.
//
// `verify-interaction.mjs` is this format's driver and it RUNS on import. A decision that only exists
// inside it is a decision no test can reach without spending a browser, so the decisions live here
// and the driver imports the two that are about the shipped page and calls them on it.
//
// FOUR GUARDS, TWO SUBSTRATES.
//
//   · the page — one self-contained HTML file carrying a baked plate, its marks and a live MapTiler
//     layer over them. The same asset inlined twice is the most expensive mistake available here,
//     since a map plate is the heaviest single asset this tree produces; and a dash that measures its
//     own path under `vector-effect: non-scaling-stroke` is reachable for the same reason it is in
//     `chart-web`.
//   · the bake — `bake-plate.mjs` writes `plate/plate.png` and `plate/geometry.json` side by side,
//     and the geometry records the FRAME every point's pixel position was computed in. So "does the
//     plate describe the same place as the marks" and "is it on the ground's side" are exact, need no
//     browser and no screenshot, and run in milliseconds.
//
// Every decision below is a COPY — of `scrolly`'s, `chart-video`'s and `map-beat`'s — held byte for
// byte by `splash/test/guard-copies-parity.test.ts`. `map-beat` and `map-web` bake the same way, and
// a plate does not know which format is drawing it.

import { decodePng } from "./compare-png.mjs";

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = [
  "duplicatedPayload",
  "revealDashInScreenSpace",
  "plateMatchesGeometry",
  "plateFollowsGround",
  "plateSurfacesYieldToInk",
  "pageLanguageMatchesStory",
  "credentialReadsWithoutAlias",
  // THE THREE THE POLYGON CORE BROUGHT WITH IT (2026-08-22). `assets/geo-choropleth.ts` gave this
  // skill the join a choropleth needs, and with it the two traits `joins-values-to-shapes` and
  // `reads-a-journalists-csv` — so three catalogue rules that never reached this format now do.
  // Declared here rather than left for the next stress round to find: the mechanism is present, so
  // the guard is owed the moment the mechanism is.
  "csvSplitByHand",
  "unmatchedValues",
  "labelPlacementIssues",
  // THE FOURTH THE POLYGON CORE BROUGHT, and the one it earned rather than inherited (2026-08-23).
  // A choropleth is the only thing this format paints that has to say "this region filed nothing"
  // in the same colour space it says "this region filed a zero" — see `no-data-reads-as-not-data`.
  "assertSurfacesRead",
];

// `unmatchedValues` and `labelPlacementIssues` are the actual decisions and they live beside the
// arithmetic they judge, in `assets/geo-choropleth.ts` — re-exported here only so `carriedBy` can
// read the name, which is exactly the shape `map-beat/scripts/verify-map.mjs` uses for its own two.
export {
  unmatchedValues,
  labelPlacementIssues,
  assertSurfacesRead,
} from "../assets/geo-choropleth.ts";

/** Every credential name this skill's own scripts read straight off `env`/`process.env` by its
 *  literal CANONICAL property name — `MAPTILER_KEY`, `DATAWRAPPER_TOKEN` — never a name built at
 *  runtime, which is what an alias-resolving loop (`names.map((n) => env[n])`) looks like to a
 *  text scan and is already safe by construction: it reads every alias in the same expression, so
 *  there is no narrower name for it to have missed. */
export function credentialNamesRead(source) {
  const names = new Set();
  for (const m of source.matchAll(/\benv(?:\.|\[["'`])([A-Z][A-Z0-9_]*_(?:KEY|TOKEN))\b/g))
    names.add(m[1]);
  return [...names];
}

/** A credential read by its canonical name with no `<NAME>_ALIASES` list declared ANYWHERE in the
 *  same source — the exact shape finding 2 found twice: a raw `process.env.DATAWRAPPER_TOKEN` /
 *  `process.env.MAPTILER_KEY` read with nothing to fall back to when the root's `.env` holds the
 *  credential under a different name (`DATAWRAPPER_API_TOKEN`, `REMOTION_MAPTILER_KEY`). The
 *  alias-list convention is declared-not-inferred, the same contract `carriedBy` reads a guard's
 *  own name by: a skill that reads a canonical name and never declares its own list for it is
 *  refused, and one that reads the name AND declares the list survives — this cannot see whether
 *  the read actually consults the list, which is why `source` is the WHOLE skill, not one file:
 *  `dw-beat/scripts/sealed-produce.mjs` reads `DATAWRAPPER_TOKEN` and imports its resolver from
 *  `produce.mjs` rather than declaring a second list of its own, and only the combined source
 *  proves that is not the same gap this rule refuses. */
export function credentialReadsWithoutAlias(source) {
  return credentialNamesRead(source).filter((name) => !source.includes(`${name}_ALIASES`));
}

/** Does the delivered page's own `<html lang>` agree with the language recorded for its story?
 *
 *  Reads the ARTEFACT, never re-derives it: `recorded` is the story's own answer (`STORYBOARD.md`'s
 *  `language:` field, or a beat's own recorded equivalent), handed in by the caller — this function
 *  never detects a language from prose and never assumes English. `renderWeb`'s own HTML shell used
 *  to hard-code `lang="fr"` regardless of what a beat actually said, discovered when an English beat
 *  had to patch its own runner to fix it after the fact; this is the guard that would have caught it
 *  on the delivered file, not just at render time. */
export function pageLanguageMatchesStory(html, recorded) {
  const found = /<html[^>]*\slang="([^"]*)"/i.exec(html);
  if (!found) return false;
  return found[1] === String(recorded ?? "").trim();
}

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
 *  beat and a light one are equally legitimate. Only the two-sided disagreement is refused.
 *
 *  A VALUE THAT WAS NOT READ MUST NOT TRAVEL AS A VALUE THAT WAS, which is `surfaceLuminance`'s own
 *  rule one screen above and which this function used to break. Measured 2026-08-22:
 *  `plateFollowsGround({ ground: 0.009, plate: NaN })` returned TRUE — `side(NaN)` is neither
 *  `< DARK_SIDE` nor `> LIGHT_SIDE`, so it resolved to the middle band this guard deliberately says
 *  nothing about, and an unmeasurable plate read back as a pass. `null` is a CALLER saying it could
 *  not read the value and is still answered with silence; a non-finite number is an arithmetic that
 *  failed on the way in, which no caller in this tree filters for, so it THROWS naming the side it
 *  could not measure. A guard that cannot decide says so. */

export function plateFollowsGround({ ground, plate }) {
  if (plate == null || ground == null) return true;
  for (const [what, value] of [
    ["ground", ground],
    ["plate", plate],
  ])
    if (!Number.isFinite(value))
      throw new Error(
        `plateFollowsGround was handed ${value} for the ${what} — that is not a measurement, and a ` +
          `value which was not read must not travel as one that was. Pass null to say it could not be read.`,
      );
  const side = (value) => (value < DARK_SIDE ? "dark" : value > LIGHT_SIDE ? "light" : "middle");
  const one = side(ground);
  const two = side(plate);
  if (one === "middle" || two === "middle") return true;
  return one === two;
}

/** How much of a plate a flat fill has to cover before it is a SURFACE the reader reads the map
 *  against, rather than a river, a lake's outline or an anti-aliased edge.
 *
 *  Measured over every plate committed in this tree (26 of them, 2026-08-23): the fills a basemap
 *  paints cover between 3.6% and 89.2% of their own plate, and the next colour below them covers
 *  0.03%. Two orders of magnitude of empty space between the two, so this is not a tuned number —
 *  anything from 0.001 to 0.03 selects exactly the same surfaces on every plate in the corpus. */
const SURFACE_SHARE = 0.02;

/** WCAG 2.2 SC 1.4.11 Non-text Contrast — the same 3:1 `assertRampReads` holds a ramp's top class to
 *  against the ground, asked here of a mark against the surface it is drawn ON. */
const NON_TEXT_FLOOR = 3;

/**
 * THE SURFACES A BASEMAP PAINTS, MEASURED AGAINST THE INK THE BEAT DRAWS WITH — and this is the
 * owner's own instruction, given twice: *"the ocean colours have to adapt to the palette."*
 *
 * WHY A SECOND DECISION BESIDE `plateFollowsGround` RATHER THAN A WIDER ONE. That decision reads a
 * plate's MEAN luminance and asks which side of a mid-grey band it falls on. Measured on the worst
 * page in this corpus — `stories/r8-map-web-japan-bear-casualties`, a symbol map of Japan on a
 * newsroom ground of `#16191B` (0.0094) — the plate is 66.9% water at `#aac9e0` (0.5570) and 32.8%
 * land at `#292929` (0.0222), and its mean is 0.3809. `DARK_SIDE` is 0.25 and `LIGHT_SIDE` is 0.6,
 * so that mean lands in the band its neighbour deliberately says nothing about and it returns TRUE.
 * That is not a tuning failure and widening the band does not fix it: a symbol plate is mostly
 * basemap, so the mean of a bright sea and a dark land is a number no bake controls and no reader
 * ever sees. **A MEAN IS THE WRONG STATISTIC.** A plate is a small number of large flat fills, and
 * each one of them is a thing the reader looks at.
 *
 * SO THIS ONE READS THE FILLS, and it asks the question the owner asked: is the largest, brightest
 * thing on the page something that carries no data? Two readings, one input set, one floor —
 *
 *   1. NOTHING THAT CARRIES NO DATA MAY OUT-SHOUT WHAT DOES. A surface's contrast against the story's
 *      own ground may not exceed the contrast the beat's own ink carries against that same ground.
 *      On the Japan page the sea measures 10.21:1 against the ground while the accent carrying the
 *      whole argument measures 8.01:1, so the sea is the loudest thing on a map about land and the
 *      subject reads as a hole cut out of a bright blue page.
 *   2. A MARK MUST BE VISIBLE ON THE SURFACE IT IS DRAWN ON. Every ink a caller reports as drawn over
 *      a surface has to clear `NON_TEXT_FLOOR` against it. On the same page the accent measures
 *      1.27:1 against the sea.
 *
 * WHICH INK IS DRAWN OVER WHICH SURFACE IS THE CALLER'S OWN MEASUREMENT, never a list typed here: a
 * verifier samples the finished plate at each mark's own projected pixel. A choropleth reports none,
 * because its fills REPLACE the plate, and reading 2 then has nothing to fire on — which is right,
 * and it is why this is one decision with two readings rather than two decisions with two
 * populations to keep in step.
 *
 * WHAT THE INK IS, AND WHY THAT IS CONSERVATIVE. The caller reports the ink it can read, which for a
 * verifier reading `PALETTE.md` is the recorded accent and any further house accents. A ramp is
 * DERIVED from the accent away from the ground (`dataRampEnd`), so every class it draws carries LESS
 * contrast against the ground than the accent does. The accent is therefore the ceiling of what the
 * beat can draw, reading 1 is measured against that ceiling, and a beat is never refused for ink it
 * does not spend.
 *
 * A GROUND OR AN INK THAT WAS NOT READ SAYS NOTHING — the same contract `plateFollowsGround` states
 * one screen above. `null`, or an empty ink, is a CALLER admitting it could not read the value and is
 * answered with silence; a non-finite number is an arithmetic that failed on the way in, which no
 * caller in this tree filters for, so it THROWS naming what it could not measure.
 */
export function plateSurfacesYieldToInk({ ground, ink, surfaces }) {
  if (ground == null || !Array.isArray(ink) || ink.length === 0) return [];
  for (const [what, value] of [
    ["the ground", ground],
    ...ink.map((one) => [`the ink ${one.name}`, one.luminance]),
    ...surfaces.map((one) => [`the surface ${one.hex}`, one.luminance]),
  ])
    if (!Number.isFinite(value))
      throw new Error(
        `plateSurfacesYieldToInk was handed ${value} for ${what} — that is not a measurement, and a ` +
          `value which was not read must not travel as one that was. Pass null to say it could not be read.`,
      );
  const contrast = (one, two) => (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
  const loudest = ink.reduce(
    (best, one) => (contrast(one.luminance, ground) > contrast(best.luminance, ground) ? one : best),
    ink[0],
  );
  const ceiling = contrast(loudest.luminance, ground);
  const offences = [];
  for (const surface of surfaces) {
    if (!(surface.share >= SURFACE_SHARE)) continue;
    const covers = `${surface.hex} covers ${(surface.share * 100).toFixed(1)}% of the plate and`;
    const carried = contrast(surface.luminance, ground);
    if (carried > ceiling)
      offences.push(
        `${covers} measures ${carried.toFixed(2)}:1 against the ground, past the ` +
          `${ceiling.toFixed(2)}:1 the loudest ink this beat records (${loudest.name}) carries against ` +
          `it — the largest, brightest thing on this page carries no data. Derive the basemap's own ` +
          `surfaces from this ground and this ink rather than painting a literal.`,
      );
    for (const name of surface.underInk ?? []) {
      const drawn = ink.find((one) => one.name === name);
      if (!drawn) continue;
      const seen = contrast(drawn.luminance, surface.luminance);
      if (seen < NON_TEXT_FLOOR)
        offences.push(
          `${covers} the ink drawn on it (${name}) measures ${seen.toFixed(2)}:1 against it, under the ` +
            `${NON_TEXT_FLOOR}:1 floor WCAG 2.2 SC 1.4.11 sets for a graphical object — a mark on this ` +
            `surface cannot be seen.`,
        );
    }
  }
  return offences;
}

/** THE FLAT FILLS A DECODED PLATE CARRIES, each with the share of the plate it covers and the
 *  relative luminance a reader sees it at — the reading `plateSurfacesYieldToInk` decides on, and the
 *  one a MEAN over the same pixels throws away.
 *
 *  Every pixel rather than the 64x32 grid its neighbour samples: a share is what this decision turns
 *  on, and a grid that misses a fill entirely would report it at share 0 and pass it in silence. */
export function plateSurfaces(image) {
  const counts = new Map();
  for (let at = 0; at < image.width * image.height * 4; at += 4) {
    const hex = `#${[0, 1, 2].map((c) => image.data[at + c].toString(16).padStart(2, "0")).join("")}`;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const total = image.width * image.height;
  return [...counts]
    .map(([hex, seen]) => ({ hex, luminance: surfaceLuminance(hex), share: seen / total }))
    .filter((one) => one.share >= SURFACE_SHARE)
    .sort((one, two) => two.share - one.share);
}

/** The ink a beat's own `PALETTE.md` records — the accent that carries its argument, and any further
 *  house accents recorded beside it. The twin of `groundFromPalette` one screen above, and read the
 *  same way: what is written, or nothing. A beat that records no accent is a beat this decision has
 *  no scale to measure its plate against, and saying nothing is the honest answer. */
export function inkFromPalette(source) {
  if (typeof source !== "string") return [];
  const found = [];
  const accent = /^accent:\s*"?(#[0-9a-fA-F]{3,8})"?\s*$/m.exec(source);
  if (accent) found.push(accent[1]);
  const further = /^accents:\s*"?([^"\n]*)"?\s*$/m.exec(source);
  if (further) for (const one of further[1].match(/#[0-9a-fA-F]{3,8}/g) ?? []) found.push(one);
  return found;
}

/** THE SURFACES A BEAT'S OWN MARKS ARE DRAWN ON, sampled at each mark's own projected pixel.
 *
 *  `plateSurfacesYieldToInk`'s second reading has to know which fills can hold a mark, and the only
 *  honest way to know is to look. `geometry.json` records every mark's position in FRAME units and
 *  the plate is that same frame at an integer scale, so the pixel under a mark is arithmetic rather
 *  than a guess. A beat with no `points` — every choropleth, whose fills REPLACE the plate — reports
 *  none, and the reading then has nothing to fire on, which is the right answer rather than a gap.
 *
 *  WHY THE WHOLE RECORDED INK AND NOT ONE MARK'S OWN COLOUR. Nothing in a plate says which mark
 *  carries the accent: a beat spends it on the one shape its title is about and draws the rest as
 *  furniture. A fill that can hold a mark has to be able to hold the loudest one, so the whole
 *  recorded ink travels with the fill a mark was found on. */
export function surfacesUnderMarks({ image, geometry, surfaces, ink }) {
  const points = Array.isArray(geometry?.points) ? geometry.points : [];
  const frame = geometry?.frame;
  if (!points.length || !frame?.width || !frame?.height)
    return surfaces.map((one) => ({ ...one, underInk: [] }));
  const seen = new Set();
  for (const point of points) {
    const x = Math.round((point.px * image.width) / frame.width);
    const y = Math.round((point.py * image.height) / frame.height);
    if (!(x >= 0 && x < image.width && y >= 0 && y < image.height)) continue;
    const at = (y * image.width + x) * 4;
    seen.add(`#${[0, 1, 2].map((c) => image.data[at + c].toString(16).padStart(2, "0")).join("")}`);
  }
  return surfaces.map((one) => ({ ...one, underInk: seen.has(one.hex) ? ink.map((each) => each.name) : [] }));
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
