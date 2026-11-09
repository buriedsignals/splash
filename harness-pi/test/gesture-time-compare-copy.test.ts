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

// The static time plate drew a compare's copy as a solid bar in the text ink: on a stack it read as
// a black column standing in the chart (real-gwis runs 13 and 14). The copy is a measure, not a mark.

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KIT = join(
  CHECKOUT,
  "harness-pi",
  "craft",
  "static",
  "area-and-stacked-area.gestures",
);
const SHARED = join(CHECKOUT, "harness-pi", "craft", "_shared");
const STORY = join(CHECKOUT, "stories", "real-gwis-wildfire-counts");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-time-copy-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const LIMITS = JSON.parse(
  readFileSync(join(STORY, "STORYBOARD.md"), "utf8").match(/^limits: (".*")$/m)![1],
);

const BEAT = `
import { readFileSync } from "node:fs";
import { join } from "node:path";
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const points = data.rows.map((r) => ({ series: r[0], t: r[1], value: r[2] }));
const africa = (t) => points.find((p) => p.series === "Africa" && p.t === t).value;
export default {
  eyebrow: "Wildfire Counts",
  points: [
    ...points.filter((p) => p.series === "Africa"),
    ...points.filter((p) => p.series === "World").map((p) => ({ ...p, series: "Rest of World", value: p.value - africa(p.t) })),
  ].sort((a, b) => a.t - b.t || (a.series === "Africa" ? -1 : 1)),
  unit: "Fire events",
  format: (v) => new Intl.NumberFormat("en").format(Math.round(v)),
  gestures: [{ do: "highlight", mark: "Africa" }, { do: "compare", marks: ["2024 · Africa", "2015 · Africa"], note: "Africa's 2024 count is ~30% lower than its 2015 count" }],
  title: "Africa accounts for about two-thirds of the world's recorded wildfires, and the world's count has fallen by nearly half since it peaked in 2015.",
  limits: ${JSON.stringify(LIMITS)},
  source: "Global Wildfire Information System (2026), with minor processing by Our World in Data.",
  alt: "An area chart of wildfire events from 2012 to 2025, Africa's layer highlighted.",
};
`;

function render() {
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  writeFileSync(
    join(dir, "PALETTE.md"),
    `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
  );
  cpSync(join(STORY, "STORYBOARD.md"), join(dir, "STORYBOARD.md"));
  for (const f of readdirSync(KIT)) cpSync(join(KIT, f), join(at, f));
  for (const f of readdirSync(SHARED)) cpSync(join(SHARED, f), join(at, f));
  const rows = readFileSync(join(STORY, "source", "data.csv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(","))
    .filter(
      (c) => (c[0] === "Africa" || c[0] === "World") && Number(c[2]) <= 2025,
    )
    .map((c) => [c[0], Number(c[2]), Number(c[3])]);
  writeFileSync(
    join(at, "data.json"),
    JSON.stringify({
      columns: [{ name: "entity" }, { name: "year" }, { name: "events" }],
      rows,
    }),
  );
  writeFileSync(join(at, "beat.mjs"), BEAT);
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], {
    cwd: BENCH,
    stdout: "pipe",
    stderr: "pipe",
  });
  const renders = join(at, "renders");
  const svgFile = existsSync(renders)
    ? readdirSync(renders).find((f) => f.endsWith(".svg"))
    : undefined;
  return {
    output: `${run.stdout}${run.stderr}`,
    svg: svgFile ? readFileSync(join(renders, svgFile), "utf8") : "",
  };
}

describe.skipIf(
  !existsSync(join(BENCH, "package.json")) ||
    !existsSync(join(STORY, "STORYBOARD.md")),
)("the static time plate's compare copy", () => {
  it("should draw the copy laid against the other mark as an outline, never a solid bar", () => {
    const { output, svg } = render();
    expect(output).toContain("gestures: highlight, compare");
    const copies = [...svg.matchAll(/<rect[^>]*width="6"[^>]*>/g)].map(
      (m) => m[0],
    );
    expect(copies.length).toBe(2);
    expect(copies.every((r) => r.includes('fill="none"'))).toBe(true);
  });
});
