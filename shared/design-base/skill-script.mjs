// twin/shared/design-base/skill-script.mjs
//
// WHERE A BEAT FINDS THE SKILL THAT PRODUCES IT — and in an installed root it is not under the
// stories root, which is what every scrolly beat assumed.
//
// `splashRoot` walks up from a beat for a `package.json` declaring `#shared/*`, and in a CHECKOUT
// that root also holds `skills/`, so `join(root, "skills", …)` resolved. An installed root is not a
// checkout: the Engine creates a stories root that vendors `shared/` and nothing else, and projects
// the skills into its own namespaced store (`~/.agents/skills/splash/<skill>`, AGENTS.md). Measured
// 2026-09-23 by scaffolding a real story's scrolly beat into an installed root and running it:
//
//   Cannot find module '/Users/…/splash-stories/skills/scrolly/scripts/render-scrolly.mjs'
//
// Nothing was wrong with the beat. `#shared/*` is the answer for code the root vendors, and there
// was no answer at all for a script that lives in a skill — so this is it, and it refuses naming
// every place it looked rather than letting a beat fail deep inside an import.

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The product namespace the Engine projects Splash's skills under. */
const AGENTS_STORE = () => join(homedir(), ".agents", "skills", "splash");

/**
 * The absolute path of a script inside one of Splash's own skills.
 *
 * Looked for in the order a reader would guess, and each one is a real deployment:
 *   1. `SPLASH_CHECKOUT_ROOT` — what the Engine sets for anything it launches;
 *   2. the root this beat already found — a development checkout, where the stories live inside it;
 *   3. the Engine's own namespaced projection, for a beat run by hand from an installed root.
 *
 * @param {string} root  the root `splashRoot(HERE)` found
 * @param {string} skill e.g. `"scrolly"`
 * @param {...string} parts the path inside the skill, e.g. `"scripts", "render-scrolly.mjs"`
 */
export function skillScript(root, skill, ...parts) {
  const looked = [];
  const fromEnv = process.env.SPLASH_CHECKOUT_ROOT;
  const candidates = [
    ...(fromEnv ? [join(fromEnv, "skills", skill, ...parts)] : []),
    join(root, "skills", skill, ...parts),
    join(AGENTS_STORE(), skill, ...parts),
  ];
  for (const candidate of candidates) {
    looked.push(candidate);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `this beat cannot find ${skill}/${parts.join("/")} — the skill that produces it. An installed ` +
      "stories root vendors `shared/` and not `skills/`; the Engine projects the skills into its own " +
      "namespaced store instead. Set SPLASH_CHECKOUT_ROOT to the Splash checkout, or run this beat " +
      `from one. Looked in:\n  ${looked.join("\n  ")}`,
  );
}
