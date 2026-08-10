/**
 * ONE KEY, ONE HOME — the guard for a defect that could not show itself in this checkout.
 *
 * `recordKey({root})` writes a journalist's key to `<root>/.env`. The map producers used to read
 * theirs from `new URL("../../../.env", import.meta.url)` — a fixed three-level climb, which in
 * this development checkout lands on `twin/.env`, the very same file. So in the only place anyone
 * ever ran it, the two agreed, and the defect was invisible.
 *
 * Anywhere else they do not agree, and the failure mode is the bad one. Both Bun and Node resolve a
 * symlink BEFORE computing `import.meta.url`, so installing the skills as a symlink into a host's
 * skills directory does not repair the climb — it makes the producer read the DEVELOPER's `.env`
 * while the journalist's own key sits unread in their own root. A newsroom would see maps that
 * work on the machine that built them and fail on theirs, with a key they can prove is present.
 *
 * WHAT THIS FILE ASSERTS, and the mutation that reddens each (all run in a copy outside the tree):
 *
 *   1. Every vendored copy of `splash-root.mjs` is byte-identical to the canonical one.
 *      MUTATION: change one character in `twin-map-web/scripts/splash-root.mjs`.
 *
 *   2. Every copy, called from a skill script's own directory inside a SYNTHETIC root, names the
 *      same `.env` that `recordKey` actually writes — proved by calling `recordKey` and reading the
 *      file back through the path the producer resolved, rather than by comparing two strings.
 *      MUTATION: make `splashRoot` return `dirname(dirname(dirname(startDir)))` unconditionally.
 *
 *   3. No script anywhere under `skills/` reaches a `.env` by a fixed climb again. This is the
 *      shape that created the two homes; it is cheap to reintroduce and it reads as ordinary.
 *      MUTATION: put `../../../.env` back in `twin-map-beat/scripts/bake-plate.mjs`.
 *
 * WHAT IT DOES NOT CLOSE, named rather than left to be discovered:
 *
 *   - `twin-scrolly/scripts/bake-plate.mjs` resolves its `.env` as `join(process.cwd(), ".env")` —
 *     a THIRD convention, and one that depends on where the session happens to be standing. It is
 *     excluded from rule 3 below (which only bans the fixed climb) and is left alone deliberately:
 *     that file is being edited by another agent in this worktree as this lands. It needs the same
 *     treatment and it is reported, not silently patched around.
 *   - Whether the `.env` a producer finds actually CONTAINS the key. That is preflight's question.
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
import { recordKey } from "../scripts/keys.mjs";

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

describe("a producer's .env and recordKey's .env are the same file", () => {
  it("should resolve, from every copy, to the file recordKey actually writes", async () => {
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

      // The claim is not that two strings match — it is that a key the journalist gives us lands
      // where the producer will look. So write one, then read it back through the resolved path.
      await recordKey({ root, name: "MAPTILER_KEY", value: "one-home-probe" });
      const { splashEnvPath } = await import(
        `${join(root, "skills", "twin-map-beat", "scripts", "splash-root.mjs")}?readback=1`
      );
      expect(
        await readFile(
          splashEnvPath(join(root, "skills", "twin-map-beat", "scripts")),
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

  it("should accept MAPTILER_DELIVERY_KEY, the key ruling R1b requires", async () => {
    const lab = await mkdtemp(join(tmpdir(), "splash-deliverykey-"));
    try {
      await recordKey({
        root: lab,
        name: "MAPTILER_DELIVERY_KEY",
        value: "restricted-key",
      });
      expect(await readFile(join(lab, ".env"), "utf8")).toContain(
        "MAPTILER_DELIVERY_KEY=restricted-key",
      );
    } finally {
      await rm(lab, { recursive: true, force: true });
    }
  });
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
