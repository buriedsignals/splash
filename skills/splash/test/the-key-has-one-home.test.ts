/**
 * LEGACY ENV ROOT — read-only compatibility for copied roots.
 *
 * Managed Engine operations hydrate scoped credentials and never load a checkout `.env`. Explicit
 * legacy map runs still resolve `<root>/.env`; this guard keeps every vendored root helper identical,
 * verifies flat and namespaced skill layouts resolve the same root, and prevents the former fixed
 * `../../../.env` climb from returning.
 */
import { describe, it, expect } from "bun:test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const SPLASH_TWIN = join(import.meta.dirname, "..");
const SKILLS = join(SPLASH_TWIN, "..");
const CANONICAL = join(SPLASH_TWIN, "scripts", "splash-root.mjs");

/** Every `splash-root.mjs` in the tree, canonical first — walked, never listed. */
async function copies(): Promise<string[]> {
  const found: string[] = [];
  for (const skill of await readdir(SKILLS)) {
    const p = join(SKILLS, skill, "scripts", "splash-root.mjs");
    try {
      await readFile(p, "utf8");
      found.push(p);
    } catch {
      /* this skill does not need one */
    }
  }
  return found.sort();
}

describe("splash-root.mjs — the duplicated copies stay in step", () => {
  it("should be byte-identical everywhere it is vendored", async () => {
    const canonical = await readFile(CANONICAL, "utf8");
    const all = await copies();
    expect(all.length).toBeGreaterThan(1); // it is actually duplicated, not just present once
    for (const path of all) {
      expect(`${relative(SKILLS, path)}: ${await readFile(path, "utf8")}`).toBe(
        `${relative(SKILLS, path)}: ${canonical}`,
      );
    }
  });
});

describe("a legacy producer resolves the Splash root .env", () => {
  it("should resolve the same root file from every vendored copy", async () => {
    const lab = await mkdtemp(join(tmpdir(), "splash-onehome-"));
    try {
      // A synthetic Splash root: it carries the manifest that makes it a root, and the skills sit
      // inside it.
      //
      // THE FIXTURE IS TESTED AT TWO DEPTHS, and the reason is worth reading before changing it.
      // The first draft placed every script at `<root>/skills/<skill>/scripts/` and asserted the
      // resolved path — and the mutation "make splashRoot a fixed three-level climb again" did NOT
      // redden it. Of course it did not: in that layout the climb and the search give the same
      // answer, which is precisely why the original defect could live in the checkout unnoticed.
      // A fixture that cannot separate the two things is not testing the thing it is named after.
      //
      // So the second depth is the PRODUCT-NAMESPACE layout, and it is not hypothetical — it is
      // what the placement contract this installer follows actually prescribes
      // (`~/.agents/skills/<product>/<id>`). One directory deeper, a three-level climb lands on
      // `<root>/skills` and the search still lands on `<root>`.
      const root = join(lab, "Splash");
      await mkdir(root, { recursive: true });
      await writeFile(
        join(root, "package.json"),
        JSON.stringify({
          name: "splash-root",
          imports: { "#shared/*": "./shared/*" },
        }),
      );
      // A decoy: an ancestor that is NOT a Splash root must not be mistaken for one.
      await writeFile(
        join(lab, "package.json"),
        JSON.stringify({ name: "not-a-splash-root" }),
      );

      const LAYOUTS = [
        { id: "flat", segments: ["skills"] }, // <root>/skills/<skill>/scripts
        { id: "namespaced", segments: ["skills", "splash"] }, // <root>/skills/splash/<skill>/scripts
      ];

      const all = await copies();
      for (const source of all) {
        const skill = relative(SKILLS, source).split("/")[0];
        for (const layout of LAYOUTS) {
          const scriptsDir = join(root, ...layout.segments, skill, "scripts");
          await mkdir(scriptsDir, { recursive: true });
          await writeFile(
            join(scriptsDir, "splash-root.mjs"),
            await readFile(source, "utf8"),
          );

          const { splashEnvPath } = await import(
            `${join(scriptsDir, "splash-root.mjs")}?copy=${skill}-${layout.id}`
          );
          expect(`${skill}/${layout.id}: ${splashEnvPath(scriptsDir)}`).toBe(
            `${skill}/${layout.id}: ${join(root, ".env")}`,
          );
        }
      }

      // Confirm the resolved path is not merely the right string: a direct legacy file is readable
      // through the producer's own helper.
      await writeFile(join(root, ".env"), "MAPTILER_KEY=one-home-probe\n", { mode: 0o600 });
      const { splashEnvPath } = await import(
        `${join(root, "skills", "map-beat", "scripts", "splash-root.mjs")}?readback=1`
      );
      expect(
        await readFile(
          splashEnvPath(join(root, "skills", "map-beat", "scripts")),
          "utf8",
        ),
      ).toContain("MAPTILER_KEY=one-home-probe");
    } finally {
      await rm(lab, { recursive: true, force: true });
    }
  }, 30_000);

  it("should throw, naming where it looked, when there is no Splash root above the script", async () => {
    // The safety property a fixed climb cannot have. `../../../.env` ALWAYS returns a path, so a
    // producer standing outside any root reported "no MAPTILER_KEY in <path>" and sent its reader
    // hunting for a missing key when what was missing was the root. Reported, never designed
    // around — this project's standing rule, applied to a path instead of a capability.
    const lab = await mkdtemp(join(tmpdir(), "splash-noroot-"));
    try {
      const scriptsDir = join(lab, "elsewhere", "scripts");
      await mkdir(scriptsDir, { recursive: true });
      await writeFile(
        join(scriptsDir, "splash-root.mjs"),
        await readFile(CANONICAL, "utf8"),
      );
      const { splashRoot } = await import(
        `${join(scriptsDir, "splash-root.mjs")}?noroot=1`
      );
      expect(() => splashRoot(scriptsDir)).toThrow(/no Splash root above/);
    } finally {
      await rm(lab, { recursive: true, force: true });
    }
  }, 30_000);

});

/** `src` with line and block comments removed; string literals are preserved untouched. */
function stripComments(src: string): string {
  let out = "";
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        i++;
      }
      out += quote;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

describe("no script reaches a .env by a fixed climb", () => {
  it("should find no hard-coded ../.env ancestry anywhere under skills/", async () => {
    const offenders: string[] = [];
    const walk = async (dir: string) => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === "test") continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          await walk(p);
          continue;
        }
        if (!/\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/.test(e.name)) continue;
        // COMMENTS ARE STRIPPED FIRST, and that is not a convenience. The ban is on what the code
        // DOES, and the files that carry it also carry the paragraphs explaining why the shape was
        // removed — which quote `../../../.env` verbatim, as they should. A scan over raw text
        // reported those explanations as ten violations, i.e. it forbade documenting the rule it
        // enforces. That is the failure mode where a guard makes the codebase worse.
        const src = stripComments(await readFile(p, "utf8"));
        // Only the CLIMB is banned. `join(root, ".env")` and `splashEnvPath(...)` are the two
        // legitimate shapes, and the match requires a quoted literal so a path built at runtime
        // from parts is not mistaken for one.
        for (const m of src.matchAll(/["'`]((?:\.\.\/)+)\.env["'`]/g)) {
          offenders.push(`${relative(SKILLS, p)} → "${m[1]}.env"`);
        }
      }
    };
    await walk(SKILLS);
    expect(offenders.sort()).toEqual([]);
  });
});
