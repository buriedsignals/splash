/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["declarationsWithoutACaller"];

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Source with its COMMENTS removed, so a rule that is only TALKED ABOUT does not read as a rule
 *  that is called.
 *
 *  This is the difference between the controller's own `grep -rl` measurement and this decision,
 *  and it moves real numbers. `dw-beat/scripts/detect-fills-its-frame.mjs` mentions
 *  `credentialReadsWithoutAlias` in a paragraph explaining a neighbouring guard, and
 *  `map-beat/scripts/render-still.mjs` mentions `rtlRunsAreIsolated` in the same way: a grep counts
 *  both as callers and neither runs anything. A prose mention is the MOST likely thing to be found
 *  in a skill that never wired its guard, because a comment is what an author writes instead of
 *  wiring it.
 *
 *  Whole-line `//` and block comments only, which is `render-still-parity.test.ts`'s own
 *  normalisation and is argued there: a trailing `//` after code cannot be stripped safely, because
 *  a regex literal or a URL carries one, and eating code would make this comparison vacuously green
 *  — a check that always passes is worse than one that occasionally cries wolf. The cost, named: a
 *  mention in a trailing comment still counts as a caller. */
export function withoutComments(source) {
  return source.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, " ");
}

/** The same source with every QUOTED BARE NAME blanked as well — the view a CALLER is looked for
 *  in, and never the view a DECLARATION is read from.
 *
 *  Leaving this out made the decision report itself as wired on its first run: every name in a
 *  `GUARDS` array and every name in `RECORDED_UNWIRED` is a string literal, so the file carrying
 *  those two arrays read as the caller of every decision its own skill declares — a mechanism
 *  certifying itself, which is the exact shape of the defect it exists to refuse.
 *
 *  Only a quote pair whose WHOLE content is identifier characters is blanked, which is precisely a
 *  declared name and never a regex (`/["']/` and `/style="([^"]*)"/` both survive — measured) and
 *  never a sentence. The cost, named: a decision genuinely reached as `module["someGuard"]()` would
 *  read as unwired. Nothing in this tree reaches one that way.
 *
 *  A RE-EXPORT IS NOT A CALL, and this is the hole that would otherwise swallow the whole rule.
 *  `detect-framing-is-measured.mjs` and `detect-storyboard-gate.mjs` are one-line shims —
 *  `export { framingMeasurement } from "./render-still.mjs";` — that exist so the name is DECLARED
 *  in a `GUARDS` array where `carriedBy` can read it. Counting one as a caller would mean any
 *  unwired guard in this tree could be marked wired by adding a shim beside it, which is the same
 *  move as writing a comment about it. So `export { … } from "…"` is blanked in the caller view
 *  too, and a decision whose only mention outside its home is a shim reads as what it is.
 *
 *  AN IMPORT IS NOT A CALL EITHER, and this one was found by mutation rather than by reading. The
 *  call to `graphicFillsItsFrame` was deleted out of `chart-beat/scripts/render-preview.mjs` and
 *  the ratchet stayed GREEN, because the `import { … } from "./detect-fills-its-frame.mjs"` line
 *  above it still named the function. A guard nothing runs, imported by a file that does not run
 *  it, is the exact state finding AC1 describes — so the import list is blanked too, and a name has
 *  to appear in the body of some file that ships before this calls it wired. */
