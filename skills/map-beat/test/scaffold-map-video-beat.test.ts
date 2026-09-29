// LANE: serial — writes a probe beat into proof/ while it runs (scripts/test-lanes.mjs).
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

/**
 * THE MAP VIDEO SCAFFOLD WRITES THE PLUMBING, REFUSES TO OVERWRITE, AND ITS GUARDS RUN GREEN BUT FOR THE PLACEHOLDERS.
 *
 * Scaffolds a real map beat into a hidden folder under `proof/` (removed after), from the frozen
 * `static-heatmap-europe-electricity`. The live measurement needs the MapTiler key, so the offline guards are run on a
 * SYNTHETIC measurement — an all-sea map under the generated plan's own digest — which is exactly what `measured.json`
 * holds, minus the land. Every failing test must be a SCAFFOLD placeholder; the plumbing's own tests must pass, the
 * default of one composed direction and the credit seated on the sea among them.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const SCRIPT = join(
  ROOT,
  "skills",
  "map-beat",
  "scripts",
  "scaffold-map-video-beat.mjs",
);
const NAME = `.scaffold-test-map-${process.pid}-${Date.now().toString(36)}`;
const BEAT = join(PROOF, NAME);
const ARGS = [
  "--type",
  "choropleth",
  "--beat",
  `proof/${NAME}`,
  "--static",
  "proof/static-heatmap-europe-electricity",
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
  "map-plan.mjs",
  "measure.mjs",
  "render-directions-video.mjs",
  "scene.mjs",
  "states.mjs",
  "states.test.ts",
  "subject.mjs",
  "timing-contract.ts",
  "timing.test.ts",
];
/** The templates both video scaffolds share, byte for byte (`chart-video` carries its own copy). */
const SHARED_TEMPLATES = [
  "index.ts",
  "timing-contract.ts",
  "timing.test.ts",
  "timing.story.test.ts",
  "states.mjs",
  "states.test.ts",
  "subject.mjs",
].map((f) => `${f}.tmpl`);
/**
 * BRIEF.md.tmpl is shared too, except for ONE line: its front matter's `medium`, which f5fdcb988
 * ("a scaffolded beat joins the editorial chain") wrote as a literal per skill — `map` here, `chart`
 * in chart-video — because `a-scaffolded-beat-joins-the-chain.test.ts` reads that literal off the raw
 * template. Everything else in it is still held byte for byte.
 */
const MEDIUM_LINE = /^medium: .*$/m;

const scaffold = (args: string[]) =>
  spawnSync("bun", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });
const contentsOf = (dir: string) =>
  Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f !== "measured.json")
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

