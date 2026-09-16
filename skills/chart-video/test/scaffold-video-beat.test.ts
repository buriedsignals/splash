import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

/**
 * THE CHART VIDEO SCAFFOLD WRITES THE PLUMBING, REFUSES TO OVERWRITE, AND ITS GUARDS RUN GREEN BUT FOR THE PLACEHOLDERS.
 *
 * Scaffolds a real beat into a hidden folder under `proof/` (removed after), from the frozen `static-world-population`,
 * then runs the generated tests with the two repository guards a directed video must pass. Every failing test must be
 * a SCAFFOLD placeholder — the gesture tests, the copy, the claim — and the plumbing's own tests must pass, the default
 * of one composed direction among them.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const SCRIPT = join(
  ROOT,
  "skills",
  "chart-video",
  "scripts",
  "scaffold-video-beat.mjs",
);
const NAME = `.scaffold-test-chart-${process.pid}-${Date.now().toString(36)}`;
const BEAT = join(PROOF, NAME);
const ARGS = [
  "--type",
  "area",
  "--beat",
  `proof/${NAME}`,
  "--static",
  "proof/static-world-population",
  "--component",
  "ScaffoldProbe",
];
const EXPECTED = [
  "BRIEF.md",
  "DirectedScaffoldProbeVideo.tsx",
  "PALETTE.md",
  "Root.tsx",
  "ScaffoldProbeFrame.tsx",
  "build.mjs",
  "frame.test.ts",
  "index.ts",
  "render-directions-video.mjs",
  "scene.mjs",
  "states.mjs",
  "states.test.ts",
  "subject.mjs",
  "timing-contract.ts",
  "timing.test.ts",
];

const scaffold = (args: string[]) =>
  spawnSync("bun", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });
const contentsOf = (dir: string) =>
  Object.fromEntries(
    readdirSync(dir)
      .sort()
      .map((f) => [f, readFileSync(join(dir, f), "utf8")]),
  );

function removeProbe() {
  if (
    dirname(BEAT) === PROOF &&
    basename(BEAT).startsWith(".scaffold-test-") &&
    existsSync(BEAT)
  )
    rmSync(BEAT, { recursive: true });
}

/** Every test case of a `bun test` run over `files`, read from its JUnit report. */
function testCasesOf(files: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "scaffold-junit-"));
  try {
    const report = join(dir, "report.xml");
    const run = spawnSync(
      "bun",
      ["test", ...files, "--reporter=junit", `--reporter-outfile=${report}`],
      { cwd: ROOT, encoding: "utf8" },
    );
    const xml = readFileSync(report, "utf8");
    const cases = [
      ...xml.matchAll(
        /<testcase name="([^"]*)"[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g,
      ),
    ].map((m) => ({
      name: m[1]
        .replaceAll("&apos;", "'")
        .replaceAll("&quot;", '"')
        .replaceAll("&amp;", "&"),
      failed: /<failure/.test(m[2] ?? ""),
    }));
    const failures = Number(
      /<testsuites[^>]*\bfailures="(\d+)"/.exec(xml)?.[1],
    );
    return { cases, failures, output: run.stdout + run.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let first: ReturnType<typeof scaffold>;
beforeAll(() => {
  removeProbe();
  first = scaffold(ARGS);
});
afterAll(removeProbe);

describe("scaffold-video-beat", () => {
  it("should write exactly the plumbing files, and say which", () => {
    expect(first.status).toBe(0);
    expect(readdirSync(BEAT).sort()).toEqual(EXPECTED);
    for (const file of EXPECTED) expect(first.stdout).toContain(file);
  });

  it("should refuse to scaffold over an existing beat, and change no file in it", () => {
    const before = contentsOf(BEAT);
    const again = scaffold(ARGS);
    expect([again.status, again.stderr.includes("already exists")]).toEqual([
      1,
      true,
    ]);
    expect(contentsOf(BEAT)).toEqual(before);
  });

  it("should refuse a beat that is not a folder directly under proof/", () => {
    const outside = scaffold([
      "--type",
      "area",
      "--beat",
      "skills/chart-video/nope",
      "--static",
      "proof/static-world-population",
    ]);
    expect([
      outside.status,
      existsSync(join(ROOT, "skills", "chart-video", "nope")),
    ]).toEqual([1, false]);
  });

  it("should leave no template token and no typed no-break space in any file", () => {
    const files = Object.entries(contentsOf(BEAT));
    expect(
      files.filter(([, text]) => text.includes("%%")).map(([f]) => f),
    ).toEqual([]);
    expect(
      files.filter(([, text]) => text.includes("\u00A0")).map(([f]) => f),
    ).toEqual([]);
  });

  it("should copy the static beat's PALETTE.md and wire its frozen data", () => {
    expect(readFileSync(join(BEAT, "PALETTE.md"), "utf8")).toBe(
      readFileSync(
        join(PROOF, "static-world-population", "PALETTE.md"),
        "utf8",
      ),
    );
    expect(readFileSync(join(BEAT, "subject.mjs"), "utf8")).toContain(
      'join(STATIC_DIR, "data.csv")',
    );
  });

  it("should give the runner the composed direction by default and the filed demo set only behind --filed", () => {
    const runner = readFileSync(
      join(BEAT, "render-directions-video.mjs"),
      "utf8",
    );
    const build = readFileSync(join(BEAT, "build.mjs"), "utf8");
    expect(runner).toContain(
      "directionsFor(beat, { candidates: args.candidates, filed: args.filed })",
    );
    expect(build).toContain("composeDirections({ newsroom");
    expect(build).toContain(
      "return { candidates: raw === null ? 1 : Number(raw), filed, ",
    );
    expect(`${runner}${build}`).not.toMatch(/["'](creme|nocturne|rapport)["']/);
  });

  it(
    "should run its guards green, failing only the SCAFFOLD placeholders",
    () => {
      const tests = EXPECTED.filter((f) => f.endsWith(".test.ts")).map(
        (f) => `./proof/${NAME}/${f}`,
      );
      const { cases, failures, output } = testCasesOf([
        ...tests,
        "skills/splash/test/a-directed-video-types-no-style.test.ts",
        "skills/splash/test/no-cross-skill-imports.test.ts",
      ]);
      const failed = cases.filter((c) => c.failed).map((c) => c.name);
      const passed = new Set(cases.filter((c) => !c.failed).map((c) => c.name));
      expect(output).not.toContain("Unhandled error");
      expect(failures).toBe(failed.length);
      expect(failed.filter((name) => !name.includes("SCAFFOLD"))).toEqual([]);
      expect(failed.length).toBe(5);
      expect(
        passed.has(
          "should render exactly one composed direction by default, the demo set only on --filed",
        ),
      ).toBe(true);
      expect(
        [...passed].filter((name) =>
          name.startsWith("should draw no word under the floor at the end of"),
        ).length,
      ).toBe(6);
      expect(
        passed.has("should end on the picture with the credit on one line"),
      ).toBe(true);
      expect(
        passed.has(`proof/${NAME}/ScaffoldProbeFrame.tsx should type no style`),
      ).toBe(true);
      expect(
        passed.has(
          `proof/${NAME}/DirectedScaffoldProbeVideo.tsx should type no style`,
        ),
      ).toBe(true);
      expect(
        passed.has(
          "should find no import out of a skill outside test directories",
        ),
      ).toBe(true);
    },
    { timeout: 180_000 },
  );
});
