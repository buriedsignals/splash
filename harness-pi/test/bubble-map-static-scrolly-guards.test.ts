import { afterAll, describe, expect, it } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// The web and video bubble-map kits refuse a dropped fuel, a country left out unsaid and a wrong "one circle per"
// (2026-11-14); the default static (.gestures) and the scrolly kit drew the same mistakes without a word.

const HARNESS = resolve(import.meta.dirname, "..");
const SHARED = join(HARNESS, "craft", "_shared");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
// A 12B scrolly run that rendered: its data.json is the whole WRI table, its beat.mjs a working scrolly beat.
const KEPT = join(
  homedir(),
  ".splash-harness",
  "kept-runs",
  "gx-proportional-symbol-symbol-bubble-map-scrolly-seeded-osaurus-1794606535645",
);
const dir = join(BENCH, "stories", `zz-bubble-guards-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function render(format: "static" | "scrolly", kit: string, beat: string) {
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  for (const f of ["PALETTE.md", "DIRECTION.md"])
    cpSync(join(KEPT, f), join(dir, f));
  writeFileSync(
    join(dir, "STORYBOARD.md"),
    readFileSync(join(KEPT, "STORYBOARD.md"), "utf8").replace(
      /format: scrolly/g,
      `format: ${format}`,
    ),
  );
  for (const f of readdirSync(SHARED))
    cpSync(join(SHARED, f), join(at, f), { recursive: true });
  for (const f of readdirSync(kit))
    cpSync(join(kit, f), join(at, f), { recursive: true });
  cpSync(join(KEPT, "beats", "1", "data.json"), join(at, "data.json"));
  writeFileSync(join(at, "beat.mjs"), beat);
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], {
    cwd: BENCH,
    stdout: "pipe",
    stderr: "pipe",
  });
  return `${run.stdout}${run.stderr}`;
}

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(KEPT))(
  "the bubble-map static and scrolly kits",
  () => {
    it("should refuse a scrolly whose sites leave out every Biomass row unsaid", () => {
      const kept = readFileSync(join(KEPT, "beats", "1", "beat.mjs"), "utf8");
      const beat = kept.replace(
        "const sites = table.rows.map(",
        'const sites = table.rows.filter((r) => r[FUEL] !== "Biomass").map(',
      );
      expect(beat).not.toBe(kept);
      expect(
        render(
          "scrolly",
          join(
            HARNESS,
            "craft",
            "scrolly",
            "proportional-symbol-symbol-bubble-map",
          ),
          beat,
        ),
      ).toMatch(/leave out every fuel "Biomass" row/);
    }, 120_000);

    it("should refuse a static plate whose where leaves countries out unsaid", () => {
      const beat = `// the rows are data.json's, read by the worked example\nimport example from "./beat.example.mjs";\nexport default { ...example, title: [example.title].flat().slice(0, 1), name: "country", where: { fuel: "Nuclear" } };\n`;
      expect(
        render(
          "static",
          join(
            HARNESS,
            "craft",
            "static",
            "proportional-symbol-symbol-bubble-map.gestures",
          ),
          beat,
        ),
      ).toMatch(
        /symbols leave out \d+ of data\.json's \d+ places without a word on the plate/,
      );
    }, 120_000);
    // Without a key both kits stop at the basemap, after every guard: reaching it is passing them.
    it("should let the kept scrolly beat through to the basemap", () => {
      const out = render("scrolly", join(HARNESS, "craft", "scrolly", "proportional-symbol-symbol-bubble-map"), readFileSync(join(KEPT, "beats", "1", "beat.mjs"), "utf8"));
      expect(out).toMatch(/MAPTILER_KEY/);
    }, 120_000);

    it("should let the worked example's static plate through to the basemap", () => {
      const beat = `// the rows are data.json's, read by the worked example\nimport example from "./beat.example.mjs";\nexport default { ...example, title: [example.title].flat().slice(0, 1), name: "country" };\n`;
      const out = render("static", join(HARNESS, "craft", "static", "proportional-symbol-symbol-bubble-map.gestures"), beat);
      expect(out).toMatch(/MAPTILER_KEY/);
    }, 120_000);
  },
);
