/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["declarationsWithoutACaller"];

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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


/** WHETHER THE FILE AT `path` REACHES `name` — read in the same CALLER view `declaredDecisions`
 *  reads a skill's own files in, and for the same reason.
 *
 *  Comments are stripped, `import { … } from` lines are blanked and quoted bare names are blanked,
 *  so a beat that only IMPORTS the decision, a runner that only mentions it in a comment and a test
 *  that only names it in a string each fail to reach it. Those three are precisely what an author
 *  writes INSTEAD of calling it — the finding that earned the caller view one level up — and the
 *  whole point of the two categories below is that the excuse is checked rather than believed. A
 *  weaker view here would let a claim be backed by the very thing this rule refuses. */
export function fileReaches(path, name) {
  if (!existsSync(path)) return false;
  return new RegExp(`\\b${name}\\b`).test(withoutQuotedNames(readFileSync(path, "utf8")));
}

/** EVERY BEAT-SUBSTRATE CLAIM THIS FORMAT MAKES THAT NOTHING BACKS — the check that keeps
 *  category 2 from being debt wearing an excuse.
 *
 *  The claim is: only a beat can call this decision, because it needs material a skill's own seed
 *  does not have and MUST NOT INVENT — a declared study set joined against a frozen source, a
 *  laid-out label stack with measured text boxes. Giving the seed one means inventing a fixture to
 *  ask about, which is the thing `guard-wired-to-run` exists to refuse, so the claim is real. But a
 *  claim nobody checks is a permission slip: it excuses the name from the ratchet and costs its
 *  author nothing. So the entry NAMES a committed beat, under `stories/` or `proof/` where a beat
 *  lives in this tree, and this goes and reads it.
 *
 *  A BEAT CALLS ITS OWN CARRIED COPY of the decision, never the skill's — that is what a beat is
 *  here, and `splash/test/guard-copies-parity.test.ts` is what holds the copy to the skill's. So
 *  the NAME is what is looked for in the beat's own runner, exactly as it is looked for in a
 *  skill's own scripts one level up.
 *
 *  WHAT THIS CANNOT SEE, said out loud: whether the beat's call sits on the path its own render
 *  takes or down a branch nothing reaches. It reads one edge, the same single edge
 *  `declarationsWithoutACaller` reads, and a claim backed by a beat that never runs is weaker than
 *  it looks. What it does foreclose is the empty claim — a name in this category with no real
 *  caller ANYWHERE, which is worse than debt because it has stopped being counted as debt. */
