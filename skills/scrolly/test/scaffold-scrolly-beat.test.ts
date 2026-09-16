import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * THE SCROLLY SCAFFOLDS WRITE THE PLUMBING ONLY, REFUSE TO OVERWRITE, AND THE FILES THEY WRITE PARSE.
 *
 * Two describe blocks per scaffold: `--generic` (the old, fully empty stub — required for a type with no worked
 * example, optional otherwise) and the DEFAULT path (no flag), which adapts the type sheet's own worked example
 * beat instead — the owner's cold-run method (read the validated beat's own code, adapt it) encoded mechanically.
 * Scaffolds into hidden folders under `proof/` (removed after), then checks: the exact plumbing files are
 * written and named on stdout; every file's syntax is valid (Bun's own transpiler, so no import needs to
 * resolve); no `%%TOKEN%%` or typed no-break space is left in any file; the `--generic` runner refuses to render
 * with a named SCAFFOLD error before it ever reaches the network; and the default runner carries `SCAFFOLD:`
 * banners over the regions adapted from its worked example (data loading, assertions, card sentences).
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
  "--generic",
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
  "--generic",
];
const MAP_EXPECTED = [
  "BRIEF.md",
  "DirectedScaffoldProbeScrolly.tsx",
  "dot-density-drive.mjs",
  "dot-density-plan.mjs",
  "render-directions-scrolly.mjs",
];

// The DEFAULT path (no --generic): adapts the type sheet's own worked example — boxplot's is
// proof/scrolly-boxplot-france-co2-decades (its own driver happens to be named boxplot-drive.mjs already);
// dot-density's is proof/scrolly-dot-density-europe-stations, whose plan and driver keep their own short names
// (plan.mjs, dot-drive.mjs) rather than the generic %%TYPE%%-plan.mjs / %%TYPE%%-drive.mjs convention.
const CHART_FROM_NAME = `.scaffold-test-scrolly-chart-from-${STAMP}`;
const CHART_FROM_BEAT = join(PROOF, CHART_FROM_NAME);
const CHART_FROM_ARGS = [
  "--type",
  "boxplot",
  "--beat",
  `proof/${CHART_FROM_NAME}`,
  "--component",
  "ScaffoldProbe",
];
const CHART_FROM_EXPECTED = [
  "BRIEF.md",
  "DirectedScaffoldProbeScrolly.tsx",
  "boxplot-drive.mjs",
  "render-directions-scrolly.mjs",
];

const MAP_FROM_NAME = `.scaffold-test-scrolly-map-from-${STAMP}`;
const MAP_FROM_BEAT = join(PROOF, MAP_FROM_NAME);
const MAP_FROM_ARGS = [
  "--type",
  "dot-density",
  "--beat",
  `proof/${MAP_FROM_NAME}`,
  "--component",
  "ScaffoldProbe",
];
const MAP_FROM_EXPECTED = [
  "BRIEF.md",
  "DirectedScaffoldProbeScrolly.tsx",
  "dot-drive.mjs",
  "plan.mjs",
  "render-directions-scrolly.mjs",
];

const run = (script: string, args: string[]) =>
  spawnSync("bun", [script, ...args], { cwd: ROOT, encoding: "utf8" });

// Both scaffolds now refuse at scaffold time (not deep inside the render) when no PALETTE.md is reachable, and
// the default (--from) path also refuses when the worked example's own data assets (data.csv / stations.csv)
// are not yet beside the beat — see skills/scrolly/scripts/depth-independent.mjs. These fixtures let the
// existing "should succeed" scaffolds here keep succeeding; the refusals themselves are covered by
// depth-independent.test.ts.
const PALETTE_FIXTURE =
  '---\nground: "#16191B"\naccent: "#D4A853"\naccents: "#5B8A8A"\norigin: "newsroom"\n---\n';
const DATA_FIXTURE = "x\n1\n";
function seed(dir: string, files: Record<string, string>) {
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(dir, name), content);
}

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
let chartFromFirst: ReturnType<typeof run>;
let mapFromFirst: ReturnType<typeof run>;
beforeAll(async () => {
  removeProbe(CHART_BEAT, CHART_NAME);
  removeProbe(MAP_BEAT, MAP_NAME);
  removeProbe(CHART_FROM_BEAT, CHART_FROM_NAME);
  removeProbe(MAP_FROM_BEAT, MAP_FROM_NAME);
  seed(CHART_BEAT, { "PALETTE.md": PALETTE_FIXTURE });
  seed(MAP_BEAT, { "PALETTE.md": PALETTE_FIXTURE });
  seed(CHART_FROM_BEAT, {
    "PALETTE.md": PALETTE_FIXTURE,
    "data.csv": DATA_FIXTURE,
  });
  seed(MAP_FROM_BEAT, {
    "PALETTE.md": PALETTE_FIXTURE,
    "stations.csv": DATA_FIXTURE,
  });
  chartFirst = run(CHART_SCRIPT, CHART_ARGS);
  mapFirst = run(MAP_SCRIPT, MAP_ARGS);
  chartFromFirst = run(CHART_SCRIPT, CHART_FROM_ARGS);
  mapFromFirst = run(MAP_SCRIPT, MAP_FROM_ARGS);
});
afterAll(() => {
  removeProbe(CHART_BEAT, CHART_NAME);
  removeProbe(MAP_BEAT, MAP_NAME);
  removeProbe(CHART_FROM_BEAT, CHART_FROM_NAME);
  removeProbe(MAP_FROM_BEAT, MAP_FROM_NAME);
});

