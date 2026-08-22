// The root template vendors the craft mechanism (render-still.mjs, inspect-render.mjs) so a
// fresh Splash root is self-contained after install — see PROOF.md §1 and TRIAL-THREE-BEATS.md
// §4 ("the toolkit is not portable"). Vendoring means a physical copy, not a symlink (a symlink
// into this repository would break the moment the root template is copied anywhere else) or a
// workspace dependency (which would require the journalist's root to be a member of this
// repository's workspace, i.e. to have this repository checked out at all — exactly what the
// gap is about). A physical copy can drift silently from the skill's own canonical scripts if
// one is edited and the other is not. This test is the guard against that: it does not care what
// the content IS, only that the two copies AGREE.
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CANONICAL_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "chart-beat",
  "scripts",
);
const VENDORED_DIR = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "shared",
  "chart-beat",
);

describe("root-template/shared/chart-beat — vendored copy stays byte-identical to the canonical scripts", () => {
  for (const name of ["render-still.mjs", "inspect-render.mjs"]) {
    it(`should match chart-beat/scripts/${name} exactly`, async () => {
      const canonical = await readFile(join(CANONICAL_DIR, name), "utf8");
      const vendored = await readFile(join(VENDORED_DIR, name), "utf8");
      expect(vendored).toBe(canonical);
    });
  }
});

const LIVE_SHARED = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "shared",
  "chart-beat",
);

describe("twin/shared — the repository's own live shared/, so proof stories import the way a real beat does", () => {
  for (const name of ["render-still.mjs", "inspect-render.mjs"]) {
    it(`should carry ${name}, byte-identical to the canonical script`, async () => {
      expect(existsSync(join(LIVE_SHARED, name))).toBe(true);
      const canonical = await readFile(join(CANONICAL_DIR, name), "utf8");
      const live = await readFile(join(LIVE_SHARED, name), "utf8");
      expect(live).toBe(canonical);
    });
  }

  it("should be reachable through the #shared specifier declared in package.json", async () => {
    const pkg = JSON.parse(
      await readFile(
        join(import.meta.dirname, "..", "..", "..", "package.json"),
        "utf8",
      ),
    );
    expect(pkg.imports?.["#shared/*"]).toBe("./shared/*");
  });
});

// Task 8 vendors `render-still.mjs` a second way: a physical copy inside each craft skill's OWN
// `scripts/`, alongside the root-template and shared/ copies already guarded above. Skills never
// import each other at runtime (`no-cross-skill-imports.test.ts`), so a skill that needs
// `deriveFurniture`/`measureText` carries its own copy — guarded here for the same reason as
// every other copy on this page: a physical copy that can drift silently is worse than the import
// it replaced.
const CANONICAL_RENDER_STILL = join(CANONICAL_DIR, "render-still.mjs");

describe("craft skills — vendored render-still.mjs stays byte-identical to chart-beat's canonical script", () => {
  for (const skill of ["chart-web", "chart-video", "map-beat"]) {
    it(`should match chart-beat/scripts/render-still.mjs exactly in ${skill}/scripts`, async () => {
      const canonical = await readFile(CANONICAL_RENDER_STILL, "utf8");
      const vendored = await readFile(
        join(
          import.meta.dirname,
          "..",
          "..",
          skill,
          "scripts",
          "render-still.mjs",
        ),
        "utf8",
      );
      expect(vendored).toBe(canonical);
    });
  }
});

// The motion grammar's timing vocabulary (`TimingEvent`/`BeatTiming`/`endOf`/`progressOf`/
// `checkTiming`) is canonical in `chart-video/assets/timing.ts`. It travels two ways: whole,
// to `shared/chart-video/timing.ts` for story files (which consume the root they live in);
// and as a physical copy of just the vocabulary — not the CO2 seed's own `CO2_TIMING` — to
// `map-beat/assets/timing-contract.ts`, because a skill duplicates rather than reaching across
// another skill's boundary at runtime.
const TIMING_CANONICAL_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "chart-video",
  "assets",
);

describe("shared/chart-video/timing.ts — vendored copy stays byte-identical to the canonical timing module", () => {
  it("should match chart-video/assets/timing.ts exactly", async () => {
    const canonical = await readFile(
      join(TIMING_CANONICAL_DIR, "timing.ts"),
      "utf8",
    );
    const vendored = await readFile(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "shared",
        "chart-video",
        "timing.ts",
      ),
      "utf8",
    );
    expect(vendored).toBe(canonical);
  });
});

