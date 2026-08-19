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
export const GUARDS = ["revealDashInScreenSpace"];

/** Marks whose dash MEASURES their own path while being computed in screen space — the reveal that
 *  cannot work, and the one this tree shipped for months without seeing.
 *
 *  `vector-effect: non-scaling-stroke` takes the stroke, and with it the dash pattern, out of the
 *  path's own user units. A dash pattern repeats forever, so a pattern one path-length long measured
 *  against a line the camera has scaled up draws dash, gap, dash: a head, a hole and a tail, sliding
 *  together as the offset moves. A DECORATIVE dash — a gridline, a leader — belongs in screen space
 *  and is left alone here; what is refused is a dash that measures, recognised by a declared
 *  `pathLength` or by an offset that is not zero.
 *
 *  A COPY of `scrolly/scripts/verify-scrolly.mjs`'s, byte-identical in body and comment, because a
 *  skill never reaches across another skill's boundary. `doctrine/test/guard-parity.test.ts` walks
 *  the copies. */
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
 *  Deliberately a text scan and not a parser: the four attributes it needs are written literally in
 *  every one of this corpus's 25 video components, and a scan cannot be wrong about an attribute
 *  that is not there. What it cannot see is a dash assembled elsewhere and spread in — stated in the
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
    if (!/stroke-?[Dd]ash/.test(attributes)) continue;
    const read = (name) => {
      const quoted = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`).exec(attributes);
      if (quoted) return quoted[2] ?? quoted[3];
      const braced = new RegExp(`\\b${name}=\\{`).exec(attributes);
      if (!braced) return null;
      // Balance the braces, so `{\`${a} ${b}\`}` comes back whole.
      let depth = 0;
      let at = braced.index + braced[0].length - 1;
      const start = at + 1;
      for (; at < attributes.length; at++) {
        if (attributes[at] === "{") depth++;
        else if (attributes[at] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      return attributes.slice(start, at).trim();
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