export function beatSubstrateWithoutACaller(skillDir, claims) {
  const twin = resolve(skillDir, "..", "..");
  const problems = [];
  for (const claim of claims) {
    const name = claim && claim.name ? claim.name : "an entry with no name";
    const where = claim && typeof claim.calledBy === "string" ? claim.calledBy : "";
    if (name === "an entry with no name" || where === "")
      problems.push(`${name} is recorded as beat-substrate and names no beat that calls it`);
    else if (!/^(stories|proof)\//.test(where))
      problems.push(
        `${name} is recorded as beat-substrate and names ${where}, which is not a committed beat — ` +
          `a beat lives under stories/ or proof/`,
      );
    else if (!existsSync(join(twin, where)))
      problems.push(`${name} is recorded as beat-substrate and names ${where}, which does not exist`);
    else if (!fileReaches(join(twin, where), name))
      problems.push(
        `${name} is recorded as beat-substrate and ${where} does not call it — the excuse is ` +
          `unbacked, which is worse than debt`,
      );
  }
  return problems;
}

/** EVERY DRIVEN-BY-ITS-OWN-SUITE CLAIM THIS FORMAT MAKES THAT NOTHING BACKS — category 3's check,
 *  under the same demand made of category 2.
 *
 *  The claim is: this decision's SUBJECT is the format's own committed files, so there is no
 *  delivered artefact for a command in `scripts/` to be pointed at, and the format's own test is
 *  where it is really driven. `deadExampleRunners` and `swallowedExampleRunners` are the two it was
 *  written for: their subject is this skill's own example runners, and the alternative was to give
 *  `scripts/example-runners.mjs` an `import.meta.main` nobody was told to run — buying eight
 *  cleared debt entries with a command no `SKILL.md` mentions, which is the wiring credit this rule
 *  exists to refuse.
 *
 *  The path is relative to THIS SKILL and has to start `test/`, so a format cannot back its own
 *  claim with a neighbour's suite.
 *
 *  WHAT THIS CANNOT SEE, and the hole is in the CATEGORY rather than in the check: whether the
 *  named test drives the decision over the skill's real population or feeds it a literal built to
 *  be refused. Every guard in this tree has a unit test that calls it, so "a test calls it" is true
 *  of the whole debt list — which is why this category is not a place to move a decision a
 *  `scripts/` command could ask, and why the only names in it are the ones whose subject is the
 *  skill's own files. A name arriving here whose subject is a delivered page is debt, and the
 *  reader of this list is the check on that, not the code below. */
export function ownSuiteWithoutACaller(skillDir, claims) {
  const problems = [];
  for (const claim of claims) {
    const name = claim && claim.name ? claim.name : "an entry with no name";
    const where = claim && typeof claim.calledBy === "string" ? claim.calledBy : "";
    if (name === "an entry with no name" || where === "")
      problems.push(`${name} is recorded as driven-by-its-own-suite and names no test that calls it`);
    else if (!/^test\//.test(where))
      problems.push(
        `${name} is recorded as driven-by-its-own-suite and names ${where}, which is not this ` +
          `format's own suite — the path is relative to this skill and starts test/`,
      );
    else if (!existsSync(join(skillDir, where)))
      problems.push(
        `${name} is recorded as driven-by-its-own-suite and names ${where}, which does not exist`,
      );
    else if (!fileReaches(join(skillDir, where), name))
      problems.push(
        `${name} is recorded as driven-by-its-own-suite and ${where} does not call it — the excuse ` +
          `is unbacked, which is worse than debt`,
      );
  }
  return problems;
}

/** THE THREE REASONS A DECLARED DECISION IS STILL NOT CALLED — one array in one voice until
 *  2026-08-23, telling three different facts.
 *
 *  What was recorded here, measured 2026-08-22, was read as one thing: DEBT. Reading `map-web`'s
 *  own list showed it was three. `credentialReadsWithoutAlias`, `pageLanguageMatchesStory` and
 *  `weightAgainstCeiling` are debt — nobody has wired them and somebody could. `unmatchedValues` is
 *  not: it needs a declared study set joined against a frozen source, which a skill's own seed does
 *  not have and must not invent, and inventing a fixture to ask about is the thing this rule exists
 *  to refuse. `deadExampleRunners` and `swallowedExampleRunners` are a third case again: their
 *  subject is this skill's OWN committed example runners, so the format's own test drives them on
 *  purpose, and the alternative was an `import.meta.main` on `scripts/example-runners.mjs` that no
 *  `SKILL.md` tells anyone to run — eight cleared debt entries bought with a command nobody runs.
 *
 *  A reason that excuses a name from the ratchet has to be CHECKED or it is debt wearing an excuse,
 *  so the list is three arrays and two of them are looked at:
 *
 *  1. `RECORDED_UNWIRED_DEBT` — MAY ONLY SHRINK. A name may leave it and may never join it; that is
 *     the ratchet, unchanged, and it is what these names are still under.
 *  2. `RECORDED_BEAT_SUBSTRATE` — MAY GROW, and every entry names a committed beat whose runner
 *     really calls the decision. `beatSubstrateWithoutACaller` reads that file.
 *  3. `RECORDED_DRIVEN_BY_ITS_OWN_SUITE` — MAY GROW, and every entry names a test in this format's
 *     own suite that really calls it. `ownSuiteWithoutACaller` reads that file.
 *
 *  Saying it in the shape of the file rather than in a sentence is the point: the array that may
 *  only shrink is a bare list of names with nothing to add to it, and the two that may grow cost an
 *  author a real caller each.
 *
 *  All three are per-format and outside every compared span, for the same reason
 *  `MEASURED_MIN_FRACTION` is: the DECISION above is one decision in all eight copies, and what
 *  differs is only what each format has actually paid off. */

/** CATEGORY 1 — THIS FORMAT'S DEBT, measured 2026-08-22 and recorded rather than forgiven. A
 *  RATCHET, the same shape `splash/test/delivered-size-matches-the-pin.test.ts` uses for a count
 *  that may only go down, with names instead of a number so that wiring one guard and unwiring
 *  another cannot look like standing still. A name may be REMOVED from this array, NEVER ADDED —
 *  adding one is how the defect that earned this rule would recur.
 *
 *  The map's own debt, and the largest per-file concentration in the tree: nine of these live in
 *  `verify-map.mjs`, which nothing in this skill imports and no command runs.
 *
 *  `labelPlacementIssues` IS HERE ON PURPOSE, and it is this round's finding. It was recorded
 *  beside `unmatchedValues` as a decision only a beat could call — it needs a laid-out label stack
 *  with measured text boxes, which this skill's seed does not have. The claim was checked on
 *  2026-08-23 and it has NO CALLER ANYWHERE: not one runner under `stories/` or `proof/` calls it,
 *  only `test/geo.test.ts` with label stacks built by hand. `placeLabels` beside it in
 *  `assets/geo.ts` REPAIRS a stack against the same two conditions without ever asking the
 *  decision, which is how a beat comes to clear it without running it. Until a real beat calls it,
 *  the excuse is unbacked and the name stays under the ratchet, where a reader can see it.
 */
export const RECORDED_UNWIRED_DEBT = [
  "creditTracesToRecord",
  "denominatorReadingStated",
  "doubleHyphenInDeliveredText",
  "labelPlacementIssues",
  "mislabelledRows",
  "neverArrives",
  "rtlRunsAreIsolated",
  "storyboardGateStatus",
  "weightAgainstCeiling",
];

/** CATEGORY 2 — DECISIONS ONLY A BEAT CAN CALL, because the decision needs material a skill's own
 *  seed does not have and MUST NOT INVENT.
 *
 *  `unmatchedValues` needs a declared study set joined against a frozen source: the set of regions
 *  the beat says it is drawing, and the journalist's own table. A skill's seed has neither, and
 *  giving it one means inventing a study set to ask about — a fixture, which is what
 *  `guard-wired-to-run` refuses. `stress-t-europe-recycling`'s own video runner calls it for real,
 *  on the names its downloaded file actually carries.
 *
 *  `calledBy` is a repository-relative path to a committed beat whose runner really calls the
 *  decision, and `beatSubstrateWithoutACaller` goes and reads it in the same caller view this file
 *  reads a skill's own scripts in — an import is not a call and a comment is not a call there
 *  either. The beat calls its OWN carried copy, which is what a beat is in this tree;
 *  `splash/test/guard-copies-parity.test.ts` is what holds that copy to this skill's. */
export const RECORDED_BEAT_SUBSTRATE = [
  { name: "unmatchedValues", calledBy: "stories/stress-t-europe-recycling/beats/europe-recycling-map/render-video.mjs" },
];

/** CATEGORY 3 — DECISIONS DRIVEN BY THIS FORMAT'S OWN SUITE, on purpose.
 *
 *  Their subject is this skill's OWN committed example runners, not a delivered beat, so there is
 *  no page and no run for a command in `scripts/` to ask them about. `test/example-runners-run.
 *  test.ts` drives both, in every one of the eight, which is the standing they have carried since
 *  the sweep was written. The alternative was to give `scripts/example-runners.mjs` an
 *  `import.meta.main` nobody was told to run, and buy the wiring credit this rule exists to refuse.
 *
 *  `calledBy` is relative to THIS SKILL and starts `test/`, so a format cannot back its own claim
 *  with a neighbour's suite; `ownSuiteWithoutACaller` goes and reads it. What that check cannot see
 *  is whether the test drives the decision over a real population or over a literal — every guard
 *  in this tree has a unit test that calls it, which is why this is not a place to move a decision
 *  a `scripts/` command could ask. */
export const RECORDED_DRIVEN_BY_ITS_OWN_SUITE = [
  { name: "deadExampleRunners", calledBy: "test/example-runners-run.test.ts" },
  { name: "swallowedExampleRunners", calledBy: "test/example-runners-run.test.ts" },
];

/** EVERY NAME THIS FORMAT RECORDS AS UNWIRED, whatever the reason — DERIVED from the three arrays
 *  above rather than typed beside them, so a name cannot be recorded under one reason and missing
 *  from the list the ratchet reads. `check-guard-wiring.mjs` and `doctrine/test/guard-wiring.
 *  test.ts` both read this. */
export const RECORDED_UNWIRED = [
  ...RECORDED_UNWIRED_DEBT,
  ...RECORDED_BEAT_SUBSTRATE.map((claim) => claim.name),
  ...RECORDED_DRIVEN_BY_ITS_OWN_SUITE.map((claim) => claim.name),
].sort();
