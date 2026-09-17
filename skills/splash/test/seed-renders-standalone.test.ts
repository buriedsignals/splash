/**
 * THE PREMISE, TESTED: copy a skill directory on its own into a journalist's root and its seed still
 * renders.
 *
 * Every craft skill's SKILL.md claims this and the plan's own verification table asserted it ("the
 * seed renders from `sample-data` alone, with no story file present"). Nothing tested it. It was
 * FALSE for `chart-video`, whose seed imported its geometry from `proof/co2-suisse/`, and for
 * `chart-web`, whose renderer imported the CO₂ story's component — neither of which any copy of
 * those skills would carry with it. Both were caught by review, not by the suite.
 *
 * Two checks, cheapest first:
 *
 * 1. NO SPECIFIER UNDER `assets/` OR `scripts/` RESOLVES INTO `proof/`. A named-family check, kept
 *    even though `no-cross-skill-imports.test.ts` now covers the whole boundary: this one states the
 *    specific failure that happened, so a reader of a red build sees the story-workspace import named
 *    rather than inferring it from a general rule.
 *
 * 2. THE SEED ACTUALLY RENDERS IN ISOLATION. The skill directory is copied into a fresh temporary
 *    root that contains nothing else — no `proof/`, no `shared/`, no sibling skill, no repository —
 *    and its own `scripts/render-preview.mjs` is run there. The result must be byte-identical to the
 *    `assets/preview.png` this repository ships, which makes this a stronger claim than "it exits 0":
 *    the isolated copy draws THE SAME PICTURE, so nothing it needed was silently supplied from
 *    outside the directory.
 *
 * What the temporary root does carry, and why neither weakens the claim:
 *   - `node_modules`, symlinked. A skill's own `SKILL.md` declares its npm dependencies; a
 *     journalist's root installs them. This test is about files this repository owns, not about
 *     whether `react` is on disk.
 *   - `.env`, symlinked when the repository has one. `map-beat`'s preview bakes its basemap
 *     plate through a MapTiler key on a cold cache — a machine dependency this skill already has in
 *     its own `test/canon.test.ts`, carried here unchanged rather than newly introduced.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = resolve(SKILLS, "..");
const PROOF = join(TWIN, "proof");

/**
 * SHIPS A SEED, AND IS THEREFORE MAKING THE CLAIM — discovered, not listed.
 *
 * This was a fixed array of the four ORIGINAL craft skills, and it stayed four while the tree grew
 * to seven. `map-web/test/standalone.test.ts` says so in its own header: it exists because "its own
 * `CRAFT` list is a fixed array in a file this skill may not touch". Nobody wrote that second copy
 * for `image-beat` or `scrolly`, so two skills claimed in their `SKILL.md` that their seed renders
 * alone and nothing anywhere tested it — and `image-beat`'s committed `assets/preview.png` was five
 * weeks stale when this was measured, which is exactly what this file would have caught.
 *
 * The population is now the tree's own answer to the question the file asks, keyed the same way
 * `canon-shape.test.ts` keys its own discovery: a skill that carries `scripts/render-preview.mjs`
 * renders its own seed and is therefore making this claim. Keyed on the SCRIPT rather than on the
 * preview, for the reason that file already gives — a skill that loses its `preview.png` must stay
 * in the population and fail here, not drop out of it silently. `dw-beat` ships no seed (it
 * delegates every render to Datawrapper) and is correctly outside. A new craft skill joins by
 * existing.
 */
function shipsASeed(): string[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((skill) =>
      existsSync(join(SKILLS, skill, "scripts", "render-preview.mjs")),
    )
    .sort();
}

/**
 * `map-web` is proven by `skills/map-web/test/standalone.test.ts` instead of here, and that is a
 * DIFFERENT PROOF rather than a pass: its preview is compared tolerantly, by decoded pixel, because
 * two Chrome launches of that page are not reliably byte-identical. Running it here as well would
 * assert byte-parity this project has already decided it cannot hold — so it is checked there and
 * named here, and the census below still reddens if it ever stops being checked at all.
 */
const PROVEN_ELSEWHERE = new Map([
  ["map-web", join(SKILLS, "map-web", "test", "standalone.test.ts")],
]);

const SEEDED = shipsASeed();
const CRAFT = SEEDED.filter((skill) => !PROVEN_ELSEWHERE.has(skill));

// A remotion still (chart-video) and a plate-backed map render (map-beat) both run real
// renderers here, and the map's bake path is minutes on a cold cache.
setDefaultTimeout(300000);

