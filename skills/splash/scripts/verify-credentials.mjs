// THE CREDENTIAL SWEEP FOR A SKILL THAT ORCHESTRATES RATHER THAN DRAWS.
//
// `credential-alias-reconciled` was earned by a defect this skill's own `run-operation.mjs` is
// named in: a provider credential read by its canonical env name while the root's `.env` holds it
// under the engine's name, so preflight reported the capability open on a real, present token and
// production refused "no token" one phase later. The rule has been in the catalogue since that day
// and, until the population was widened on 2026-08-23, had never once been asked of this skill —
// `reachable()` iterated the eight skills that DRAW, and this one ships and orchestrates.
//
// It is asked now. The decisions below are the catalogue's own, copied byte-identically from
// `map-web/scripts/verify-guards.mjs` (no cross-skill runtime import; `splash/test/
// guard-copies-parity.test.ts` is what holds the copies to one decision), and
// `check-credentials.mjs` beside this file is the command that runs them over this skill's own
// source.

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["credentialReadsWithoutAlias"];

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

/** EVERY FILE THIS SKILL SHIPS, as one string with its comments removed — the WHOLE skill, which is
 *  what `credentialReadsWithoutAlias`'s own doc comment says its `source` should be and what the
 *  two existing sweeps (`map-beat`'s and `scrolly`'s `credentialsWithoutAliases`) narrow to
 *  `scripts/*.mjs`. The wider read is the point here: a skill that ships a beat carries its
 *  credential reads in ordinary delivery code, not in one bake script.
 *
 *  COMMENTS ARE STRIPPED FIRST, and `map-beat`'s first run of its own sweep is why: the match was
 *  `process.env.DATAWRAPPER_TOKEN` inside `credentialReadsWithoutAlias`'s OWN doc comment, three
 *  lines above the function, and the skill was reported as reading a token it has never touched. A
 *  credential named in prose is not a credential read. Whole-line `//` and block comments only —
 *  `render-still-parity.test.ts` argues that same normalisation, and a trailing `//` cannot be cut
 *  safely out of a file this full of regex literals.
 *
 *  `test/` IS EXCLUDED, and the exclusion is the rule rather than a convenience: a unit test feeds a
 *  decision a synthetic credential built to be refused, so counting one would make every sweep here
 *  answer for a string somebody wrote to watch it go red. */
export function shippedSource(skillDir) {
  const pending = [skillDir];
  const found = [];
  while (pending.length > 0) {
    const dir = pending.pop();
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "test" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (/\.(mjs|js|ts|tsx)$/.test(entry.name))
        found.push(
          readFileSync(path, "utf8")
            .replace(/^[ \t]*\/\/.*$/gm, "")
            .replace(/\/\*[\s\S]*?\*\//g, " "),
        );
    }
  }
  return found.sort().join("\n");
}

/** THE TWO READINGS THE COMMAND TAKES, and the reason there are two rather than one.
 *
 *  `refused` is the catalogue's own decision, run over this whole skill: a canonical name read with
 *  no `<NAME>_ALIASES` list declared anywhere in it.
 *
 *  `outsideTheResolver` is STRICTER, and it exists because the catalogue's decision goes blind in
 *  exactly the skills that own a resolver. Its doc comment says so itself — it cannot see whether a
 *  read consults the list, only whether the list is declared — so in a skill whose alias table names
 *  `CLOUDFLARE_API_TOKEN_ALIASES`, a bare `process.env.CLOUDFLARE_API_TOKEN` three files away is
 *  EXCUSED by the very table it ignores. That is not hypothetical: it is `run-operation.mjs`'s third
 *  provider case, the third sighting in one week of a credential read by its canonical name between
 *  two lines that resolve aliases, and the catalogue's decision alone would have reported this skill
 *  clean while it stood.
 *
 *  So a skill that ships `resolveEnvKey` answers a sharper question: NOTHING here reads a canonical
 *  credential name off the environment at all. There is one way in, and every read takes it. That is
 *  a fact about these two skills rather than a rule for the tree — a skill with no resolver of its
 *  own (`dw-beat`'s `sealed-produce.mjs`, which imports one) could not meet it — which is why it
 *  lives in this sweep and not in the copied decision above. */
export function credentialReadings(skillDir) {
  const source = shippedSource(skillDir);
  return {
    refused: credentialReadsWithoutAlias(source),
    outsideTheResolver: credentialNamesRead(source),
  };
}
