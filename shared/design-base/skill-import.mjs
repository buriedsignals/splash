// twin/shared/design-base/skill-import.mjs
//
// REWRITING A COPIED BEAT'S REACH INTO `skills/`, the way `oneRunDirection` rewrites its reach into
// the filed directions.
//
// A worked example lives at `proof/<beat>/`, two levels under a checkout that also holds `skills/`,
// so `import { x } from "../../skills/<skill>/…"` resolves for it and for nothing else. An installed
// stories root vendors `shared/` and nothing more — the Engine projects the skills into its own
// namespaced store — so a beat that inherits such a line fails on its very first import. Measured
// 2026-09-23, scaffolding a real story's choropleth into an installed root:
//
//   error: Cannot find module '../../skills/palette/scripts/palette.mjs' from '…/beats/…/beat.mjs'
//
// `skillScript` already answers "where is this skill, wherever it has been put". This turns the
// static line into the dynamic one that asks it. A module's top-level `await` is ESM, and every
// file this rewrites is one.
//
// IT REFUSES RATHER THAN NO-OPS on a shape it does not recognise, for the same reason
// `oneRunDirection` does: a transform that quietly does nothing is how the defect comes back.

/** `import { a, b } from "…/skills/<skill>/<path>";` — the shape every worked example writes. */
const REACH = /^import\s+\{([^}]+)\}\s+from\s+"(?:\.\.\/)+skills\/([a-z][a-z0-9-]*)\/([^"]+)";?$/gm;

/** The last static `import … ;` statement — one line or several — which is where the dynamic ones go. */
const LAST_IMPORT = /^import\s[\s\S]*?;$/gm;

/** True when this source has already been rewritten, so the transform is safe to run twice. */
export function readsThroughSkillScript(source) {
  return /\bskillScriptFrom\s*\(/.test(String(source));
}

/**
 * Rewrites every `../../skills/…` import into a dynamic one resolved through `skillScriptFrom`.
 *
 * @param {string} source the file, already renamed for this beat
 * @param {string} what   the file's name, for the refusal
 */
export function throughSkillScript(source, what = "this file") {
  const text = String(source);
  const found = [...text.matchAll(REACH)];
  if (found.length === 0) return text;

  // WHERE THEY GO: directly under the last static import, which is the only place that is below
  // every specifier the file already resolves and above every line that does any work. Anchoring on
  // the beat's own root instead — the first version of this — required a root that a `beat.mjs` does
  // not have, and put the resolver one line below the first use when the file did have one, because
  // the anchor was measured in the text before the static lines were cut out of it. That is the same
  // temporal dead zone `oneRunDirection` shipped, one transform earlier.
  const lines = [
    `const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");`,
  ];
  let out = text;
  for (const m of found) {
    const imported = m[1]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .join(", ");
    const parts = [m[2], ...m[3].split("/")].map((p) => JSON.stringify(p)).join(", ");
    lines.push(
      `const { ${imported} } = await import(skillScriptFrom(import.meta.dirname, ${parts}));`,
    );
    out = out.replace(`${m[0]}\n`, "").replace(m[0], "");
  }

  LAST_IMPORT.lastIndex = 0;
  let last = null;
  for (let m; (m = LAST_IMPORT.exec(out)); ) last = m;
  if (!last)
    throw new Error(
      `${what} reaches into skills/ and has no import line left to anchor the resolver under, so ` +
        "there is no point in the file that is above its work and below its specifiers " +
        "(shared/design-base/skill-import.mjs).",
    );
  const at = last.index + last[0].length;
  return `${out.slice(0, at)}\n${lines.join("\n")}${out.slice(at)}`;
}

/**
 * The same, over the whole set of files a scaffold is about to write — `.mjs` only.
 *
 * A `.ts`/`.tsx` asset is not rewritten here: it is read by a bundler, not by a module loader, and a
 * bundler cannot follow a specifier it only learns at runtime. Those reaches are named by
 * `skills/splash/test/nothing-a-journalist-receives-reaches-into-skills.test.ts` rather than
 * silently rewritten into something that does not build.
 *
 * @param {Record<string, string>} files `{ filename: content }`, plus whatever else the caller keeps there
 */
export function eachThroughSkillScript(files) {
  const out = {};
  for (const [name, content] of Object.entries(files))
    out[name] = name.endsWith(".mjs") ? throughSkillScript(content, name) : content;
  return out;
}
