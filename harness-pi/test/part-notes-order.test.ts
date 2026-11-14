import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-pie-and-donut static (Qwen3.5-9B, 2026-11-14): the notes column stacked the gestures in their written order —
// the United States' note first, China's under it — while the United States' arc sits below China's. The two
// leaders crossed over the ring. Notes beside the plot stand in the order of the marks they point at.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(homedir(), ".splash-harness", "kept-runs", "gx-pie-and-donut-seeded-osaurus-qwen-1794693408510");
const story = join(BENCH, "stories", `zz-part-notes-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

type P = [number, number];
const cross = (a: P, b: P, c: P, d: P) => {
  const o = (p: P, q: P, r: P) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(RUN))("the static part-to-whole kit", () => {
  it("should draw no two leaders crossing each other", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md", "SUBJECTS.md"])
      if (existsSync(join(RUN, f))) cpSync(join(RUN, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "static", "pie-and-donut.gestures")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    for (const f of ["data.json", "beat.mjs", "gestures.json"]) cpSync(join(RUN, "beats", "1", f), join(at, f));
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    const dir = join(at, "renders");
    const svgs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".svg")) : [];
    expect(svgs.length, `${run.stdout}${run.stderr}`.slice(-600)).toBeGreaterThan(0);
    const svg = readFileSync(join(dir, svgs[0]), "utf8");
    const segs: [P, P][] = [];
    for (const m of svg.matchAll(/<polyline points="([^"]+)"[^>]*stroke-width="0\.7"/g)) {
      const pts = m[1].trim().split(/\s+/).map((p) => p.split(",").map(Number) as P);
      for (let k = 1; k < pts.length; k++) segs.push([pts[k - 1], pts[k]]);
    }
    const crossings: string[] = [];
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++)
        if (cross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) crossings.push(`${segs[i]} × ${segs[j]}`);
    expect(crossings).toEqual([]);
  }, 180_000);
});
