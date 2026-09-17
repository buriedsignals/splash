import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * THE STATIC CHART SCAFFOLD WRITES THE PLUMBING ONLY, REFUSES TO OVERWRITE, AND THE FILES IT WRITES PARSE.
 *
 * `--generic` (the fully empty stub) must refuse to render with a NAMED SCAFFOLD error before it ever asks
 * `renderStill` to draw anything. The DEFAULT path (no flag) adapts the type sheet's own worked example
 * instead — read from THIS repo's own real `proof/static-heatmap-europe-electricity`, so the test is
 * exercising the real worked-example code, not a fixture.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SCRIPT = join(
  ROOT,
  "skills",
  "chart-beat",
  "scripts",
  "scaffold-static-beat.mjs",
);
const STAMP = `${process.pid}-${Date.now().toString(36)}`;

const run = (args: string[], cwd = ROOT) =>
  spawnSync("bun", [SCRIPT, ...args], { cwd, encoding: "utf8" });

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

describe("scaffold-static-beat --generic", () => {
  const name = `.scaffold-test-static-generic-${STAMP}`;
  const dir = join(ROOT, "proof", name);
  seedPalette(dir);

  it("should write plumbing that parses, and refuse to render with a named SCAFFOLD error before drawing anything", () => {
    try {
      const result = run([
        "--type",
        "heatmap",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbe",
        "--generic",
      ]);
      expect(result.status).toBe(0);
      expect(existsSync(join(dir, "render-directions.mjs"))).toBe(true);
      expect(existsSync(join(dir, "DirectedScaffoldProbe.tsx"))).toBe(true);
      const runnerText = readFileSync(
        join(dir, "render-directions.mjs"),
        "utf8",
      );
      expect(runnerText.includes("%%")).toBe(false);

      assertParses(join(dir, "render-directions.mjs"));
      assertParses(join(dir, "DirectedScaffoldProbe.tsx"));

      const rendered = spawnSync("bun", [join(dir, "render-directions.mjs")], {
        cwd: ROOT,
        encoding: "utf8",
      });
      expect(rendered.status).not.toBe(0);
      expect(rendered.stderr).toContain("SCAFFOLD");
      expect(existsSync(join(dir, "renders"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("scaffold-static-beat (default --from)", () => {
  const name = `.scaffold-test-static-from-${STAMP}`;
  const dir = join(ROOT, "proof", name);
  seedPalette(dir);
  Bun.write(
    join(dir, "data.csv"),
    readFileSync(
      join(ROOT, "proof", "static-heatmap-europe-electricity", "data.csv"),
    ),
  );

  it("should adapt the type sheet's own worked example, mark its subject-specific regions SCAFFOLD, rewrite the composed-direction default, and write files that parse", () => {
    try {
      const result = run([
        "--type",
        "heatmap",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbeFrom",
      ]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("render-directions.mjs");
      expect(result.stdout).toContain("DirectedScaffoldProbeFrom.tsx");

      const runner = readFileSync(join(dir, "render-directions.mjs"), "utf8");
      expect(runner).toContain(
        "SCAFFOLD: scaffolded --from proof/static-heatmap-europe-electricity",
      );
      expect(runner).toContain("SCAFFOLD: data loading");
      expect(runner).toContain("SCAFFOLD: assertions");
      expect(runner).toContain("SCAFFOLD: card sentences");
      // The composed-direction default landed: no more unconditional loop over all three filed directions.
      expect(runner).toContain('const FILED = RUN_ARGS.includes("--filed");');
      expect(runner).toContain("#shared/design-base/index.mjs");
      expect(runner).not.toMatch(/readdirSync\(DIRECTIONS\)/);

      assertParses(join(dir, "render-directions.mjs"));
      assertParses(join(dir, "DirectedScaffoldProbeFrom.tsx"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("should refuse to overwrite an existing file", () => {
    const dir2 = join(ROOT, "proof", `.scaffold-test-static-collide-${STAMP}`);
    seedPalette(dir2);
    Bun.write(
      join(dir2, "data.csv"),
      readFileSync(
        join(ROOT, "proof", "static-heatmap-europe-electricity", "data.csv"),
      ),
    );
    Bun.write(join(dir2, "BRIEF.md"), "already here");
    try {
      const result = run([
        "--type",
        "heatmap",
        "--beat",
        `proof/.scaffold-test-static-collide-${STAMP}`,
        "--component",
        "ScaffoldProbeCollide",
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("already has");
      expect(result.stderr).toContain("BRIEF.md");
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });

  it("should refuse before writing anything when no PALETTE.md is reachable, naming the exact command", () => {
    const dir3 = join(
      ROOT,
      "proof",
      `.scaffold-test-static-nopalette-${STAMP}`,
    );
    mkdirSync(dir3, { recursive: true });
    Bun.write(
      join(dir3, "data.csv"),
      readFileSync(
        join(ROOT, "proof", "static-heatmap-europe-electricity", "data.csv"),
      ),
    );
    try {
      const result = run([
        "--type",
        "heatmap",
        "--beat",
        `proof/.scaffold-test-static-nopalette-${STAMP}`,
        "--component",
        "ScaffoldProbeNoPalette",
      ]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("PALETTE.md");
      expect(result.stderr).toContain("bun -e");
      expect(existsSync(join(dir3, "render-directions.mjs"))).toBe(false);
    } finally {
      rmSync(dir3, { recursive: true, force: true });
    }
  });

  it("should refuse naming the actual fault when PALETTE.md exists but its origin is not one of the accepted values", () => {
    const dir4 = join(
      ROOT,
      "proof",
      `.scaffold-test-static-badorigin-${STAMP}`,
    );
    mkdirSync(dir4, { recursive: true });
    Bun.write(
      join(dir4, "PALETTE.md"),
      '---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: subject-convention\n---\n',
    );
    Bun.write(
      join(dir4, "data.csv"),
      readFileSync(
        join(ROOT, "proof", "static-heatmap-europe-electricity", "data.csv"),
      ),
    );
    try {
      const result = run([
        "--type",
        "heatmap",
        "--beat",
        `proof/.scaffold-test-static-badorigin-${STAMP}`,
        "--component",
        "ScaffoldProbeBadOrigin",
      ]);
      expect(result.status).not.toBe(0);
      // The real cause — the invalid `origin` value and the accepted ones — not the generic
      // "no PALETTE.md reachable" message a wrong-but-present file used to be flattened into.
      expect(result.stderr).toContain(
        "origin must be newsroom, subject or journalist",
      );
      expect(result.stderr).toContain('"subject-convention"');
      expect(result.stderr).not.toContain("has no PALETTE.md reachable");
      expect(existsSync(join(dir4, "render-directions.mjs"))).toBe(false);
    } finally {
      rmSync(dir4, { recursive: true, force: true });
    }
  });

  it("should document grounding in the generated BRIEF.md's own front matter, as a comment naming what it is for", () => {
    const dir5 = join(
      ROOT,
      "proof",
      `.scaffold-test-static-grounding-${STAMP}`,
    );
    seedPalette(dir5);
    Bun.write(
      join(dir5, "data.csv"),
      readFileSync(
        join(ROOT, "proof", "static-heatmap-europe-electricity", "data.csv"),
      ),
    );
    try {
      const result = run([
        "--type",
        "heatmap",
        "--beat",
        `proof/.scaffold-test-static-grounding-${STAMP}`,
        "--component",
        "ScaffoldProbeGrounding",
      ]);
      expect(result.status).toBe(0);
      const brief = readFileSync(join(dir5, "BRIEF.md"), "utf8");
      const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(brief)?.[1] ?? "";
      expect(frontMatter).toContain("# grounding:");
      expect(frontMatter).toContain("G1 verdict");
    } finally {
      rmSync(dir5, { recursive: true, force: true });
    }
  });

  it("should rename only the component identifier, never a copied beat's own prose or an unrelated sibling file name", () => {
    const dir6 = join(
      ROOT,
      "proof",
      `.scaffold-test-static-frenchprose-${STAMP}`,
    );
    seedPalette(dir6);
    Bun.write(
      join(dir6, "data.csv"),
      readFileSync(
        join(ROOT, "proof", "static-carbon-footprint-spread", "data.csv"),
      ),
    );
    try {
      const result = run([
        "--type",
        "histogram",
        "--beat",
        `proof/.scaffold-test-static-frenchprose-${STAMP}`,
        "--from",
        "proof/static-carbon-footprint-spread",
        "--component",
        "SolarSpreadHistogram",
      ]);
      expect(result.status).toBe(0);
      const runner = readFileSync(join(dir6, "render-directions.mjs"), "utf8");
      // The identifier is renamed everywhere it is actually used.
      expect(runner).toContain("DirectedSolarSpreadHistogram");
      expect(runner).not.toContain("DirectedHistogram,");
      // The French prose survives verbatim — "Histogramme" is not "Histogram" with a suffix glued on.
      expect(runner).toContain("Histogramme des émissions");
      expect(runner).not.toContain("SolarSpreadHistogramme");

      const tsx = readFileSync(
        join(dir6, "DirectedSolarSpreadHistogram.tsx"),
        "utf8",
      );
      // The sibling file name mentioned in the copied beat's own header comment is untouched —
      // it names a real file that was never part of this adaptation.
      expect(tsx).toContain("CarbonFootprintHistogram.tsx");
      expect(tsx).not.toContain("CarbonFootprintSolarSpreadHistogram.tsx");
    } finally {
      rmSync(dir6, { recursive: true, force: true });
    }
  });
});
