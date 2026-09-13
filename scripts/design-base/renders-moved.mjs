// twin/scripts/design-base/renders-moved.mjs
//
// WHAT MOVED IN A BEAT'S DIRECTED RENDERS SINCE THE LAST COMMIT, READ OFF THE SVG ITSELF.
//
// A refactor that must not move the page is proved on the geometry, not on the pixels: two SVGs
// with the same elements and the same text are compared number by number, and the largest move is
// reported. A changed element or a re-wrapped line is a STRUCTURE change, reported as such.
//
// Usage:  bun scripts/design-base/renders-moved.mjs proof/<beat> [proof/<beat>…] [--tolerance 0.25]

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g;

/** @returns {{structure: boolean, max: number}} */
export function geometryDelta(before, after) {
  const skeleton = (svg) => svg.replace(NUMBER, "#");
  if (skeleton(before) !== skeleton(after)) return { structure: true, max: Infinity };
  const a = before.match(NUMBER) ?? [];
  const b = after.match(NUMBER) ?? [];
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    // A digit run inside a base64 image can overflow to Infinity; equal text is no move, and a
    // difference that is not a finite number is counted as moved rather than poisoning `max` as NaN.
    if (a[i] === b[i]) continue;
    const delta = Math.abs(Number(a[i]) - Number(b[i]));
    if (!Number.isFinite(delta)) return { structure: false, max: Infinity };
    max = Math.max(max, delta);
  }
  return { structure: false, max };
}

function atRevision(revision, path) {
  const shown = spawnSync("git", ["show", `${revision}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return shown.status === 0 ? shown.stdout : null;
}

/** `--name value` pairs, and everything else as positional arguments. */
function parseArgs(argv) {
  const options = { tolerance: 0.25, against: "HEAD" };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tolerance") options.tolerance = Number(argv[++i]);
    else if (argv[i] === "--against") options.against = argv[++i];
    else positional.push(argv[i]);
  }
  if (!(options.tolerance >= 0)) throw new Error(`--tolerance takes a number of pixels`);
  if (!/^[\w./~^-]+$/.test(options.against ?? ""))
    throw new Error(`--against takes a git revision, not ${options.against}`);
  return { ...options, beats: positional };
}

if (import.meta.main) {
  const { tolerance, against, beats } = parseArgs(process.argv.slice(2));
  if (!beats.length) throw new Error("name at least one beat directory, e.g. proof/static-bump-emitter-rank");

  let moved = 0;
  for (const beat of beats) {
    const dir = join(resolve(beat), "renders");
    const here = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".svg")).sort() : [];
    for (const name of here) {
      const path = relative(ROOT, join(dir, name));
      const before = atRevision(against, path);
      if (before === null) {
        console.log(`NEW        ${path}`);
        moved++;
        continue;
      }
      const delta = geometryDelta(before, readFileSync(join(dir, name), "utf8"));
      const verdict = delta.structure ? "STRUCTURE" : delta.max > tolerance ? "MOVED" : "same";
      if (verdict !== "same") moved++;
      console.log(`${verdict.padEnd(10)} ${path}${delta.structure ? "" : `  max ${delta.max.toFixed(3)}px`}`);
    }
    const listed = spawnSync("git", ["ls-tree", "--name-only", against, `${relative(ROOT, dir)}/`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    for (const path of listed.stdout.split("\n").filter((p) => p.endsWith(".svg")))
      if (!existsSync(join(ROOT, path))) {
        console.log(`GONE       ${path}`);
        moved++;
      }
  }
  process.exit(moved ? 1 : 0);
}