describe("map-beat/assets/timing-contract.ts — vendored copy stays byte-identical to the canonical timing vocabulary", () => {
  it("should match the vocabulary prefix of chart-video/assets/timing.ts exactly (everything before the CO2 seed's own CO2_TIMING)", async () => {
    const canonical = await readFile(
      join(TIMING_CANONICAL_DIR, "timing.ts"),
      "utf8",
    );
    const seedMarker = "\n/**\n * This story's timing.";
    const splitAt = canonical.indexOf(seedMarker);
    expect(splitAt).toBeGreaterThan(0);
    const canonicalVocabulary = canonical.slice(0, splitAt);
    const vendored = await readFile(
      join(
        import.meta.dirname,
        "..",
        "..",
        "map-beat",
        "assets",
        "timing-contract.ts",
      ),
      "utf8",
    );
    expect(vendored).toBe(canonicalVocabulary);
  });
});

// FINDING 21 (stress round four): `shared/` held `chart-beat/` and `chart-video/` only, so every
// web beat in the tree imported four levels up into `skills/chart-web/scripts/` — a path no
// installed Splash root has, since `skills/` is not copied into one. It was not hypothetical:
// `stories/heat-pump-adoption-across-europe`'s own runner still named
// `/Users/<author>/.agents/skills/chart-web/scripts/render-web.mjs`, an absolute path into
// another machine's home directory, and died on every run.
//
// `shared/chart-web/` is NOT flat, unlike `shared/chart-beat/`, and that is the whole reason this
// copy did not exist before: `render-web.mjs` resolves siblings at RENDER time — it reads
// `../assets/interaction.mjs` off disk and imports `../assets/filter.ts` and
// `../assets/ChartWebSeed.tsx` — so a flat copy would resolve them to nothing. The copy mirrors
// the skill's own `scripts/` + `assets/` layout instead, which makes every one of those paths
// resolve inside the copy. `PALETTE.md` and `TYPEFACE.md` come with it because the seed reads them
// at module load, walking up from `assets/` and stopping at the copy's own root.
const CHART_WEB_DIR = join(import.meta.dirname, "..", "..", "chart-web");
const SHARED_CHART_WEB = join(import.meta.dirname, "..", "..", "..", "shared", "chart-web");

describe("twin/shared/chart-web — the vendored web format, so a story imports the way an installed root would", () => {
  for (const relative of [
    "scripts/render-web.mjs",
    "scripts/render-still.mjs",
    // Added round six. `stress-z-budget-parts`'s web beat imported
    // `../../../../skills/chart-web/scripts/storyboard-gate.mjs` — four levels up, into a skill —
    // for the same reason every beat did before this directory existed: the thing it needed was
    // not here. A beat reaches into `skills/` when vendoring is incomplete, so the offender list
    // this file keeps is really a list of files that still owe a copy.
    "scripts/storyboard-gate.mjs",
    "assets/ChartWebSeed.tsx",
    "assets/entrance.ts",
    "assets/filter.ts",
    "assets/interaction.mjs",
    "assets/sample-data/rainfall.json",
    "PALETTE.md",
    "TYPEFACE.md",
  ]) {
    it(`should carry ${relative}, byte-identical to chart-web's own`, async () => {
      const parts = relative.split("/");
      expect(existsSync(join(SHARED_CHART_WEB, ...parts))).toBe(true);
      const canonical = await readFile(join(CHART_WEB_DIR, ...parts), "utf8");
      const vendored = await readFile(join(SHARED_CHART_WEB, ...parts), "utf8");
      expect(vendored).toBe(canonical);
    });
  }

  // A copy that cannot be LOADED is not a copy of anything. `render-web.mjs` reads `PALETTE.md`
  // and builds its seed at module scope, so importing it is a real exercise of every sibling path
  // the vendoring had to keep working — the check that would have caught a flat copy.
  it("should import and export renderWeb, with every sibling path resolving inside the copy", async () => {
    const module = await import(join(SHARED_CHART_WEB, "scripts", "render-web.mjs"));
    expect(typeof module.renderWeb).toBe("function");
  });

  it("should be what every web beat in the tree imports — no runner reaches up into skills/", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        // The IMPORT SPECIFIER, not the file's text: a runner's own header may legitimately name
        // the canonical script it is a vendored copy of, and a substring check cannot tell that
        // apart from the import this refuses.
        else if (name.endsWith(".mjs") && /from ["'][^"']*skills\/chart-web\/scripts\//.test(readFileSync(path, "utf8")))
          offenders.push(path);
      }
    };
    for (const area of ["proof", "stories"])
      walk(join(import.meta.dirname, "..", "..", "..", area));
    expect(offenders).toEqual([]);
  });
});
