/**
 * A TEMPLATE THAT DOES NOT PARSE IS A BEAT THAT CANNOT EXIST, and nothing was reading them.
 *
 * The scaffolds write their beats by filling `%%TOKEN%%`s in these files. Nothing imports a `.tmpl`, so a
 * typo in one survives every test in this repository and surfaces only when a journalist scaffolds a beat
 * and runs it — at which point the error names a file in THEIR story, not the template it was copied from.
 *
 * The templates were edited heavily on 2026-09-23 (eleven of them, to stop reaching into `skills/`), which
 * is exactly the kind of pass that leaves an unbalanced brace behind. This parses each one with the tokens
 * filled by a placeholder, which is what the scaffold does, and reports the file and the message.
 *
 * It parses only: resolving the imports would need a root with `node_modules` and is not this file's
 * question. A specifier that resolves nowhere is held by `nothing-a-journalist-receives-reaches-into-skills`
 * and by `every-import-is-declared`.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/** Every code template any skill ships, with its path relative to `skills/`. */
function codeTemplates(): {
  name: string;
  source: string;
  loader: "tsx" | "ts" | "js";
}[] {
  const out: { name: string; source: string; loader: "tsx" | "ts" | "js" }[] =
    [];
  for (const skill of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const assets = join(SKILLS, skill.name, "assets");
    if (!existsSync(assets)) continue;
    for (const dir of readdirSync(assets).filter((d) =>
      d.endsWith("-scaffold"),
    )) {
      for (const file of readdirSync(join(assets, dir))) {
        const loader = file.endsWith(".tsx.tmpl")
          ? "tsx"
          : file.endsWith(".ts.tmpl")
            ? "ts"
            : file.endsWith(".mjs.tmpl")
              ? "js"
              : null;
        if (!loader) continue;
        out.push({
          name: `${skill.name}/assets/${dir}/${file}`,
          // What the scaffold fills, as the scaffold fills it: a token stands where a name will stand, so
          // the file parses as the code it is about to become rather than as a file full of `%%`.
          source: readFileSync(join(assets, dir, file), "utf8").replace(
            /%%[A-Za-z_]+%%/g,
            "Xx",
          ),
          loader,
        });
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

describe("every scaffold template", () => {
  it("finds the templates at all, so this file cannot pass by looking at nothing", () => {
    expect(codeTemplates().length).toBeGreaterThanOrEqual(25);
  });

  it("parses as the code it is about to become", () => {
    const broken: string[] = [];
    for (const { name, source, loader } of codeTemplates()) {
      try {
        new Bun.Transpiler({ loader }).scan(source);
      } catch (error) {
        broken.push(`${name}: ${(error as Error).message}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
