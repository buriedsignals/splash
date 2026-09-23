// twin/shared/design-base/adapt-direction.mjs
//
// THE SCAFFOLDS THAT ADAPT A WORKED EXAMPLE COPY ITS THREE-DIRECTION LOOP, AND R-A DIES THERE.
//
// Ruling R-A: a production run is produced in ONE art direction, composed once from `NEWSROOM.md`
// and the story's subject, written at the story root beside `PALETTE.md`, inherited by every export
// and redefined by none. The CATALOGUE is the named exception: its proofs render the three filed
// directions precisely to show that the direction is a parameter of the run.
//
// All eight scaffolds adapt a worked example by default — they copy a catalogue beat's own runner
// and mark its regions `SCAFFOLD:`. That runner is a PROOF's, so it carries the exception, and the
// journalist receives it. Fixing the `.tmpl` templates (2026-09-23) closed the path nobody takes and
// left the one everybody does: measured immediately afterwards by scaffolding a real story's scrolly
// beat, whose written runner still looped over `docs/design-base/directions`.
//
// This is the transform that closes it, and it sits beside `depthIndependentPaths` and
// `languageAwareNumbers` in the same pipeline, for the same reason: what a worked example says about
// ITSELF has to be rewritten for the beat that inherits its code.
//
// IT REFUSES RATHER THAN NO-OPS. A shape it does not recognise throws, naming the file — because a
// transform that quietly does nothing is exactly how the rule died the first time.

/** The loop heads this has been taught, each with the lines that read a filed direction inside it. */
const SHAPES = [
  {
    // scrolly, chart-web and map-web: `for (const file of readdirSync(DIRECTIONS)…) { const id = …`
    head: /for \(const file of readdirSync\(DIRECTIONS\)\.filter\(\(f\) => f\.endsWith\("\.md"\)\)\) \{\n(\s*)const id = file\.replace\(\/\\\.md\$\/, ""\);\n\s*const (\w+) = resolveDirectionFamilies\(readDirection\(join\(DIRECTIONS, file\)\), textPerRegister\);/,
    rewrite: (m, indent, name) =>
      `for (const { id, base } of RUN_DIRECTIONS) {\n${indent}const ${name} = resolveDirectionFamilies(base, textPerRegister);`,
  },
];

/** The block that resolves the run's one direction, inserted above the loop it replaces. */
const PREAMBLE = `
// THE RUN'S ONE ART DIRECTION (ruling R-A). It was composed once for this story, from NEWSROOM.md
// and the subject, and written at the story root beside PALETTE.md. Every export of the run reads
// THAT file, so two exports of one claim can never land in two palettes or two type ladders.
//
// This beat's code was adapted from a CATALOGUE proof, whose own runner renders the three filed
// demo directions — that is R-A's named exception and it is the proof's, not this beat's. \`--filed\`
// asks for them back, and a beat with no reachable DIRECTION.md (a proof) gets them anyway.
const { directionReachable: __reachable, readRunDirection: __runDirection } = await import("#shared/design-base/run-direction.mjs");
const __slug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const RUN_DIRECTIONS = (() => {
  if (!FILED && __reachable(HERE)) {
    const run = __runDirection(HERE);
    console.log(\`the run's one art direction: \${run.id}\\n  composed from: \${run.origin}\\n  read from: \${run.source}\\n\`);
    return [{ id: __slug(run.id), base: run }];
  }
  return readdirSync(DIRECTIONS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ id: f.replace(/\\.md$/, ""), base: readDirection(join(DIRECTIONS, f)) }));
})();
`;

/**
 * THE FILED DIRECTIONS ARE READ EAGERLY BY EVERY WORKED EXAMPLE, and an installed root has none.
 *
 * A proof's runner opens with `const filed = readdirSync(DIRECTIONS)…` and prints the composer's
 * report, before anything decides which direction to render in. That is fine in a checkout, where
 * `docs/design-base/directions` sits under the root — and an installed stories root vendors
 * `shared/` and nothing else, so the read throws ENOENT before the run direction is ever consulted.
 * Measured 2026-09-23, immediately after the import was fixed: the next line failed the same way,
 * for the same reason.
 *
 * So the eager read becomes lazy. In a story it never runs; in a catalogue proof it runs exactly as
 * it did.
 */
const EAGER_FILED = new RegExp(
  [
    "\\nconst filed = readdirSync\\(DIRECTIONS\\)",
    "\\s*\\.filter\\(\\(f\\) => f\\.endsWith\\(\"\\.md\"\\)\\)",
    "\\s*\\.map\\(\\(f\\) => readDirection\\(join\\(DIRECTIONS, f\\)\\)\\);\\n",
  ].join("\\n"),
);

const LAZY_FILED = `
// The filed demo directions, read only if this beat turns out to need them — a story reads its own
// DIRECTION.md and an installed root has no \`docs/design-base/directions\` to read at all.
const filedDirectionsOf = () =>
  readdirSync(DIRECTIONS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readDirection(join(DIRECTIONS, f)));
`;

/** True when this source already reads the run's direction — a template, or an already-adapted file. */
export function readsTheRunDirection(source) {
  return /\breadRunDirection\b/.test(String(source));
}

/**
 * Rewrites a copied runner's three-direction loop into the run's one direction.
 *
 * @param {string} source the worked example's runner, already renamed for this beat
 * @param {string} what   the file's name, for the refusal
 */
export function oneRunDirection(source, what = "this runner") {
  const text = String(source);
  if (readsTheRunDirection(text)) return text;
  for (const shape of SHAPES) {
    const found = shape.head.exec(text);
    if (!found) continue;
    const declaresFiled = /\bconst FILED\b/.test(text);
    const preamble = declaresFiled ? PREAMBLE : PREAMBLE.replace("!FILED && ", "");
    // THE PREAMBLE GOES HIGH, not just above the loop it replaces. The composer's own report sits
    // between the two and has to know whether this beat composes at all, so `RUN_DIRECTIONS` must be
    // in scope by then — a const declared below it is a temporal dead zone, which is how the first
    // version of this transform failed.
    const anchor = /\nconst ROOT = splashRoot\(HERE\);\n/.exec(text);
    const at = anchor ? anchor.index + anchor[0].length : found.index;
    let out =
      text.slice(0, at) + preamble + "\n" + text.slice(at).replace(shape.head, shape.rewrite);
    // And the composer's own report, which only a beat that composes can produce.
    if (EAGER_FILED.test(out)) {
      out = out.replace(EAGER_FILED, LAZY_FILED);
      out = out.replace(
        new RegExp("\\nconsole\\.log\\(report\\(composeDirections\\(\\{ newsroom, filed, beat: BEAT_FACTS, textPerRegister \\}\\), \\{ beat: BEAT_FACTS \\}\\)\\);\\n"),
      "\nif (RUN_DIRECTIONS.length > 1)\n  console.log(report(composeDirections({ newsroom, filed: filedDirectionsOf(), beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));\n",
      );
      out = out.replace(/\bfiled\.map\(/g, "filedDirectionsOf().map(");
    }
    return out;
  }
  throw new Error(
    `${what} carries no direction loop this transform recognises, so it cannot be given the run's ` +
      "one art direction. It was adapted from a catalogue proof, which renders the three filed demo " +
      "directions by design (ruling R-A's named exception) — a beat that inherits that loop " +
      "unrewritten redefines the direction its own story already chose. Teach `SHAPES` this loop's " +
      "shape (shared/design-base/adapt-direction.mjs) rather than letting the beat ship with it.",
  );
}
