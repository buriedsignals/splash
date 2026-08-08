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
import { existsSync } from "node:fs";
import { join } from "node:path";

const CANONICAL_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "twin-chart-beat",
  "scripts",
);
const VENDORED_DIR = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "shared",
  "twin-chart-beat",
);

describe("root-template/shared/twin-chart-beat — vendored copy stays byte-identical to the canonical scripts", () => {
  for (const name of ["render-still.mjs", "inspect-render.mjs"]) {
    it(`should match twin-chart-beat/scripts/${name} exactly`, async () => {
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
  "twin-chart-beat",
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

describe("craft skills — vendored render-still.mjs stays byte-identical to twin-chart-beat's canonical script", () => {
  for (const skill of ["twin-chart-web", "twin-chart-video", "twin-map-beat"]) {
    it(`should match twin-chart-beat/scripts/render-still.mjs exactly in ${skill}/scripts`, async () => {
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
// `checkTiming`) is canonical in `twin-chart-video/assets/timing.ts`. It travels two ways: whole,
// to `shared/twin-chart-video/timing.ts` for story files (which consume the root they live in);
// and as a physical copy of just the vocabulary — not the CO2 seed's own `CO2_TIMING` — to
// `twin-map-beat/assets/timing-contract.ts`, because a skill duplicates rather than reaching across
// another skill's boundary at runtime.
const TIMING_CANONICAL_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "twin-chart-video",
  "assets",
);

describe("shared/twin-chart-video/timing.ts — vendored copy stays byte-identical to the canonical timing module", () => {
  it("should match twin-chart-video/assets/timing.ts exactly", async () => {
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
        "twin-chart-video",
        "timing.ts",
      ),
      "utf8",
    );
    expect(vendored).toBe(canonical);
  });
});

describe("twin-map-beat/assets/timing-contract.ts — vendored copy stays byte-identical to the canonical timing vocabulary", () => {
  it("should match the vocabulary prefix of twin-chart-video/assets/timing.ts exactly (everything before the CO2 seed's own CO2_TIMING)", async () => {
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
        "twin-map-beat",
        "assets",
        "timing-contract.ts",
      ),
      "utf8",
    );
    expect(vendored).toBe(canonicalVocabulary);
  });
});