describe("scaffold-scrolly-beat (chart)", () => {
  it("should write exactly the chart plumbing files, and say which", () => {
    expect(chartFirst.status).toBe(0);
    expect(readdirSync(CHART_BEAT).sort()).toEqual(
      [...CHART_EXPECTED, "PALETTE.md"].sort(),
    );
    for (const file of CHART_EXPECTED)
      expect(chartFirst.stdout).toContain(file);
  });

  it("should refuse to scaffold over its own files, naming every one, and change nothing", () => {
    const before = readdirSync(CHART_BEAT).sort();
    const again = run(CHART_SCRIPT, CHART_ARGS);
    expect([again.status, again.stderr.includes("already has")]).toEqual([
      1,
      true,
    ]);
    for (const file of CHART_EXPECTED) expect(again.stderr).toContain(file);
    expect(readdirSync(CHART_BEAT).sort()).toEqual(before);
  });

  it("should scaffold into a beat folder that already exists (as analyst's own step leaves it), refusing only on a real file collision", () => {
    const name = `.scaffold-test-scrolly-chart-existing-${STAMP}`;
    const dir = join(PROOF, name);
    removeProbe(dir, name);
    seed(dir, {
      "data.json": "{}",
      "PALETTE.md": PALETTE_FIXTURE,
      "data.csv": DATA_FIXTURE,
    });
    try {
      const result = run(CHART_SCRIPT, [
        "--type",
        "boxplot",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbe",
      ]);
      expect(result.status).toBe(0);
      expect(readdirSync(dir).sort()).toEqual(
        [...CHART_EXPECTED, "data.json", "PALETTE.md", "data.csv"].sort(),
      );
      expect(readFileSync(join(dir, "data.json"), "utf8")).toBe("{}");
    } finally {
      removeProbe(dir, name);
    }
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

  it("should not double the Scrolly suffix when --component is already given one", () => {
    const name = `.scaffold-test-scrolly-chart-suffix-${STAMP}`;
    const dir = join(PROOF, name);
    removeProbe(dir, name);
    seed(dir, { "PALETTE.md": PALETTE_FIXTURE, "data.csv": DATA_FIXTURE });
    try {
      const result = run(CHART_SCRIPT, [
        "--type",
        "boxplot",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbeScrolly",
      ]);
      expect(result.status).toBe(0);
      expect(existsSync(join(dir, "DirectedScaffoldProbeScrolly.tsx"))).toBe(
        true,
      );
      expect(
        existsSync(join(dir, "DirectedScaffoldProbeScrollyScrolly.tsx")),
      ).toBe(false);
    } finally {
      removeProbe(dir, name);
    }
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
    expect(readdirSync(MAP_BEAT).sort()).toEqual(
      [...MAP_EXPECTED, "PALETTE.md"].sort(),
    );
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

  it("should not double the Scrolly suffix when --component is already given one", () => {
    const name = `.scaffold-test-scrolly-map-suffix-${STAMP}`;
    const dir = join(PROOF, name);
    removeProbe(dir, name);
    seed(dir, { "PALETTE.md": PALETTE_FIXTURE, "stations.csv": DATA_FIXTURE });
    try {
      const result = run(MAP_SCRIPT, [
        "--type",
        "dot-density",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbeScrolly",
      ]);
      expect(result.status).toBe(0);
      expect(existsSync(join(dir, "DirectedScaffoldProbeScrolly.tsx"))).toBe(
        true,
      );
      expect(
        existsSync(join(dir, "DirectedScaffoldProbeScrollyScrolly.tsx")),
      ).toBe(false);
    } finally {
      removeProbe(dir, name);
    }
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

describe("scaffold-scrolly-beat (chart) — default --from", () => {
  it("should adapt boxplot's own worked example, preserving its driver's own filename, and say which", () => {
    expect(chartFromFirst.status).toBe(0);
    expect(readdirSync(CHART_FROM_BEAT).sort()).toEqual(
      [...CHART_FROM_EXPECTED, "PALETTE.md", "data.csv"].sort(),
    );
    for (const file of CHART_FROM_EXPECTED)
      expect(chartFromFirst.stdout).toContain(file);
  });

  it("should mark the worked example's own subject-specific regions SCAFFOLD, and rename its component throughout", () => {
    const runner = readFileSync(
      join(CHART_FROM_BEAT, "render-directions-scrolly.mjs"),
      "utf8",
    );
    expect(runner).toContain(
      "SCAFFOLD: scaffolded --from proof/scrolly-boxplot-france-co2-decades",
    );
    expect(runner).toContain("SCAFFOLD: data loading");
    expect(runner).toContain("SCAFFOLD: assertions");
    expect(runner).toContain("SCAFFOLD: card sentences");
    expect(runner).toContain("DirectedScaffoldProbeScrolly");
    expect(runner).not.toContain("DirectedBoxplotScrolly");
    const brief = readFileSync(join(CHART_FROM_BEAT, "BRIEF.md"), "utf8");
    expect(brief).toContain(
      "scaffolded `--from proof/scrolly-boxplot-france-co2-decades`",
    );
  });

  it("should leave no template token in any file", async () => {
    for (const file of CHART_FROM_EXPECTED) {
      const text = await Bun.file(join(CHART_FROM_BEAT, file)).text();
      expect([file, text.includes("%%")]).toEqual([file, false]);
    }
  });

  it("should write every file so it parses", () => {
    assertEveryFileParses(
      CHART_FROM_BEAT,
      CHART_FROM_EXPECTED.filter((f) => !f.endsWith(".md")),
    );
  });

  it("should refuse a --from beat that does not exist", () => {
    const name = `.scaffold-test-scrolly-chart-badfrom-${STAMP}`;
    const bad = run(CHART_SCRIPT, [
      "--type",
      "boxplot",
      "--beat",
      `proof/${name}`,
      "--from",
      "proof/scrolly-does-not-exist",
    ]);
    expect([
      bad.status,
      existsSync(join(PROOF, name)),
      bad.stderr.includes("--from proof/scrolly-does-not-exist does not exist"),
    ]).toEqual([1, false, true]);
  });

  it("should refuse at scaffold time, naming exactly the missing data.csv, when the worked example's own data is not yet beside the beat", () => {
    const name = `.scaffold-test-scrolly-chart-noassets-${STAMP}`;
    const dir = join(PROOF, name);
    removeProbe(dir, name);
    try {
      const result = run(CHART_SCRIPT, [
        "--type",
        "boxplot",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbe",
      ]);
      expect([result.status, existsSync(dir)]).toEqual([1, false]);
      expect(result.stderr).toContain(`proof/${name} is missing the data`);
      expect(result.stderr).toContain("data.csv");
    } finally {
      removeProbe(dir, name);
    }
  });

  it("should refuse at scaffold time, with the exact bun -e command, when no PALETTE.md is reachable", () => {
    const name = `.scaffold-test-scrolly-chart-nopalette-${STAMP}`;
    const dir = join(PROOF, name);
    removeProbe(dir, name);
    seed(dir, { "data.csv": DATA_FIXTURE });
    try {
      const result = run(CHART_SCRIPT, [
        "--type",
        "boxplot",
        "--beat",
        `proof/${name}`,
        "--component",
        "ScaffoldProbe",
      ]);
      expect([result.status, existsSync(join(dir, "BRIEF.md"))]).toEqual([
        1,
        false,
      ]);
      expect(result.stderr).toContain("has no PALETTE.md reachable");
      expect(result.stderr).toContain("bun -e");
    } finally {
      removeProbe(dir, name);
    }
  });
});

describe("scaffold-scrolly-map-beat (map) — default --from", () => {
  it("should adapt dot-density's own worked example, preserving its plan's and driver's own filenames, and say which", () => {
    expect(mapFromFirst.status).toBe(0);
    expect(readdirSync(MAP_FROM_BEAT).sort()).toEqual(
      [...MAP_FROM_EXPECTED, "PALETTE.md", "stations.csv"].sort(),
    );
    for (const file of MAP_FROM_EXPECTED)
      expect(mapFromFirst.stdout).toContain(file);
  });

  it("should mark the worked example's own subject-specific regions SCAFFOLD in its plan and its driver", () => {
    const plan = readFileSync(join(MAP_FROM_BEAT, "plan.mjs"), "utf8");
    expect(plan).toContain(
      "SCAFFOLD: scaffolded --from proof/scrolly-dot-density-europe-stations",
    );
    expect(plan).toContain("SCAFFOLD: marks");
    const drive = readFileSync(join(MAP_FROM_BEAT, "dot-drive.mjs"), "utf8");
    expect(drive).toContain("SCAFFOLD: paint");
  });

  it("should leave no template token in any file", async () => {
    for (const file of MAP_FROM_EXPECTED) {
      const text = await Bun.file(join(MAP_FROM_BEAT, file)).text();
      expect([file, text.includes("%%")]).toEqual([file, false]);
    }
  });

  it("should write every file so it parses", () => {
    assertEveryFileParses(
      MAP_FROM_BEAT,
      MAP_FROM_EXPECTED.filter((f) => !f.endsWith(".md")),
    );
  });
});