describe("every craft skill that ships a seed is proven by somebody", () => {
  // ANTI-VACUITY. A walk that finds nothing passes every assertion below it, and a walk that finds
  // four out of seven passes them too while three skills go unchecked — which is the state this
  // file was in. The floor is the number of craft skills that ship a seed today, read off the same
  // tree `seed-reads-a-recorded-palette.test.ts` reads: seven, on 2026-09-17.
  it("should discover every skill that ships a seed, not a remembered subset", () => {
    expect(SEEDED.length).toBeGreaterThanOrEqual(7);
    for (const skill of SEEDED)
      expect([skill, existsSync(join(SKILLS, skill, "SKILL.md"))]).toEqual([
        skill,
        true,
      ]);
  });

  // A skill excused from the loop below must be proven somewhere that still exists. Deleting
  // `map-web/test/standalone.test.ts` reddens here rather than silently removing a skill from the
  // census — an excuse that points at nothing is the exemption this guard refuses to become.
  it("should have a live proof on file for every skill it excuses", () => {
    for (const [skill, proof] of PROVEN_ELSEWHERE) {
      expect([skill, SEEDED.includes(skill)]).toEqual([skill, true]);
      expect([skill, existsSync(proof)]).toEqual([skill, true]);
    }
    expect(CRAFT.length).toBe(SEEDED.length - PROVEN_ELSEWHERE.size);
  });
});

/** Every string literal in `src`, comments removed first — the same single-pass scanner
 *  `no-cross-skill-imports.test.ts` carries, duplicated rather than imported because that is this
 *  project's own rule for anything a copied directory would otherwise have to reach out for. */
function stringLiterals(src: string): string[] {
  const literals: string[] = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      i += 2;
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
      let j = i + 1;
      let value = "";
      while (j < n && src[j] !== quote) {
        if (src[j] === "\\") {
          value += src[j] + (src[j + 1] ?? "");
          j += 2;
          continue;
        }
        value += src[j];
        j++;
      }
      literals.push(value);
      i = j + 1;
      continue;
    }
    i++;
  }
  return literals;
}

function* sourceFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(mjs|mts|cjs|cts|ts|tsx|js|jsx)$/.test(e.name)) yield p;
  }
}

describe("a craft skill never reaches into a story workspace", () => {
  for (const skill of CRAFT) {
    it(`${skill} should have no specifier under assets/ or scripts/ that lands in proof/`, () => {
      const offenders: string[] = [];
      for (const sub of ["assets", "scripts"]) {
        for (const file of sourceFiles(join(SKILLS, skill, sub))) {
          for (const literal of stringLiterals(readFileSync(file, "utf8"))) {
            if (/\s/.test(literal)) continue;
            if (!literal.startsWith(".") && !literal.startsWith("/")) continue;
            const resolved = resolve(dirname(file), literal);
            if (resolved === PROOF || resolved.startsWith(PROOF + sep))
              offenders.push(`${file} → ${literal}`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});

describe("a craft skill's seed renders from its own sample-data, alone", () => {
  for (const skill of CRAFT) {
    it(`${skill} should render the same preview with nothing but itself on disk`, () => {
      const root = mkdtempSync(join(tmpdir(), "twin-seed-alone-"));
      try {
        // The only things beside the skill: the installed packages and the environment. No
        // `proof/`, no `shared/`, no sibling skill, no repository.
        symlinkSync(join(TWIN, "node_modules"), join(root, "node_modules"));
        if (existsSync(join(TWIN, ".env")))
          symlinkSync(join(TWIN, ".env"), join(root, ".env"));
        mkdirSync(join(root, "skills"));
        const copy = join(root, "skills", skill);
        // Same depth as in this repository, because a skill's own scripts compute their package
        // root relatively (`resolve(HERE, "../../..")`) — a shallower sandbox would test a layout
        // no journalist has.
        cpSync(join(SKILLS, skill), copy, { recursive: true });
        expect(existsSync(join(root, "proof"))).toBe(false);
        expect(existsSync(join(root, "shared"))).toBe(false);
        expect(readdirSync(join(root, "skills"))).toEqual([skill]);

        const out = join(root, "out");
        const run = Bun.spawnSync(
          ["bun", "scripts/render-preview.mjs", "--out", out],
          { cwd: copy },
        );
        const detail = new TextDecoder().decode(run.stderr).slice(-2000);
        expect(`${skill} exit ${run.exitCode}\n${detail}`).toContain(
          `${skill} exit 0`,
        );

        const rendered = readFileSync(join(out, "preview.png"));
        expect(statSync(join(out, "preview.png")).size).toBeGreaterThan(0);
        expect(
          rendered.equals(
            readFileSync(join(SKILLS, skill, "assets", "preview.png")),
          ),
        ).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});