describe("scaffold-map-video-beat", () => {
  it("should write exactly the plumbing files, and say which", () => {
    expect(first.status).toBe(0);
    expect(readdirSync(BEAT).sort()).toEqual(EXPECTED);
    for (const file of EXPECTED) expect(first.stdout).toContain(file);
  });

  it("should write a story beat its own key scan and timing rules, which the catalogue's tests never reach", () => {
    // A proof/ beat is scanned by `every-map-video-keeps-the-key-out.live.test.ts` and timed by
    // `chart-video/test/every-video-beat-keeps-the-timing-contract.test.ts`, so it carries neither;
    // a story beat may sit in an installed root: `shared/`, stories, nothing else.
    expect(readFileSync(join(BEAT, "timing.test.ts"), "utf8")).not.toContain("checkTiming(T)");
    const home = mkdtempSync(join(tmpdir(), "scaffold-story-root-"));
    try {
      writeFileSync(
        join(home, "package.json"),
        JSON.stringify({ type: "module", imports: { "#shared/*": "./shared/*" } }),
      );
      symlinkSync(join(ROOT, "shared"), join(home, "shared"));
      const still = join(home, "stories", "a-story", "beats", "a-still");
      mkdirSync(still, { recursive: true });
      writeFileSync(join(still, "data.csv"), "iso3,value\nBGR,38.4\n");
      writeFileSync(
        join(home, "stories", "a-story", "PALETTE.md"),
        `---\nground: "#16191B"\naccent: "#D4A853"\naccents: #5B8A8A\norigin: newsroom\n---\n`,
      );
      const run = spawnSync(
        "bun",
        [SCRIPT, "--type", "choropleth", "--beat", "stories/a-story/beats/a-beat", "--static", "stories/a-story/beats/a-still", "--filed"],
        { cwd: home, encoding: "utf8" },
      );
      const story = join(home, "stories", "a-story", "beats", "a-beat");
      expect([
        run.status,
        existsSync(join(story, "no-key.live.test.ts")),
        readFileSync(join(story, "timing.test.ts"), "utf8").includes("checkTiming(T)"),
      ]).toEqual([0, true, true]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it("should refuse to scaffold over an existing beat, and change no file in it", () => {
    const before = contentsOf(BEAT);
    const again = scaffold(ARGS);
    // The refusal is PER FILE since d71fb94e4 ("four producers reach a story"): a story's analyst
    // writes into `beats/<id>/` before any producer runs, so an existing folder is allowed and only a
    // file collision refuses — in the words `scaffoldBeat` throws, "already has … never overwrites".
    expect([
      again.status,
      /already has .+ — the scaffold never overwrites a file/.test(again.stderr),
    ]).toEqual([1, true]);
    expect(contentsOf(BEAT)).toEqual(before);
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

  it("should carry the key placeholder in the plan and never a key", () => {
    const plan = readFileSync(join(BEAT, "map-plan.mjs"), "utf8");
    expect(plan).toContain('"__MAPTILER" + "_KEY__"');
    expect(plan).toContain("fitBoundsMeet");
    expect(readFileSync(join(BEAT, "build.mjs"), "utf8")).toContain(
      "seatOnSea(",
    );
  });

  it("should give the runner the composed direction by default, through the proxy, and the filed demo set only behind --filed", () => {
    const runner = readFileSync(
      join(BEAT, "render-directions-video.mjs"),
      "utf8",
    );
    const build = readFileSync(join(BEAT, "build.mjs"), "utf8");
    expect(runner).toContain(
      "directionsFor(beat, { candidates: args.candidates, filed: args.filed })",
    );
    expect(runner).toContain(
      "mapPlanProxied: throughProxy(props.mapPlan, origin)",
    );
    expect(build).toContain("composeDirections({ newsroom");
    expect(build).toContain(
      "return { candidates: raw === null ? 1 : Number(raw), filed, ",
    );
    expect(`${runner}${build}`).not.toMatch(/["'](creme|nocturne|rapport)["']/);
  });

  it("should refuse a camera measured while a tile was still loading", async () => {
    const { assertTilesLoaded } = await import(join(BEAT, "measure.mjs"));
    expect(() =>
      assertTilesLoaded("probe", { whole: { tilesLoaded: false } }),
    ).toThrow("still loading");
  });

  it("should share its common templates with the chart video scaffold, byte for byte", () => {
    const own = join(
      ROOT,
      "skills",
      "map-beat",
      "assets",
      "video-beat-scaffold",
    );
    const chart = join(
      ROOT,
      "skills",
      "chart-video",
      "assets",
      "video-beat-scaffold",
    );
    expect(
      SHARED_TEMPLATES.filter(
        (f) =>
          readFileSync(join(own, f), "utf8") !==
          readFileSync(join(chart, f), "utf8"),
      ),
    ).toEqual([]);

    const ownBrief = readFileSync(join(own, "BRIEF.md.tmpl"), "utf8");
    const chartBrief = readFileSync(join(chart, "BRIEF.md.tmpl"), "utf8");
    expect([
      ownBrief.match(MEDIUM_LINE)?.[0],
      chartBrief.match(MEDIUM_LINE)?.[0],
    ]).toEqual(["medium: map", "medium: chart"]);
    expect(ownBrief.replace(MEDIUM_LINE, "medium: *")).toBe(
      chartBrief.replace(MEDIUM_LINE, "medium: *"),
    );
  });

  it(
    "should run its offline guards green on a measured map, failing only the SCAFFOLD placeholders",
    async () => {
      const build = await import(join(BEAT, "build.mjs"));
      const { planDigestOf } = await import(join(BEAT, "measure.mjs"));
      const beat = build.loadBeat();
      const measured: any = {
        size: { width: 1920, height: 1080 },
        planDigest: {},
        cameras: {},
      };
      for (const entry of build.directionsFor(beat).directions) {
        const { props } = build.buildDirection(entry, beat, { measured: null });
        const grid = {
          cell: 16,
          cols: 120,
          rows: 67,
          colours: Array(120 * 67).fill(props.mapPlan.tints.water),
        };
        measured.planDigest[entry.label] = planDigestOf(props.mapPlan);
        measured.cameras[entry.label] = {
          whole: { tilesLoaded: true, projected: {}, grid },
        };
      }
      writeFileSync(build.MEASURED, JSON.stringify(measured));

      const tests = EXPECTED.filter(
        (f) => f.endsWith(".test.ts") && !f.endsWith(".live.test.ts"),
      ).map((f) => `./proof/${NAME}/${f}`);
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
        passed.has("should end on the map with the credit on one line"),
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