export function withoutQuotedNames(source) {
  return withoutComments(source)
    .replace(/(["'])[A-Za-z0-9_$]+\1/g, "()")
    .replace(/export\s*\{[^}]*\}\s*from\s*["'][^"']*["']\s*;?/g, " ")
    .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*["']\s*;?/g, " ");
}

/** Every file a skill SHIPS, excluding its own tests — the population a caller may live in.
 *
 *  `scripts/` is where a decision is declared and where most of them are called, but not all: a
 *  seed component under `assets/` is part of the render path, and `map-beat` keeps two of its own
 *  decisions (`unmatchedValues`, `labelPlacementIssues`) in `assets/geo.ts` beside the arithmetic
 *  they judge, re-exported from `verify-map.mjs` only so `carriedBy` can read the name. A walk of
 *  `scripts/` alone reported both as declared-and-exported-by-nothing, which was this decision
 *  being wrong rather than the skill being broken.
 *
 *  `test/` is excluded, and that exclusion IS the rule: a decision reachable only from a
 *  `*.test.ts`
 *  is exactly what `guard-wired-to-run` refuses. */
function shippedFiles(skillDir, dir = skillDir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "test" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) shippedFiles(skillDir, path, out);
    else if (/\.(mjs|js|ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** Every decision a skill DECLARES, with the file that declares it and the files that call it.
 *
 *  DECLARED, NOT INFERRED — the same contract `carriedBy` reads one level up: a `GUARDS` array
 *  names the decision, and an `export function NAME` somewhere in the skill is its home. `home` is
 *  `null` for a name declared in an array and exported by no file the skill ships, which is a
 *  broken
 *  declaration rather than an unwired one and is reported as its own thing. */
export function declaredDecisions(skillDir) {
  const files = shippedFiles(skillDir).sort();
  const shown = new Map(files.map((path) => [path, path.slice(skillDir.length + 1)]));
  const source = new Map(files.map((path) => [path, readFileSync(path, "utf8")]));
  const declaring = new Map(files.map((path) => [path, withoutComments(source.get(path))]));
  const calling = new Map(files.map((path) => [path, withoutQuotedNames(source.get(path))]));
  const names = new Set();
  for (const path of files) {
    if (!path.endsWith(".mjs")) continue;
    const declared = /export const GUARDS = \[([^\]]*)\]/.exec(declaring.get(path));
    if (!declared) continue;
    for (const match of declared[1].matchAll(/"([a-zA-Z]+)"/g)) names.add(match[1]);
  }
  return [...names].sort().map((name) => {
    const home = new RegExp(`export (?:async )?function ${name}\\b`);
    const found = files.find((path) => home.test(declaring.get(path)));
    // A DECISION MAY BE REACHED THROUGH ONE WRAPPER IN ITS OWN FILE, and it has to be, or this
    // refuses the very shape it asks for. `chart-video`'s `staggeredReveal` BUILDS a reveal's
    // windows and refuses one the data cannot order; it lives beside `staggerLacksAnOrder` on
    // purpose, so that a beat calling it gets the guard without having to remember the guard. Read
    // literally, that made the decision "called only from its own home" — a red for the one wiring
    // in this round that a story beat can actually reach.
    //
    // ONE level, and only inside the home file: an exported sibling that names the decision in its
    // own body stands in for it. A wrapper somewhere else is not a wrapper, it is a caller, and is
    // already counted. This cannot see a two-hop chain, which is a limit and not a hole — a
    // decision buried two wrappers deep in its own file is worth reporting as unreachable.
    const proxies = found
      ? [...calling.get(found).matchAll(/export (?:async )?function ([A-Za-z0-9_$]+)\s*\(/g)]
          .map((match) => match[1])
          .filter((other) => other !== name && bodyOf(calling.get(found), other).includes(name))
      : [];
    const reaches = new RegExp(`\\b(${[name, ...proxies].join("|")})\\b`);
    const callers = files
      .filter((path) => path !== found && reaches.test(calling.get(path)))
      .map((path) => shown.get(path));
    // A FILE THAT IS ITSELF A COMMAND is the one case where a caller inside the home file counts,
    // and leaving it out made this decision lie about the biggest population in the tree.
    // `scrolly/scripts/verify-scrolly.mjs` DECLARES thirteen decisions and DRIVES them: it carries
    // an `import.meta.main` block, a journalist runs it against a delivered page, and eight of the
    // thirteen are asked on every run. Read as "called only from its own file", all thirteen would
    // have been recorded as unwired debt — a rule reporting a guard that runs as a guard that does
    // not is the same failure it exists to refuse, pointing the other way.
    //
    // So: when the home file can be RUN, a mention anywhere in it outside the decision's own body
    // counts. `bun <that file>` reaches it. The five of thirteen that the run never asks stay
    // unwired here, which is exactly the number round six measured by hand. What this still cannot
    // see is whether the command asks the decision on every run or only down a branch — it reads
    // one edge, and says so.
    const runnable = found ? /\bimport\.meta\.main\b/.test(calling.get(found)) : false;
    // The decision's OWN declaration — signature included, not only its body. Taking the body alone
    // left `export function csvSplitByHand(` behind, so every unwired decision in a runnable file
    // read as reached by a mention of itself. Measured on `verify-scrolly.mjs`: all thirteen came
    // back wired, where five of them have no call site anywhere in the file.
    const elsewhereInHome = found
      ? calling.get(found).split(declarationOf(calling.get(found), name)).join(" ")
      : "";
    if (runnable && new RegExp(`\\b${name}\\b`).test(elsewhereInHome))
      callers.push(`${shown.get(found)} (its own command)`);
    return { name, home: found ? shown.get(found) : null, proxies, callers };
  });
}

/** One top-level function's whole declaration — `export function NAME(…) { … }`, signature and all.
 *  What a mention of the name OUTSIDE this span is: somebody reaching for the decision. */
function declarationOf(source, name) {
  const at = new RegExp(`export (?:async )?function ${name}\\s*\\(`).exec(source);
  const body = bodyOf(source, name);
  if (!at || body === "") return `export function ${name}(`;
  return source.slice(at.index, source.indexOf(body, at.index) + body.length);
}

/** One top-level function's body, by BALANCING THE ARGUMENT PARENTHESES FIRST and then the braces.
 *
 *  The paren balance is not tidiness. Taking the next `{` after the name is the obvious version and
 *  it is quietly broken, exactly as `render-still-parity.test.ts` records for its own walker: in
 *  `staggeredReveal(readings, event, { keyOf, positionOf })` the next `{` is the DESTRUCTURED
 *  ARGUMENT's, so the "body" comes back as the parameter object and the wrapper is not recognised.
 *  Found here by watching this decision report the one wiring in round six that a story beat can
 *  actually reach as unwired debt. */
function bodyOf(source, name) {
  const at = new RegExp(`export (?:async )?function ${name}\\s*\\(`).exec(source);
  if (!at) return "";
  let paren = 0;
  let cursor = source.indexOf("(", at.index);
  for (; cursor < source.length; cursor++) {
    if (source[cursor] === "(") paren++;
    else if (source[cursor] === ")") {
      paren--;
      if (paren === 0) break;
    }
  }
  const open = source.indexOf("{", cursor);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return "";
}

/** THE DECISION: every guard this skill declares that no OTHER script in the skill calls.
 *
 *  ROUND SIX, FINDING AC1. `fills-its-frame` was re-declared from `ships-standalone-html` to
 *  `materialises-a-beat`, its detector was distributed to all eight producing skills, and the
 *  behaviour of all eight was unchanged: `graphicFillsItsFrame` had zero callers in every one of
 *  them. It is not an inert rule — `stress-ab` measured 16.6% and 14.8% against its 17.9% floor and
 *  caught a real defect on a real page — but only because that beat's author wrote a runner BY HAND
 *  against a decision the skill would never have run for them. That is the whole shape of the
 *  defect: a rule that reads as covered, refuses nothing, and leaves the format it was added to
 *  exactly as weak as it was before.
 *
 *  `guard-wired-to-run` was written as a DISCIPLINE for this in round three — prose in
 *  `doctrine/SKILL.md`, because 26 of 40 declarations were unwired and closing 65% of a catalogue
 *  in one wave risked the producers the rules protect. Three rounds later the count is 100 of 124,
 *  which is worse rather than better, and a discipline that cannot observe its own violation is
 *  this project's own definition of theatre. So the observation is mechanical from here, and the
 *  debt each format carries is RECORDED by name in its own copy's `RECORDED_UNWIRED` rather than
 *  forgiven: a name may leave that list, and a name that turns up here and is not on it is a red.
 *
 *  A CALLER IS ANOTHER SCRIPT IN THE SAME `scripts/`, never a `*.test.ts`. That is the rule's own
 *  wording and the reason it exists: a unit test feeds a decision synthetic input built to be
 *  refused, which proves the decision works and proves nothing about whether anything a journalist
 *  runs ever asks it. WHAT THIS CANNOT SEE, said out loud: whether the caller runs the decision on
 *  REAL material or on a fixture of its own, and whether the caller is itself reachable from a
 *  command. It reads one edge of the graph, not the path — which is why every wiring it accepts in
 *  this round was placed in a render script or a Puppeteer driver a beat actually passes through,
 *  and not in whichever file was nearest. */
export function declarationsWithoutACaller(skillDir) {
  return declaredDecisions(skillDir)
    .filter((decision) => decision.callers.length === 0)
    .map((decision) => decision.name);
}

/** THE NAMES THIS FORMAT IS STILL CARRYING UNWIRED, measured 2026-08-22 and recorded rather than
 *  forgiven — a RATCHET, the same shape `splash/test/delivered-size-matches-the-pin.test.ts` uses
 *  for a count that may only go down, with names instead of a number so that wiring one guard and
 *  unwiring another cannot look like standing still.
 *
 *  The web map's own debt. `verify-interaction.mjs` calls two of `verify-guards.mjs`'s decisions;
 *  the other four in that file, and every distributed detector, are here.
 *
 *  Per-format and outside every compared span, for the same reason `MEASURED_MIN_FRACTION` is:
 *  the DECISION above is one decision in all eight copies, and what differs is only what each
 *  format has actually paid off. A name may be REMOVED from this list, never added — adding one is
 *  how the defect that earned this rule would recur. */
export const RECORDED_UNWIRED = [
  "credentialReadsWithoutAlias",
  // THE TWO THE POLYGON CORE BROUGHT (2026-08-22), recorded with the same reason `map-beat` records
  // its own copies of exactly these two: both need a substrate only the BEAT that drew them holds —
  // `unmatchedValues` needs a declared study set joined against a frozen source, and
  // `labelPlacementIssues` needs a laid-out label stack with measured text boxes. This skill's own
  // seed is a symbol map with neither. `proof/mapgen-choropleth-web`'s runner calls the join for
  // real; a skill-side caller would have to invent a study set to ask about, which is the fixture
  // this rule exists to refuse. `csvSplitByHand` is NOT here: it reads source text, which this
  // format's own driver already has in front of it, so it is wired rather than recorded.
  "labelPlacementIssues",
  "unmatchedValues",
  "creditTracesToRecord",
  // THE RUNNER SWEEP'S PAIR, and the only addition this list has ever taken. Their subject is this
  // skill's OWN committed example runners, not a delivered beat, so there is no page and no run for
  // a command in `scripts/` to ask them about — `test/example-runners-run.test.ts` drives both, in
  // every one of the eight, which is the same standing `deadExampleRunners` has carried here since
  // the sweep was written. The alternative was to give `scripts/example-runners.mjs` an
  // `import.meta.main` nobody was told to run, and buy the wiring credit this rule exists to refuse.
  "deadExampleRunners",
  "swallowedExampleRunners",
  "denominatorReadingStated",
  "doubleHyphenInDeliveredText",
  "keyboardReachesEveryMark",
  "labelsClippedByPlate",
  "mislabelledRows",
  "pageLanguageMatchesStory",
  "plateFollowsGround",
  "plateMatchesGeometry",
  "rtlRunsAreIsolated",
  "staticFrameSurvives",
  "storyboardGateStatus",
  "weightAgainstCeiling",
];
