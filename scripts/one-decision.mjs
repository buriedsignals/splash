/**
 * ONE DECISION, MORE THAN ONE PLACE — DO THOSE PLACES STILL AGREE?
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────────
 *
 * Five times in one week a fix was made and did not reach the places that needed it, and every one
 * was found by a real story rather than by a test:
 *
 *   1. a credential read through an alias list reached the map probe, then not its GATE, then not
 *      the operation, then not four test gates, then not four scrolly instruments;
 *   2. a sea derived from the ground reached one bake of three;
 *   3. the basemap theme is hard-coded in three skills with a private copy in every beat directory;
 *   4. the world wrap reached the skill's renderer and not six page assemblers, and a story written
 *      hours later shipped the old behaviour;
 *   5. a space-grouped numeral (`59 000`) has been reported by two independent stories, hours apart.
 *
 * This tree already answers the question for decisions somebody REMEMBERED to register — `COPIES`
 * in `skills/splash/test/guard-copies-parity.test.ts`, and `requires`/`states` in
 * `skills/doctrine/references/guard-catalogue.json`. Every drift above happened in a decision
 * nobody registered, and both registries are keyed on SKILLS, so neither can be about a file under
 * `proof/` or `stories/` at all — which is exactly where a fix fails to arrive, because a NEW beat
 * is the place nobody has typed yet.
 *
 * So the populations here are DISCOVERED. Nothing below is a list of paths.
 *
 * ── WHAT IS MEASURED, AND WHAT IS NOT ─────────────────────────────────────────────────────────
 *
 * Three readings ship. Each answers "one decision, several places, do they agree" over a
 * population the tree itself defines:
 *
 *   R1 `credentialReadings`      — a credential named in a file that never names its alias list.
 *   R2 `hardCodedChoices`        — a value the tree DERIVES in one place and WRITES DOWN in another.
 *   R3 `copiesThatDisagree`      — a function of one name in three or more files, where a majority
 *                                  agree byte for byte and a minority is nearly, but not, the same.
 *   R4 `capabilitiesThatStopped` — a function the SKILL declares and at least one other assembler
 *                                  of the same artefact carries, missing from a third.
 *
 * A FIFTH READING WAS BUILT, MEASURED AND REJECTED, and it is named here so the next author does
 * not pay for it twice. THE GENERAL LINEAGE HOLE — "file A and file B share a backbone of
 * byte-identical functions, and A declares one B does not" — is the literal shape of defects 2, 3
 * and 4, and it fires on all three. It also fires 889 times on this tree at its most selective
 * setting (a shared backbone of at least six identical bodies AND at least 70% of the smaller
 * file's functions), and 1 391 times at half that. This tree vendors a private copy of its geometry
 * helpers into every beat directory, and a hexgrid's `geo-hex.ts` legitimately does not carry a
 * choropleth's `waterFor`. A detector that fires on every legitimate divergence is a detector
 * nobody keeps. R4 is that reading with its population cut down to what the ARTEFACT says rather
 * than what the code resembles, which is the difference between 889 findings and 28.
 *
 * WHAT IS STILL NOT REACHED, MEASURED RATHER THAN HOPED: defect 2 (the derived sea) and defect 5
 * (the space-grouped numeral). Both are argued in `scripts/one-decision-record.mjs`.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** Where this tree keeps code. `node_modules` and `.git` are skipped inside the walk. */
export const WALKED = [
  "proof",
  "stories",
  "skills",
  "shared",
  "scripts",
  "apps",
  "installer",
  "harness",
  "landing",
  "catalog",
  "install",
];

function* filesUnder(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else if (/\.(mjs|ts|tsx|js)$/.test(entry.name)) yield path;
  }
}

