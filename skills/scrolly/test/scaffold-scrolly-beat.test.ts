import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * THE SCROLLY SCAFFOLDS WRITE THE PLUMBING ONLY, REFUSE TO OVERWRITE, AND THE FILES THEY WRITE PARSE.
 *
 * Scaffolds a chart beat and a map beat into hidden folders under `proof/` (removed after), each from a real
 * type sheet, then checks: the exact plumbing files are written and named on stdout; every file's syntax is
 * valid (Bun's own transpiler, so no import needs to resolve); no `%%TOKEN%%` or typed no-break space is left in
 * any file; and the generated runner refuses to render with a named SCAFFOLD error, before it ever reaches the
 * network (a beat with no PALETTE.md and no MapTiler key still fails on its own placeholder copy first).
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const CHART_SCRIPT = join(
  ROOT,
  "skills",
  "scrolly",
  "scripts",
  "scaffold-scrolly-beat.mjs",
);
const MAP_SCRIPT = join(
  ROOT,
  "skills",
  "scrolly",
  "scripts",
  "scaffold-scrolly-map-beat.mjs",
);
const STAMP = `${process.pid}-${Date.now().toString(36)}`;

const CHART_NAME = `.scaffold-test-scrolly-chart-${STAMP}`;
const CHART_BEAT = join(PROOF, CHART_NAME);
const CHART_ARGS = [
  "--type",
  "boxplot",
  "--beat",
  `proof/${CHART_NAME}`,
  "--component",
  "ScaffoldProbe",
];
const CHART_EXPECTED = [
  "BRIEF.md",
  "DirectedScaffoldProbeScrolly.tsx",
  "boxplot-drive.mjs",
  "render-directions-scrolly.mjs",
];

const MAP_NAME = `.scaffold-test-scrolly-map-${STAMP}`;
const MAP_BEAT = join(PROOF, MAP_NAME);
const MAP_ARGS = [
  "--type",
  "dot-density",
  "--beat",
  `proof/${MAP_NAME}`,
  "--component",
  "ScaffoldProbe",
];
const MAP_EXPECTED = [
  "BRIEF.md",
  "DirectedScaffoldProbeScrolly.tsx",
  "dot-density-drive.mjs",
  "dot-density-plan.mjs",
  "render-directions-scrolly.mjs",
];

const run = (script: string, args: string[]) =>
  spawnSync("bun", [script, ...args], { cwd: ROOT, encoding: "utf8" });

function removeProbe(dir: string, name: string) {
  if (
    dirname(dir) === PROOF &&
    basename(dir).startsWith(".scaffold-test-") &&
    basename(dir) === name &&
    existsSync(dir)
  )
    rmSync(dir, { recursive: true });
}

/** Every file the scaffold wrote parses as valid TS/TSX/JS — checked with Bun's own transpiler, which never
 *  resolves an import, so this is a fast syntax check independent of the repository's own path aliases. */
function assertEveryFileParses(dir: string, files: string[]) {
  for (const file of files) {
    const loader = file.endsWith(".tsx") ? "tsx" : "js";
    const transpiler = new Bun.Transpiler({ loader });
    const source = readFileSync(join(dir, file), "utf8");
    expect(() => transpiler.transformSync(source)).not.toThrow();
  }
}

let chartFirst: ReturnType<typeof run>;
let mapFirst: ReturnType<typeof run>;
beforeAll(async () => {
  removeProbe(CHART_BEAT, CHART_NAME);
  removeProbe(MAP_BEAT, MAP_NAME);
  chartFirst = run(CHART_SCRIPT, CHART_ARGS);
  mapFirst = run(MAP_SCRIPT, MAP_ARGS);
});
afterAll(() => {
  removeProbe(CHART_BEAT, CHART_NAME);
  removeProbe(MAP_BEAT, MAP_NAME);
});

describe("scaffold-scrolly-beat (chart)", () => {
  it("should write exactly the chart plumbing files, and say which", () => {
    expect(chartFirst.status).toBe(0);
    expect(readdirSync(CHART_BEAT).sort()).toEqual(
      CHART_EXPECTED.slice().sort(),
    );
    for (const file of CHART_EXPECTED)
      expect(chartFirst.stdout).toContain(file);
  });

  it("should refuse to scaffold over an existing beat, and change nothing", () => {
    const before = readdirSync(CHART_BEAT).sort();
    const again = run(CHART_SCRIPT, CHART_ARGS);
    expect([again.status, again.stderr.includes("already exists")]).toEqual([
      1,
      true,
    ]);
    expect(readdirSync(CHART_BEAT).sort()).toEqual(before);
  });

  it("should refuse a type with no sheet under references/types/", () => {
    const bad = run(CHART_SCRIPT, [
      "--type",
      "not-a-real-type",
      "--beat",
      `proof/${CHART_NAME}-bad`,
    ]);
    expect([
      bad.status,
      existsSync(join(PROOF, `${CHART_NAME}-bad`)),
      bad.stderr.includes("has no sheet"),
    ]).toEqual([1, false, true]);
  });

  it("should leave no template token and no typed no-break space in any file", async () => {
    for (const file of CHART_EXPECTED) {
      const text = await Bun.file(join(CHART_BEAT, file)).text();
      expect([file, text.includes("%%")]).toEqual([file, false]);
      expect([file, text.includes("\u00A0")]).toEqual([file, false]);
    }
  });

  it("should write every file so it parses", () => {
    assertEveryFileParses(
      CHART_BEAT,
      CHART_EXPECTED.filter((f) => !f.endsWith(".md")),
    );
  });

  it("should give the runner the composed direction by default, --filed for the demo set, and refuse to render with a named SCAFFOLD error", () => {
    const runner = readFileSync(
      join(CHART_BEAT, "render-directions-scrolly.mjs"),
      "utf8",
    );
    expect(runner).toContain('const FILED = process.argv.includes("--filed");');
    expect(runner).not.toMatch(/["'](creme|nocturne|rapport)["']/);
    const rendered = spawnSync(
      "bun",
      [join(CHART_BEAT, "render-directions-scrolly.mjs")],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(rendered.status).not.toBe(0);
    expect(rendered.stderr).toContain("SCAFFOLD");
    expect(rendered.stderr).not.toContain("Unhandled error");
  });
});

describe("scaffold-scrolly-map-beat (map)", () => {
  it("should write exactly the map plumbing files, and say which", () => {
    expect(mapFirst.status).toBe(0);
    expect(readdirSync(MAP_BEAT).sort()).toEqual(MAP_EXPECTED.slice().sort());
    for (const file of MAP_EXPECTED) expect(mapFirst.stdout).toContain(file);
  });

  it("should leave no template token and no typed no-break space in any file", async () => {
    for (const file of MAP_EXPECTED) {
      const text = await Bun.file(join(MAP_BEAT, file)).text();
      expect([file, text.includes("%%")]).toEqual([file, false]);
      expect([file, text.includes("\u00A0")]).toEqual([file, false]);
    }
  });

  it("should write every file so it parses", () => {
    assertEveryFileParses(
      MAP_BEAT,
      MAP_EXPECTED.filter((f) => !f.endsWith(".md")),
    );
  });

  it("should refuse to render with a named SCAFFOLD error before touching the network", () => {
    const rendered = spawnSync(
      "bun",
      [join(MAP_BEAT, "render-directions-scrolly.mjs")],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(rendered.status).not.toBe(0);
    expect(rendered.stderr).toContain("SCAFFOLD");
    expect(rendered.stderr).not.toContain("no MapTiler key");
  });
});
