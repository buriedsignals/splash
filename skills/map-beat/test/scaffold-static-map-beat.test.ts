import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * THE STATIC MAP SCAFFOLD WRITES THE PLUMBING ONLY, REFUSES TO OVERWRITE, AND THE FILES IT WRITES PARSE.
 *
 * `--generic` (the fully empty stub) must refuse to render with a NAMED SCAFFOLD error before it ever spawns
 * `bake.mjs` or reaches MapTiler. The DEFAULT path (no flag) adapts the type sheet's own worked example
 * instead — `proof/static-choropleth-europe-lowcarbon` is the only static map worked example whose runner
 * splits into sibling files (`beat.mjs`, `plate-cache.mjs`), so this suite also checks the sibling-file scan
 * against it directly.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SCRIPT = join(
  ROOT,
  "skills",
  "map-beat",
  "scripts",
  "scaffold-static-map-beat.mjs",
);
const STAMP = `${process.pid}-${Date.now().toString(36)}`;

const run = (args: string[]) =>
  spawnSync("bun", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });

function seedPalette(dir: string) {
  mkdirSync(dir, { recursive: true });
  Bun.write(
    join(dir, "PALETTE.md"),
    '---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n',
  );
}

/** Bun's own transpiler — syntax only, no import needs to resolve (so this stays fast, unlike a full
 *  `bun build`, which chases every transitive dependency puppeteer et al pull in). */
function assertParses(path: string) {
  const loader = path.endsWith(".tsx") ? "tsx" : "js";
  const source = readFileSync(path, "utf8");
  expect(() =>
    new Bun.Transpiler({ loader }).transformSync(source),
  ).not.toThrow();
}

describe("scaffold-static-map-beat --generic", () => {
  const name = `.scaffold-test-static-map-generic-${STAMP}`;
  const dir = join(ROOT, "proof", name);
  seedPalette(dir);

  it("should write plumbing that parses, and refuse to render with a named SCAFFOLD error before spawning bake.mjs or reaching MapTiler", () => {
    try {
      const result = run([
        "--type",
        "choropleth",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbe",
        "--generic",
      ]);
      expect(result.status).toBe(0);
      for (const f of [
        "render-directions.mjs",
        "DirectedScaffoldProbe.tsx",
        "bake.mjs",
        "BRIEF.md",
      ])
        expect(existsSync(join(dir, f))).toBe(true);
      const runnerText = readFileSync(
        join(dir, "render-directions.mjs"),
        "utf8",
      );
      expect(runnerText.includes("%%")).toBe(false);

      assertParses(join(dir, "render-directions.mjs"));
      assertParses(join(dir, "DirectedScaffoldProbe.tsx"));
      assertParses(join(dir, "bake.mjs"));

      const rendered = spawnSync("bun", [join(dir, "render-directions.mjs")], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(rendered.status).not.toBe(0);
      expect(rendered.stderr).toContain("SCAFFOLD");
      expect(rendered.stderr).not.toContain("no MapTiler key");
      expect(existsSync(join(dir, "plate"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("scaffold-static-map-beat (default --from)", () => {
  const name = `.scaffold-test-static-map-from-${STAMP}`;
  const dir = join(ROOT, "proof", name);
  seedPalette(dir);
  Bun.write(
    join(dir, "data.csv"),
    readFileSync(
      join(ROOT, "proof", "static-choropleth-europe-lowcarbon", "data.csv"),
    ),
  );
  Bun.write(
    join(dir, "shapes.geojson"),
    readFileSync(
      join(
        ROOT,
        "proof",
        "static-choropleth-europe-lowcarbon",
        "shapes.geojson",
      ),
    ),
  );

  it("should adapt choropleth's own worked example, copy its beat.mjs/plate-cache.mjs siblings, mark subject-specific regions SCAFFOLD, rewrite the composed-direction default, and write files that parse", () => {
    try {
      const result = run([
        "--type",
        "choropleth",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbeFrom",
      ]);
      expect(result.status).toBe(0);
      for (const f of [
        "render-directions.mjs",
        "DirectedScaffoldProbeFrom.tsx",
        "bake.mjs",
        "beat.mjs",
        "plate-cache.mjs",
        "BRIEF.md",
      ]) {
        expect(result.stdout).toContain(f);
        expect(existsSync(join(dir, f))).toBe(true);
      }

      const runner = readFileSync(join(dir, "render-directions.mjs"), "utf8");
      expect(runner).toContain(
        "SCAFFOLD: scaffolded --from proof/static-choropleth-europe-lowcarbon",
      );
      expect(runner).toContain('const FILED = RUN_ARGS.includes("--filed");');
      expect(runner).toContain("#shared/design-base/index.mjs");
      expect(runner).not.toMatch(/readdirSync\(DIRECTIONS\)/);

      const beatMjs = readFileSync(join(dir, "beat.mjs"), "utf8");
      expect(beatMjs).toContain(
        "SCAFFOLD: scaffolded --from proof/static-choropleth-europe-lowcarbon",
      );

      assertParses(join(dir, "render-directions.mjs"));
      assertParses(join(dir, "DirectedScaffoldProbeFrom.tsx"));
      assertParses(join(dir, "bake.mjs"));
      assertParses(join(dir, "beat.mjs"));
      assertParses(join(dir, "plate-cache.mjs"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("should refuse before writing anything when the frozen geometry is missing", () => {
    const dir2 = join(
      ROOT,
      "proof",
      `.scaffold-test-static-map-missing-geo-${STAMP}`,
    );
    seedPalette(dir2);
    Bun.write(
      join(dir2, "data.csv"),
      readFileSync(
        join(ROOT, "proof", "static-choropleth-europe-lowcarbon", "data.csv"),
      ),
    );
    try {
      const result = run([
        "--type",
        "choropleth",
        "--beat",
        `proof/.scaffold-test-static-map-missing-geo-${STAMP}`,
        "--component",
        "ScaffoldProbeMissing",
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("shapes.geojson");
      expect(existsSync(join(dir2, "render-directions.mjs"))).toBe(false);
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });
});
