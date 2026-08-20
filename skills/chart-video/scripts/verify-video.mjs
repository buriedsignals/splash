// Verifies what a chart VIDEO carries, after the render ladder has proved it exists.
//
// `render-video.mjs` proves a file was produced and its final frame looks right. Nothing until now
// asked whether the reveal that produced it is measured in a space its own length lives in. That
// defect is native to this format: a line reveal is a dash whose offset runs to zero, and every
// chart video that moves a camera or scales a plot is one `vector-effect` away from the version that
// draws head, hole and tail.
//
// WHY THIS READS SOURCE. A scrolly ships an HTML file whose marks a browser can be pointed at. A
// chart video ships an mp4 and PNGs — artifacts with no attributes in them. A video beat's marks
// exist as marks only inside Remotion's own render, and reaching in means driving `remotion/Internals`
// (its `Timeline` exports hooks and no context object; the render bundle speaks a private protocol).
// A guard built on another package's internals is brittle by construction. The limit this buys is
// named in `test/verify-video.test.ts` and the walking test there fails if this reader ever goes
// quiet.

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["revealDashInScreenSpace", "neverArrives", "csvSplitByHand"];

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