/** Every source file in the tree, repository-relative, sorted, with its comments removed.
 *
 *  COMMENTS ARE STRIPPED for the reason `splash/scripts/verify-credentials.mjs`'s own `shippedSource`
 *  strips them: `map-beat`'s first run of its own credential sweep matched
 *  `process.env.DATAWRAPPER_TOKEN` inside a doc comment three lines above the function, and reported
 *  a skill as reading a token it has never touched. A name in prose is not a decision. */
export function treeSources(root) {
  const out = new Map();
  for (const dir of WALKED)
    for (const file of filesUnder(join(root, dir)))
      out.set(
        relative(root, file),
        readFileSync(file, "utf8")
          .replace(/^[ \t]*\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, " "),
      );
  return new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// R1 — THE CREDENTIAL, AND EVERY NAME IT TRAVELS UNDER
// ─────────────────────────────────────────────────────────────────────────────────────────────

const CREDENTIAL = "[A-Z][A-Z0-9_]*_(?:KEY|TOKEN)";

/** Every credential this file READS, by the three readings a `.env` is actually read with here.
 *
 *  READING 1 is the catalogue's own, copied from `credentialNamesRead` in
 *  `splash/scripts/verify-credentials.mjs`: `env.NAME` and `env["NAME"]`.
 *
 *  READINGS 2 AND 3 ARE WHY THIS FUNCTION IS NOT THAT ONE, and the difference is the whole of
 *  defect 1's tail. Measured on the pre-fix trees:
 *
 *    · `skills/map-web/test/live-map.test.ts` — the GATE that decides whether the live probe runs
 *      at all — read `parseEnvFile(readFileSync(path, "utf8")).MAPTILER_KEY`. The receiver is a
 *      PARSED environment, not `process.env`, so reading 1 does not see it.
 *    · `proof/mapscrolly-quakes-three-ways/drive.mjs` and three `verify-live-tiles.mjs` beside it
 *      read the raw file: `.find((l) => l.startsWith("MAPTILER_KEY="))`. That is a string literal,
 *      and reading 1 does not see it either.
 *
 *  Both were reported CLEAN by the catalogue's decision while every one of them threw
 *  "no MAPTILER_KEY" against a real, present key. A guard that cannot observe the shape of its own
 *  defect is the first of this repository's four recurring shapes, so the reading is widened HERE,
 *  in this file's own population, rather than by editing a decision that six skills carry copies of. */
export function credentialNamesRead(source) {
  const names = new Set();
  for (const m of source.matchAll(new RegExp(`\\benv(?:\\.|\\[["'\`])(${CREDENTIAL})\\b`, "g")))
    names.add(m[1]);
  // A parsed environment: any call whose callee name contains `env`/`Env`, then `.NAME`. One level
  // of nested parentheses is allowed, which is what `parseEnvFile(readFileSync(p, "utf8")).X` needs.
  for (const m of source.matchAll(
    new RegExp(
      `\\b[A-Za-z_$][\\w$]*[Ee]nv[\\w$]*\\s*\\((?:[^()]|\\([^()]*\\))*\\)\\s*\\)?\\s*\\.\\s*(${CREDENTIAL})\\b`,
      "g",
    ),
  ))
    names.add(m[1]);
  // A raw `.env` line, matched as text: the literal `"NAME="`.
  for (const m of source.matchAll(new RegExp(`["'\`](${CREDENTIAL})=`, "g"))) names.add(m[1]);
  return [...names].sort();
}

/** A credential named in this file with no `<NAME>_ALIASES` list named anywhere in it.
 *
 *  Byte-for-byte the catalogue's own rule (`credentialReadsWithoutAlias`), applied to ONE FILE
 *  rather than to a whole skill's shipped source. The narrowing is the point: at skill scope, a
 *  `bake-plate.mjs` that resolves every alias EXCUSES a `drive.mjs` beside it that resolves none,
 *  and that is precisely how four scrolly instruments sat unrunnable in `proof/` while the rule
 *  they violate was green in every skill.
 *
 *  THE COST, NAMED: a file that reads a canonical name and delegates the resolution to an imported
 *  resolver is refused here too — `dw-beat/scripts/sealed-produce.mjs` is the case the catalogue's
 *  own doc comment names. Those are recorded, with that reason, in `one-decision-record.mjs`. */
export function credentialReadsWithoutAlias(source) {
  return credentialNamesRead(source).filter((name) => !source.includes(`${name}_ALIASES`));
}

/** Every file in the tree that names a credential and never names its alias list, as
 *  `path  NAME,NAME` lines. Sorted, so the answer is a set and not an order. */
export function credentialReadings(sources) {
  const found = [];
  for (const [file, source] of sources) {
    const refused = credentialReadsWithoutAlias(source);
    if (refused.length > 0) found.push(`${file}  ${refused.join(",")}`);
  }
  return found.sort();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// R2 — A VALUE THE TREE DERIVES SOMEWHERE, AND WRITES DOWN SOMEWHERE ELSE
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Just past the `)` closing the parameter list that starts at or after `from`. */
function paramsEnd(text, from) {
  let i = text.indexOf("(", from);
  if (i < 0) return -1;
  let depth = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Just past the `}` closing the block that starts at or after `from`, brace-matched with strings,
 *  template literals (and their `${…}` holes), comments and regex literals all tracked.
 *
 *  IT IS NOT "THE FIRST `\n}\n`". `map-web/test/the-fix-reaches-the-page-assemblers.test.ts`
 *  measured what that costs: a function returning a STYLESHEET is full of lines that are exactly
 *  `}`, and the cheap reading covered 951 bytes of a 4 952-byte function while claiming to compare
 *  the whole of it. Copied from there, which is the same reading `guard-copies-parity.test.ts`
 *  needs and the reason both exist. */
function blockEnd(text, from) {
  let i = text.indexOf("{", from);
  if (i < 0) return -1;
  const stack = [];
  let depth = 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") {
      i++;
      continue;
    }
    const mode = stack[stack.length - 1];
    if (mode === "'" || mode === '"') {
      if (c === mode) stack.pop();
      continue;
    }
    if (mode === "`") {
      if (c === "`") stack.pop();
      else if (c === "$" && text[i + 1] === "{") {
        stack.push("${");
        i++;
      }
      continue;
    }
    if (mode === "//") {
      if (c === "\n") stack.pop();
      continue;
    }
    if (mode === "/*") {
      if (c === "*" && text[i + 1] === "/") {
        stack.pop();
        i++;
      }
      continue;
    }
    if (mode === "/") {
      if (c === "[") stack.push("[");
      else if (c === "/") stack.pop();
      continue;
    }
    if (mode === "[") {
      if (c === "]") stack.pop();
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      stack.push(c);
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      stack.push("//");
      i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      stack.push("/*");
      i++;
      continue;
    }
    if (c === "/") {
      const before = text.slice(0, i).trimEnd().slice(-1);
      if (before === "" || "=([{,;:!&|?+-*%~^<>".includes(before)) {
        stack.push("/");
        continue;
      }
    }
    if (c === "{") {
      depth++;
      continue;
    }
    if (c === "}") {
      if (mode === "${") {
        stack.pop();
        continue;
      }
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

const DECLARATION = /^(?:export )?(?:export default )?(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;

/** Every function this source declares, name to body-as-written. */
export function functionsIn(source) {
  const out = new Map();
  for (const m of source.matchAll(DECLARATION)) {
    const end = blockEnd(source, paramsEnd(source, m.index));
    if (end < 0) continue;
    out.set(m[1], source.slice(m.index, end));
  }
  return out;
}

/** A literal worth calling a member of a vocabulary: long enough to be a name rather than a word,
 *  and carrying a separator, which is how this tree writes the alternatives of one decision
 *  (`dataviz-dark`, `dataviz-light`; `G2-producer`, `G2-treatment`). */
const distinctive = (s) => s.length >= 6 && /[-_]/.test(s);

/** The stem two or more members of a vocabulary share, or `null`.
 *
 *  THE STEM IS WHAT SEPARATES A VOCABULARY FROM A COINCIDENCE, and it was added after measuring the
 *  alternative. Without it, `checkHover`'s `return "data-detail" … return "hit-area"` reads as a
 *  vocabulary, and sixty files that legitimately name one of the two become findings. With it,
 *  `dataviz-dark`/`dataviz-light` are alternatives of one decision (both are `dataviz` something)
 *  and `data-detail`/`hit-area` are two different things one function happens to return. */
function sharedStem(members) {
  const tokensOf = (s) => s.split(/[_.-]/).filter((t) => t.length >= 4).map((t) => t.toUpperCase());
  let common = null;
  for (const m of members) {
    const here = new Set(tokensOf(m));
    common = common === null ? here : new Set([...common].filter((t) => here.has(t)));
    if (common.size === 0) return null;
  }
  return common && common.size > 0 ? [...common].sort()[0] : null;
}

/** Every vocabulary the tree DERIVES: a function that returns two or more distinctive literals
 *  sharing a stem. The function is the decision; the literals are what it decides between. */
export function derivedVocabularies(sources) {
  const byMembers = new Map();
  for (const [file, source] of sources)
    for (const [name, body] of functionsIn(source)) {
      const literals = new Set();
      for (const m of body.matchAll(/return[^;\n]*?(['"])([A-Za-z][A-Za-z0-9_.-]{2,63})\1/g))
        if (distinctive(m[2])) literals.add(m[2]);
      if (literals.size < 2) continue;
      const members = [...literals].sort();
      if (sharedStem(members) === null) continue;
      const key = members.join("|");
      if (!byMembers.has(key)) byMembers.set(key, { members, choosers: [] });
      byMembers.get(key).choosers.push(`${file}:${name}`);
    }
  return [...byMembers.values()].sort((a, b) => (a.members[0] < b.members[0] ? -1 : 1));
}

/** Every file that WRITES DOWN a member of a vocabulary the tree derives elsewhere — a decision
 *  taken once, by hand, in a place that will never be re-taken when the derivation changes.
 *
 *  A file that names EVERY member is not a finding: naming both sides is what a second copy of the
 *  derivation looks like, and this reading cannot tell one from the other. A file that carries a
 *  chooser for the vocabulary is not a finding either — it IS the derivation. */
export function hardCodedChoices(sources) {
  const found = [];
  for (const vocabulary of derivedVocabularies(sources)) {
    const owners = new Set(vocabulary.choosers.map((c) => c.slice(0, c.lastIndexOf(":"))));
    for (const [file, source] of sources) {
      if (owners.has(file)) continue;
      const named = vocabulary.members.filter((m) =>
        new RegExp(`(['"\`])${m.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\1`).test(source),
      );
      if (named.length === 0 || named.length === vocabulary.members.length) continue;
      found.push(`${file}  ${named.join(",")} of [${vocabulary.members.join(",")}]`);
    }
  }
  return found.sort();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// R3 — A COPY THAT NO LONGER AGREES WITH ITS OWN MAJORITY
// ─────────────────────────────────────────────────────────────────────────────────────────────

const normalise = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ").replace(/\s+/g, " ").trim();

const tokensOf = (text) =>
  normalise(text).match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\sA-Za-z0-9_$]/g) ?? [];

/** Dice coefficient over token bigrams. Symmetric, order-sensitive, and cheap enough to run over
 *  every same-named pair in a tree of a thousand files. */
export function similarity(a, b) {
  const bigrams = (tokens) => {
    const counts = new Map();
    for (let i = 0; i + 1 < tokens.length; i++) {
      const key = `${tokens[i]} ${tokens[i + 1]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  let nl = 0;
  let nr = 0;
  for (const v of left.values()) nl += v;
  for (const v of right.values()) nr += v;
  for (const [k, v] of left) shared += Math.min(v, right.get(k) ?? 0);
  return nl + nr === 0 ? 1 : (2 * shared) / (nl + nr);
}

/** HOW ALIKE TWO COPIES MUST BE BEFORE DISAGREEING IS A DEFECT RATHER THAN A DIFFERENCE.
 *
 *  Measured over this tree: 268 function names are declared in more than one file with more than
 *  one body. At 0.90 that is 88 findings, at 0.95 it is 58, at 0.98 it is 31, at 0.99 it is 19.
 *  0.98 is where the population stops containing pairs like `render` (0.012 similar between two
 *  beats that share only the word) and starts containing pairs that differ by a line. A fix that
 *  did not travel leaves copies that are nearly the same, which is exactly this band. */
export const SAME_DECISION = 0.98;

/** THE FEWEST COPIES A MAJORITY CAN BE READ FROM. With two copies there is no majority — the pair
 *  disagrees and nothing in the text says which one is behind — and `COPIES` in
 *  `guard-copies-parity.test.ts` is the registry for a pair somebody has decided about. */
export const FEWEST_COPIES = 3;

/** Every function name declared in three or more files where a strict majority of the copies agree
 *  byte for byte and a minority is nearly, but not, the same as them.
 *
 *  Both directions are one finding: the minority may be the copy a fix never reached, or the only
 *  copy it did reach. The text cannot say which, and saying which is not this reading's job — it
 *  says WHERE one decision stopped being one decision. */
export function copiesThatDisagree(sources) {
  const byName = new Map();
  for (const [file, source] of sources)
    for (const [name, body] of functionsIn(source)) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ file, norm: normalise(body), tokens: tokensOf(body) });
    }
  const found = [];
  for (const [name, copies] of byName) {
    if (copies.length < FEWEST_COPIES) continue;
    const clusters = new Map();
    for (const copy of copies) {
      if (!clusters.has(copy.norm)) clusters.set(copy.norm, []);
      clusters.get(copy.norm).push(copy);
    }
    if (clusters.size === 1) continue;
    const ranked = [...clusters.values()].sort((a, b) => b.length - a.length);
    // No majority means no reference to be behind. A tie is two conventions, not one drift.
    if (ranked[0].length < 2 || ranked[1].length === ranked[0].length) continue;
    for (const cluster of ranked.slice(1)) {
      if (similarity(cluster[0].tokens, ranked[0][0].tokens) < SAME_DECISION) continue;
      // THE MAJORITY'S SIZE IS DELIBERATELY NOT IN THIS LINE. Three other agents commit to this
      // tree at once, and a count in a recorded line changes every time a beat is added — which
      // turns the record into the very thing this task was told not to build, a list somebody bumps
      // for reasons that have nothing to do with a decision drifting. The count is printed by the
      // test that fails, where it is read once, not stored where it must be maintained.
      for (const copy of cluster) found.push(`${name}  ${copy.file}`);
    }
  }
  return found.sort();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// R4 — A CAPABILITY THE SKILL CARRIES THAT STOPPED PART-WAY THROUGH THE FILES THAT ASSEMBLE ITS
//      ARTEFACT
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** An artefact's own shell: an opening tag with a class, written as a literal.
 *
 *  THE POPULATION IS READ OFF THE ARTEFACT, NOT OFF THE CODE, and that is the whole difference
 *  between this reading and the rejected one above. A file that emits `<div class="map-web-page">`
 *  assembles a map-web page whatever it is called and wherever it lives; a file that merely
 *  RESEMBLES it may be a different format that vendored the same helper. `map-web`'s own
 *  `test/the-fix-reaches-the-page-assemblers.test.ts` derived its population this exact way, for one
 *  skill and one capability, the day before this file was written. This is that property with the
 *  format and the capability both derived instead of named. */
const ARTEFACT_SHELL = /(['"`])(<[a-z]+ class="[a-z0-9-]{4,}"[^'"`]{0,40})\1/g;

/** THE FEWEST FILES AN ARTEFACT MUST BE ASSEMBLED BY before "one of them is behind" is a question
 *  worth asking. With two there is no third to be behind of. */
export const FEWEST_ASSEMBLERS = 3;

/** Every file that emits an artefact shell, grouped by the shell. `test/` QUOTES a shell without
 *  ever delivering one — this reading's own test does — the same carve-out
 *  `no-cross-skill-imports.test.ts` makes, for the same reason. */
export function assemblersByArtefact(sources) {
  const byShell = new Map();
  for (const [file, source] of sources) {
    if (file.split("/").includes("test")) continue;
    for (const m of source.matchAll(ARTEFACT_SHELL)) {
      if (!byShell.has(m[2])) byShell.set(m[2], new Set());
      byShell.get(m[2]).add(file);
    }
  }
  const out = new Map();
  for (const [shell, files] of byShell)
    if (files.size >= FEWEST_ASSEMBLERS) out.set(shell, [...files].sort());
  return new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Every function a SKILL declares, that at least one other assembler of the same artefact also
 *  declares, and that a third assembler does not.
 *
 *  The skill's own file is the reference because a skill is what teaches a beat to exist; a
 *  function only a beat has is that beat's business. "At least one other carries it" is what makes
 *  this a TRAVEL question rather than a coverage one — the capability has demonstrably moved once,
 *  so the files it did not reach are behind rather than different.
 *
 *  THE LIMIT, MEASURED AND NAMED: exactly one artefact shell in this tree is emitted by three or
 *  more non-test files today, so R4's population is one format. It widens on its own the day a
 *  second format's page is assembled in three places — which is the day it starts mattering. */
export function capabilitiesThatStopped(sources) {
  const declared = new Map();
  for (const [file, source] of sources) declared.set(file, new Set(functionsIn(source).keys()));
  const found = [];
  for (const [shell, files] of assemblersByArtefact(sources)) {
    const references = files.filter((file) => file.startsWith("skills/"));
    if (references.length === 0) continue;
    const names = new Set(references.flatMap((file) => [...declared.get(file)]));
    for (const name of [...names].sort()) {
      const carriers = files.filter((file) => declared.get(file).has(name));
      if (carriers.length < 2) continue;
      for (const file of files)
        if (!declared.get(file).has(name))
          // Same reason as R3: `carriers.length/files.length` moves whenever a beat joins the
          // format, and a record that churns on arrivals is a record nobody trusts.
          found.push(`${name}  absent from ${file}  of ${shell}`);
    }
  }
  return found.sort();
}

/** THE FOUR READINGS AS ONE ANSWER, each line prefixed with the reading that produced it. */
export function divergences(sources) {
  return [
    ...credentialReadings(sources).map((line) => `R1 ${line}`),
    ...hardCodedChoices(sources).map((line) => `R2 ${line}`),
    ...copiesThatDisagree(sources).map((line) => `R3 ${line}`),
    ...capabilitiesThatStopped(sources).map((line) => `R4 ${line}`),
  ].sort();
}

/** Every divergence the walk finds that is not yet under the ratchet. A JOIN is the failure this
 *  file exists to name: a decision that has just stopped being one decision. */
export function divergencesThatJoined(recorded, found) {
  const known = new Set(recorded);
  return found.filter((line) => !known.has(line));
}

/** Every recorded divergence the walk no longer finds. NOT a failure — a divergence closing is the
 *  point — but returned so the record cannot rot into a list of things that were fixed years ago
 *  and still pad the ceiling. */
export function divergencesThatLeft(recorded, found) {
  const still = new Set(found);
  return recorded.filter((line) => !still.has(line));
}

if (import.meta.main) {
  const root = join(import.meta.dirname, "..");
  const sources = treeSources(root);
  const found = divergences(sources);
  console.log(`${sources.size} source files walked, ${found.length} divergences:`);
  for (const line of found) console.log(`  ${line}`);
}
