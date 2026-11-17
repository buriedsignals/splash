import { describe, expect, it } from "bun:test";
import { MIN_STEP, boxOf, frameRemoves, ladderThatWorks, radiiHint, radiiThatWork } from "../craft/web/locator/removes.mjs";

// gx-locator web (Qwen3.5-9B, mvq55): "remove site frames no peer: widen its radius" and "removes voisinage and
// europe frame the same window" named no radius that works; the model walked 130/320/800 → 470/1150/2900 → back.

const subject = { name: "S", kind: "k", lon: 35.0, lat: 47.5, priority: 6000 };
const at = (dLonKm: number, dLatKm: number, priority: number, name: string) => ({
  name, kind: "k", priority,
  lon: subject.lon + dLonKm / (111.32 * Math.cos(subject.lat * Math.PI / 180)),
  lat: subject.lat + dLatKm / 110.574,
});
const others = [at(100, 0, 4000, "A"), at(-400, 50, 3000, "B"), at(1500, -100, 2000, "C"), at(-6000, 200, 1000, "D")];
const places = [at(30, 10, 700000, "p1"), at(-120, 80, 400000, "p2")];
const beat = (radii: (number | null)[]) => ({
  others, places,
  removes: radii.map((radius, i) => ({ key: ["site", "region", "voisinage", "europe"][i], radius, places: radius !== null })),
});

describe("radiiThatWork", () => {
  it("should give every sized remove a peer of its own", () => {
    const b = beat([130, 470, 1200, null]);
    const radii = radiiThatWork(b, subject)!;
    const { frame } = frameRemoves(b, subject);
    expect(b.removes.filter((r) => r.radius !== null).every((r) => frame({ ...r, radius: radii[r.key] }).heldOthers.length > 0)).toBe(true);
  });

  it("should give radii whose windows differ from each other and from the last remove's", () => {
    const b = beat([130, 470, 1200, null]);
    const radii = radiiThatWork(b, subject)!;
    const { frame } = frameRemoves(b, subject);
    const boxes = b.removes.map((r) => boxOf(frame({ ...r, radius: r.radius === null ? null : radii[r.key] }).window));
    expect(new Set(boxes).size).toBe(4);
  });

  it("should give radii each of whose frames is at least twice as wide as the one before", () => {
    const b = beat([130, 470, 1200, null]);
    const radii = radiiThatWork(b, subject)!;
    const { frame } = frameRemoves(b, subject);
    const spans = b.removes.map((r) => frame({ ...r, radius: r.radius === null ? null : radii[r.key] }).spanKm);
    expect(spans.slice(1).every((w, i) => w >= MIN_STEP * spans[i])).toBe(true);
  });

  it("should name the remove to drop when the peers cannot fill them all", () => {
    expect(radiiHint({ ...beat([100, 200, 300, null]), others: others.slice(1) }, subject)).toMatch(/^drop remove \w+ .*radii that work, rising/);
  });

  it("should keep the default remove when it drops one", () => {
    expect(ladderThatWorks({ ...beat([100, 200, 300, null]), others: others.slice(1), defaultKey: "site" }, subject)!.dropped).not.toBe("site");
  });
});

// The render itself, on mvq56's beat as it stood mid-cell: 7 peers, 17 settlements, removes site / region (default) /
// voisinage / europe at 500 / 1200 / 3000 / null.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll } from "bun:test";

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(homedir(), ".splash-harness", "kept-runs", "gx-locator-web-qwen-mvq56-radii-fixture");
const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function render(edit: (beat: string) => string) {
  const story = join(BENCH, "stories", `zz-locator-radii-${process.pid}-${made.length}`);
  const dir = join(story, "beats", "1");
  made.push(story);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(RUN)) if (f.endsWith(".md")) cpSync(join(RUN, f), join(story, f));
  for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "web", "locator")])
    for (const f of readdirSync(src)) cpSync(join(src, f), join(dir, f), { recursive: true });
  for (const f of ["data.json", "beat.mjs"]) cpSync(join(RUN, "beats", "1", f), join(dir, f));
  writeFileSync(join(dir, "beat.mjs"), edit(readFileSync(join(dir, "beat.mjs"), "utf8")));
  const out = Bun.spawnSync(["bun", join(dir, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, MAPTILER_KEY: "" } });
  return `${out.stdout}${out.stderr}`;
}

// The three sized removes, in order, at the radii given.
const radii = (...km: number[]) => (b: string) => {
  let i = 0;
  return b.replace(/radius: \d+, places/g, () => `radius: ${km[i++]}, places`);
};

it("should hold the step factor vantage.ts holds the declaration to", async () => {
  const vantage = await import("../../skills/map-web/assets/vantage.ts");
  expect(MIN_STEP).toBe(vantage.MIN_STEP);
});

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(join(RUN, "beats", "1", "beat.mjs")))("the web locator render", () => {
  it("should name the radii that work when a remove frames no peer", () => {
    expect(render(radii(130, 470, 1200))).toMatch(/frames no peer[\s\S]*radii that work, rising/);
  });

  it("should name the radii that work when two removes frame the same window", () => {
    // voisinage drawing no settlement at 3000 km holds every peer: the europe frame, drawn twice.
    const out = render((b) => radii(500, 1200, 3000)(b).replace(/(key: "voisinage"[^\n]*)places: true/, "$1places: false"));
    expect(out).toMatch(/same window[\s\S]*radii that work, rising/);
  });

  // mvq56: the radii the first refusal offered framed site → region at 1.77x, refused only after the bake.
  it("should name the radii that work, before the bake, when a step out is under twice as wide", () => {
    expect(render(radii(500, 1200, 2500))).toMatch(/widens the frame by [\d.]+x[\s\S]*radii that work, rising/);
  });

  it("should offer a ladder the render then takes past every radius check", () => {
    const hint = render(radii(500, 1200, 3000));
    const offered = Object.fromEntries([...hint.matchAll(/(\w+) (\d+)(?= ·| \()/g)].map((m) => [m[1], m[2]]));
    const dropped = hint.match(/drop remove (\w+)/)?.[1];
    const out = render((b) => {
      let next = dropped ? b.replace(new RegExp(`\\n[^\\n]*\\{ key: "${dropped}"[^\\n]*`), "") : b;
      if (/places: false on every remove/.test(hint)) next = next.replace(/places: true/g, "places: false");
      return next.replace(/\{ key: "(\w+)"([^\n]*?)radius: \d+/g, (all, key, mid) => (offered[key] ? `{ key: "${key}"${mid}radius: ${offered[key]}` : all));
    });
    expect(out).toContain("baking the");
  });
});
