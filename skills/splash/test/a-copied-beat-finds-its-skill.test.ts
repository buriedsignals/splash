/**
 * A COPIED BEAT REACHES INTO `skills/`, AND NOTHING BUT A CHECKOUT'S `proof/` HAS `skills/` THERE.
 *
 * Every worked example lives at `proof/<beat>/`, two levels under a checkout that also holds
 * `skills/`, so `import { x } from "../../skills/<skill>/…"` resolves — for it, and for nothing
 * else. The eight scaffolds ADAPT such an example by copying its code, so a journalist receives that
 * line at `stories/<story>/beats/<beat>/`, where `../../` is the story folder. It is wrong twice
 * over: wrong depth even inside a checkout, and in an installed stories root there is no `skills/`
 * at any depth — that root vendors `shared/` and the Engine projects the skills into its own
 * namespaced store. Measured 2026-09-23, scaffolding a real story's choropleth into one:
 *
 *   error: Cannot find module '../../skills/palette/scripts/palette.mjs' from '…/beat.mjs'
 *
 * `throughSkillScript` turns that static line into a dynamic import asked of `skillScriptFrom`,
 * which knows the places a skill can have been put. The rewritten lines go under the last static
 * import: below every specifier the file already resolves, above every line that does work. An
 * earlier version anchored them on the beat's own `ROOT` instead, which fails both ways — a
 * `beat.mjs` reaches its shared code through `#shared/*` and declares no root at all, and where a
 * root did exist the anchor was measured in the text BEFORE the static lines were cut out of it, so
 * the insertion slid down past the first use. That is the temporal dead zone `oneRunDirection`
 * shipped, one transform earlier, which is why the last case here runs the rewritten module rather
 * than reading it.
 */
import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readsThroughSkillScript,
  throughSkillScript,
} from "../../../shared/design-base/skill-import.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** The shape a copied beat has: its own shared imports, one reach into a skill, then the work. */
const BEAT = `import { readFileSync } from "node:fs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";
import {
  renderStill,
  assertWithinFrame,
} from "../../skills/chart-beat/scripts/render-still.mjs";
import { BEAT } from "./bake.mjs";

const PALETTE = matchConvention(readFileSync(BEAT, "utf8"));
renderStill(PALETTE);
assertWithinFrame(PALETTE);
`;

describe("a beat copied out of the catalogue", () => {
  it("leaves a file that reaches into no skill exactly as it found it", () => {
    const plain = `import { join } from "node:path";\nconsole.log(join("a"));\n`;
    expect(throughSkillScript(plain, "plain.mjs")).toBe(plain);
  });

  it("asks skillScriptFrom for each skill it used to reach for directly", () => {
    const out = throughSkillScript(BEAT, "beat.mjs");
    expect(out).not.toMatch(/\.\.\/skills\//);
    expect(out).toContain(
      `const { matchConvention } = await import(skillScriptFrom(import.meta.dirname, "palette", "scripts", "palette.mjs"));`,
    );
    expect(out).toContain(
      `const { renderStill, assertWithinFrame } = await import(skillScriptFrom(import.meta.dirname, "chart-beat", "scripts", "render-still.mjs"));`,
    );
    expect(readsThroughSkillScript(out)).toBe(true);
  });

  it("puts the resolver under the file's own last import, not above it", () => {
    const out = throughSkillScript(BEAT, "beat.mjs");
    expect(out.indexOf("skillScriptFrom")).toBeGreaterThan(
      out.indexOf(`import { BEAT } from "./bake.mjs";`),
    );
  });

  it("puts every rewritten import above the first use of what it imports", () => {
    const out = throughSkillScript(BEAT, "beat.mjs");
    for (const name of [
      "matchConvention",
      "renderStill",
      "assertWithinFrame",
    ]) {
      const declared = out.indexOf(
        "await import(skillScriptFrom",
        out.indexOf(`{ ${name}`),
      );
      const used = new RegExp(`\\b${name}\\b\\s*\\(`).exec(out)?.index ?? -1;
      expect(used).toBeGreaterThan(declared);
    }
  });

  it("refuses a file with nothing to anchor under, rather than writing a line that runs too late", () => {
    const orphan = `import { matchConvention } from "../../skills/palette/scripts/palette.mjs";\nmatchConvention();\n`;
    expect(() => throughSkillScript(orphan, "orphan.mjs")).toThrow(
      /reaches into skills\//,
    );
  });

  it("runs, from a beat with no root of its own and no skills/ above it", async () => {
    const home = mkdtempSync(join(tmpdir(), "splash-copied-beat-"));
    // An INSTALLED root: `shared/` reachable through `#shared/*`, and nothing else.
    writeFileSync(
      join(home, "package.json"),
      JSON.stringify({
        name: "stories",
        type: "module",
        imports: { "#shared/*": "./shared/*" },
      }),
    );
    symlinkSync(join(ROOT, "shared"), join(home, "shared"));
    // The skill, where the Engine puts it — outside the stories root entirely.
    const store = mkdtempSync(join(tmpdir(), "splash-skills-"));
    mkdirSync(join(store, "skills", "palette", "scripts"), { recursive: true });
    writeFileSync(
      join(store, "skills", "palette", "scripts", "palette.mjs"),
      `export const matchConvention = () => "ink";\n`,
    );

    const beat = join(home, "stories", "one", "beats", "map");
    mkdirSync(beat, { recursive: true });
    const source = `import { readFileSync } from "node:fs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";

export const ink = matchConvention(typeof readFileSync);
`;
    writeFileSync(
      join(beat, "beat.mjs"),
      throughSkillScript(source, "beat.mjs"),
    );

    const before = process.env.SPLASH_CHECKOUT_ROOT;
    process.env.SPLASH_CHECKOUT_ROOT = store;
    try {
      const { ink } = await import(join(beat, "beat.mjs"));
      expect(ink).toBe("ink");
    } finally {
      if (before === undefined) delete process.env.SPLASH_CHECKOUT_ROOT;
      else process.env.SPLASH_CHECKOUT_ROOT = before;
    }
  });
});
