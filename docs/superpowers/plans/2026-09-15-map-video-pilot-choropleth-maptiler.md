# Map video pilot — the choropleth on the live MapTiler map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `proof/video-choropleth-europe-lowcarbon` on a live MapTiler map driven frame by frame, exactly as the validated scrolly pilot drives its map with the scroll, keeping the validated choreography.

**Architecture:** The choropleth's map plan (MapTiler dataviz style, flat Web Mercator, Countries fills beneath the basemap's water, names as symbol layers) is copied from the scrolly pilot. `sceneAt(frame)` produces a state in numbers (camera `camX/camY/camZoom` + bound paint fields); the Remotion composition mounts the map once with the existing `useLiveMap` and, each frame, `jumpTo`s the camera and sets the bound paints, holding the frame until the map is idle with every tile loaded. Words outside the map (title card, key, close-up labels and gauges, credit) stay SVG, placed in Bun from positions and pixel colours a measurement pass records once per fixed camera. The MapTiler key reaches the map only through the existing local proxy, which gains a keyless tile cache.

**Tech Stack:** Bun, TypeScript/ESM, bun:test, Remotion 4.0.507 (`--gl=swangle`), maplibre-gl 5.24.0, puppeteer-core 24.43.1, MapTiler Cloud (dataviz style, Countries tileset).

**Spec:** `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md` (commit 11bd6a58).

**Rulings made while planning (against the spec's letter):**
- Ruling: render with `--gl=swangle`, not `--gl=angle` — the tree's existing live-map renderer (`render-video-map.mjs`, `live-map.ts`) measured swangle pixel-identical and deterministic, angle noisy between runs — cost if wrong: slower renders.
- Ruling: copy only `scrolly.mjs` and `mount.mjs` (plus the beat's `plan.mjs` and `seats.json`); `style.mjs`, `plan.mjs` and `tints.mjs` are already identical in length and exports on both branches, and `scrolly-live.mjs`/`inline.mjs` drive a two-map page a video does not have — `useLiveMap` is the video's runtime — cost if wrong: a later copy when a type needs them.
- Ruling: the existing proxy (`skills/map-beat/scripts/maptiler-proxy.mjs`) and `useLiveMap` are extended rather than rewritten. The scrolly pilot it follows: branch `quality/scrolly`, `proof/scrolly-choropleth-europe-lowcarbon` (commits a170beb3..fdec7bbd).

## Global Constraints

- Bun, always — never npm, never node. Tests are `bun test <targeted paths>`, never the whole suite.
- The MapTiler key is never in a page, props file, argv, log, committed file, cache file or bundle. It is read with `mapTilerKeyIn(process.env)` (`#shared/map-beat/glyphs.mjs`) from the worktree's git-ignored `.env` (`set -a && . ./.env`), and handed only to `startMapTilerProxy`.
- Every Remotion spawn carries an empty `--env-file`; map videos render with `--gl=swangle --concurrency=1` (`skills/map-beat/scripts/render-video-map.mjs`).
- Explicit pathspec on every `git add` and `git commit` (zsh arrays: `F=(...)`, `"${F[@]}"`); never `-A`, never bare; never `git stash`.
- No mention of Claude or Anthropic in commits, code or comments; no session trailer in commit messages (grep the message after each commit).
- The no-break space is written as the `\u00A0` escape in code; check with `grep -nP '\x{00A0}'`.
- Code and comments in English. Mutation verification is mandatory for every new test.
- A skill asset may not import out of its own skill (`skills/splash/test/no-cross-skill-imports.test.ts`): `useLiveMap` receives `mount` and `transform` as arguments.
- A bound paint may not read feature data (`validateScrollyPlan`); one layer per class.
- The projection is flat Web Mercator; a close-up is centred on its subject on both axes, no `padding`.
- Every word at 30 px or more at 1920 × 1080, SVG words (`assertTypeFloor`) and in-map symbol words (`text-size`) alike.
- The credit is one line and carries MapTiler's attribution: « © MapTiler © OpenStreetMap ».
- The choreography of `proof/video-choropleth-europe-lowcarbon/BRIEF.md` (commit bbdc4822) is kept: classes arrive lowest first, the floor rises with the count stepping 40 → 7, the six named, the close-up on Albania with gauges counting up, the pull back to the whole map. ~19 s, a 60-frame hold.
- Open only the mp4s for the owner's review.

---

## File map

| file | responsibility | task |
| --- | --- | --- |
| `shared/map-beat/scrolly.mjs` | copied: camera in Mercator numbers, `bindState`, `validateScrollyPlan` | 1 |
| `shared/map-beat/mount.mjs` | replaced by the scrolly copy: `beneath: "water"`, vector `sourceLayer` | 1 |
| `skills/splash/assets/root-template/shared/map-beat/mount.mjs` | the root template's twin of `mount.mjs`, kept identical | 1 |
| `shared/map-beat/COPIED-FROM.json` | manifest: each copied file's origin commit and sha256 | 1 |
| `skills/map-beat/test/copied-from-scrolly.test.ts` | refuses a copy that drifted from its manifest | 1 |
| `package.json`, `bun.lock` | maplibre-gl 4.7.1 → 5.24.0 | 1 |
| `skills/map-beat/scripts/maptiler-proxy.mjs` | + keyless on-disk cache (`cacheDir`) | 2 |
| `skills/map-beat/test/maptiler-proxy.test.ts` | + cache tests | 2 |
| `skills/map-beat/assets/live-map.ts` | + a boot view (`camera.view`), + every tile loaded before a frame is released | 3 |
| `skills/map-beat/test/live-map-camera.test.ts` | the boot view helper | 3 |
| `skills/map-beat/scripts/render-video-map.mjs` | + `frame` for a still at any frame, + `cacheDir` passed to the proxy | 3 |
| `skills/map-beat/scripts/measure-live-map.mjs` | the measurement pass: projected seats, tiles loaded, a colour grid per fixed camera | 4 |
| `skills/map-beat/test/measure-live-map.live.test.ts` | the pass against the real map (key required) | 4 |
| `proof/video-choropleth-europe-lowcarbon/plan.mjs` | copied from the scrolly pilot: `choroplethPlan` | 5 |
| `proof/video-choropleth-europe-lowcarbon/seats.json` | copied from the scrolly pilot | 5 |
| `proof/video-choropleth-europe-lowcarbon/map-plan.mjs` | the video's plan arguments: cameras, fonts, colours → `choroplethPlan` | 5 |
| `proof/video-choropleth-europe-lowcarbon/map-plan.test.ts` | plan validity, the floor on in-map words | 5 |
| `proof/video-choropleth-europe-lowcarbon/scene.mjs` | camera fields per frame replace the viewBox; `mapStateAt` | 6 |
| `proof/video-choropleth-europe-lowcarbon/scene.test.ts` | camera per frame, bound fields per frame | 6 |
| `proof/video-choropleth-europe-lowcarbon/measure.mjs` | runs the measurement pass, writes `measured.json` | 7 |
| `proof/video-choropleth-europe-lowcarbon/measured.json` | keyless measurement, committed | 7 |
| `proof/video-choropleth-europe-lowcarbon/build.mjs` | the SVG overlay placed from `measured.json`; no Natural Earth geometry | 8 |
| `proof/video-choropleth-europe-lowcarbon/ChoroplethFrame.tsx` | the live map under the SVG overlay | 8 |
| `proof/video-choropleth-europe-lowcarbon/DirectedChoroplethVideo.tsx` | hands `mount`, `transform`, the proxied style URL | 8 |
| `proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs` | proxy, measurement check, still/look/mp4 through `renderVideoMap` | 9 |
| `proof/video-choropleth-europe-lowcarbon/no-key.live.test.ts` | no key in any output of a render | 9 |
| `proof/video-choropleth-europe-lowcarbon/BRIEF.md`, `skills/map-beat/references/types/choropleth.md`, `docs/design-base/CATALOGUE.md` | the pilot recorded | 10 |

Tests to delete with the SVG geometry: `geometry.test.ts`, and the parts of `anatomy.test.ts` and `layout.test.ts` that read Natural Earth rings (Task 8 says which).

---

### Task 1: Copy the scrolly map engine

**Files:**
- Create: `shared/map-beat/scrolly.mjs`, `shared/map-beat/COPIED-FROM.json`, `skills/map-beat/test/copied-from-scrolly.test.ts`
- Replace: `shared/map-beat/mount.mjs`, `skills/splash/assets/root-template/shared/map-beat/mount.mjs`
- Modify: `package.json` (`maplibre-gl`), `bun.lock`

**Interfaces:**
- Produces: `#shared/map-beat/scrolly.mjs` exports `mercatorOf([lon,lat]) → [x,y]`, `lonLatOf([x,y]) → [lon,lat]`, `cameraFields({center, zoom, bearing?, pitch?}) → {camX, camY, camZoom, camBearing, camPitch}`, `viewOf(state) → {center, zoom, bearing, pitch}`, `bindState(value, state)`, `stateFieldsIn(value)`, `validateScrollyPlan(plan, states) → string[]`. `#shared/map-beat/mount.mjs` gains `beforeIdFor(map, layer)` and layers with `beneath: "water"` and `sourceLayer`.

- [ ] **Step 1: Write the failing copy test**

```ts
// skills/map-beat/test/copied-from-scrolly.test.ts
import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The map engine is COPIED from the validated scrolly pilot (branch quality/scrolly), not merged
 * (owner, 2026-09-15). A copy that drifts from the file it was copied from is a fork nobody decided:
 * every copied file's sha256 is pinned in the manifest beside the commit it came from.
 */

const ROOT = join(import.meta.dir, "../../..");
const manifest = JSON.parse(readFileSync(join(ROOT, "shared/map-beat/COPIED-FROM.json"), "utf8"));

describe("the map engine copied from quality/scrolly", () => {
  it("should name its origin commit and at least the camera module and the mount", () => {
    expect(manifest.commit).toMatch(/^[0-9a-f]{8,40}$/);
    expect(Object.keys(manifest.files)).toEqual(expect.arrayContaining(["shared/map-beat/scrolly.mjs", "shared/map-beat/mount.mjs"]));
  });

  for (const [path, sha256] of Object.entries(manifest.files as Record<string, string>))
    it(`should keep ${path} byte-identical to the copied file`, () => {
      expect(createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex")).toBe(sha256);
    });

  it("should keep the root template's mount identical to the trunk's", () => {
    expect(readFileSync(join(ROOT, "skills/splash/assets/root-template/shared/map-beat/mount.mjs"), "utf8")).toBe(readFileSync(join(ROOT, "shared/map-beat/mount.mjs"), "utf8"));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test skills/map-beat/test/copied-from-scrolly.test.ts`
Expected: FAIL — `ENOENT … COPIED-FROM.json`.

- [ ] **Step 3: Copy the files and write the manifest**

```bash
C=fdec7bbd
git show $C:shared/map-beat/scrolly.mjs > shared/map-beat/scrolly.mjs
git show $C:shared/map-beat/mount.mjs > shared/map-beat/mount.mjs
cp shared/map-beat/mount.mjs skills/splash/assets/root-template/shared/map-beat/mount.mjs
bun -e '
const { createHash } = require("node:crypto"); const { readFileSync, writeFileSync } = require("node:fs");
const files = ["shared/map-beat/scrolly.mjs", "shared/map-beat/mount.mjs"];
writeFileSync("shared/map-beat/COPIED-FROM.json", JSON.stringify({ branch: "quality/scrolly", commit: "fdec7bbd", files: Object.fromEntries(files.map((f) => [f, createHash("sha256").update(readFileSync(f)).digest("hex")])) }, null, 2) + "\n");'
```

Then set `"maplibre-gl": "5.24.0"` in `package.json` and run `bun install`.

- [ ] **Step 4: Run the copy test and every test that reads the mount**

Run: `bun test skills/map-beat/test/copied-from-scrolly.test.ts skills/map-beat/test skills/splash/test/carried-copies.test.ts skills/splash/test/no-cross-skill-imports.test.ts proof/static-choropleth-europe-lowcarbon`
Expected: PASS. A test that fails because it expected the old mount's behaviour is read, not weakened: if the scrolly mount changed a contract the static beat relies on, stop and report it.

- [ ] **Step 5: Mutation-verify the copy test**

Append a blank line to `shared/map-beat/scrolly.mjs`, run the test (expect one FAIL), restore with `git show fdec7bbd:shared/map-beat/scrolly.mjs > shared/map-beat/scrolly.mjs`.

- [ ] **Step 6: Commit**

```bash
F=(shared/map-beat/scrolly.mjs shared/map-beat/mount.mjs shared/map-beat/COPIED-FROM.json skills/splash/assets/root-template/shared/map-beat/mount.mjs skills/map-beat/test/copied-from-scrolly.test.ts package.json bun.lock)
git add -- "${F[@]}" && git commit -m "feat(map-beat): the scrolly pilot's map engine copied — camera in Mercator numbers, layers beneath the basemap's water; maplibre-gl 5.24.0" -- "${F[@]}"
```

---

### Task 2: A keyless tile cache in the proxy

**Files:**
- Modify: `skills/map-beat/scripts/maptiler-proxy.mjs`
- Test: `skills/map-beat/test/maptiler-proxy.test.ts`

**Interfaces:**
- Consumes: `startMapTilerProxy({ key, upstreamBase })`, `stripKey(text, key, proxyOrigin)` (existing).
- Produces: `startMapTilerProxy({ key, upstreamBase?, cacheDir? }) → { origin, stop(), counts }`; with `cacheDir`, a response is served from disk when present (`counts["cache hit"]`), and every body written is keyless. Text bodies are stored with the proxy's origin replaced by `__PROXY_ORIGIN__` and re-substituted when served. `export const DEFAULT_CACHE_DIR = join(homedir(), ".cache", "splash-maptiler")`.

- [ ] **Step 1: Write the failing tests** (in the existing file, beside its fixture-upstream tests; read how they start a fixture upstream and reuse that helper)

```ts
describe("the proxy's tile cache", () => {
  it("should answer a second identical request from disk without reaching the upstream", async () => {
    const upstream = fixtureUpstream({ "/tiles/countries/1/1/1.pbf": new Uint8Array([1, 2, 3]) });
    const cacheDir = mkdtempSync(join(tmpdir(), "proxy-cache-"));
    const proxy = startMapTilerProxy({ key: "SECRET123", upstreamBase: upstream.origin, cacheDir });
    try {
      for (let i = 0; i < 2; i++) expect(new Uint8Array(await (await fetch(`${proxy.origin}/maptiler/tiles/countries/1/1/1.pbf`)).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
      expect(upstream.hits).toBe(1);
      expect(proxy.counts["cache hit"]).toBe(1);
    } finally {
      proxy.stop();
      upstream.stop();
    }
  });

  it("should never write the key into a cached file, and serve a cached style at a new proxy's origin", async () => {
    const upstream = fixtureUpstream({ "/maps/dataviz/style.json": JSON.stringify({ glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=SECRET123" }) });
    const cacheDir = mkdtempSync(join(tmpdir(), "proxy-cache-"));
    const first = startMapTilerProxy({ key: "SECRET123", upstreamBase: upstream.origin, cacheDir });
    await (await fetch(`${first.origin}/maptiler/maps/dataviz/style.json`)).text();
    first.stop();
    for (const f of readdirSync(cacheDir)) expect(readFileSync(join(cacheDir, f), "latin1")).not.toContain("SECRET123");
    const second = startMapTilerProxy({ key: "SECRET123", upstreamBase: upstream.origin, cacheDir });
    try {
      const doc = await (await fetch(`${second.origin}/maptiler/maps/dataviz/style.json`)).json();
      expect(doc.glyphs).toBe(`${second.origin}/maptiler/fonts/{fontstack}/{range}.pbf`);
      expect(upstream.hits).toBe(1);
    } finally {
      second.stop();
      upstream.stop();
    }
  });

  it("should not cache an upstream error", async () => {
    const upstream = fixtureUpstream({}, 503);
    const cacheDir = mkdtempSync(join(tmpdir(), "proxy-cache-"));
    const proxy = startMapTilerProxy({ key: "SECRET123", upstreamBase: upstream.origin, cacheDir });
    try {
      await fetch(`${proxy.origin}/maptiler/tiles/x.pbf`);
      expect(readdirSync(cacheDir)).toEqual([]);
    } finally {
      proxy.stop();
      upstream.stop();
    }
  });
});
```

If the test file has no `fixtureUpstream`, add it at the top of the file:

```ts
function fixtureUpstream(bodies: Record<string, string | Uint8Array>, status = 200) {
  let hits = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      hits++;
      const body = bodies[new URL(req.url).pathname];
      if (body === undefined || status !== 200) return new Response("no", { status: status === 200 ? 404 : status });
      return new Response(body, { headers: { "content-type": typeof body === "string" ? "application/json" : "application/x-protobuf" } });
    },
  });
  return { origin: `http://127.0.0.1:${server.port}`, stop: () => server.stop(true), get hits() { return hits; } };
}
```

- [ ] **Step 2: Run them to see them fail**

Run: `bun test skills/map-beat/test/maptiler-proxy.test.ts`
Expected: the three new tests FAIL (`upstream.hits` is 2; the cache dir is empty).

- [ ] **Step 3: Implement the cache**

In `maptiler-proxy.mjs`, add:

```js
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Outside every worktree: a cache is reusable across beats and never a candidate for `git add`. */
export const DEFAULT_CACHE_DIR = join(homedir(), ".cache", "splash-maptiler");
const ORIGIN_TOKEN = "__PROXY_ORIGIN__";

/** A cached response's file stem: the path and the query WITHOUT the key, hashed — the name carries no key. */
function cacheStemFor(requestUrl) {
  const params = [...requestUrl.searchParams].filter(([k]) => k !== "key").sort(([a], [b]) => a.localeCompare(b));
  return createHash("sha256").update(`${requestUrl.pathname}?${new URLSearchParams(params)}`).digest("hex");
}
```

and in `fetch(req)`, before the upstream fetch:

```js
const stem = cacheDir ? join(cacheDir, cacheStemFor(url)) : null;
if (stem && existsSync(`${stem}.meta`)) {
  counts["cache hit"] = (counts["cache hit"] ?? 0) + 1;
  const { contentType, binary } = JSON.parse(readFileSync(`${stem}.meta`, "utf8"));
  const headers = { ...CORS_HEADERS, "content-type": contentType };
  const body = readFileSync(`${stem}.body`);
  return new Response(binary ? body : body.toString("utf8").replaceAll(ORIGIN_TOKEN, origin), { status: 200, headers });
}
```

and after a 200 upstream response, write it (binary as bytes; text AFTER `stripKey`, with `origin` replaced by `ORIGIN_TOKEN`):

```js
if (stem && res.status === 200) {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(`${stem}.body`, binary ? new Uint8Array(bytes) : text.replaceAll(origin, ORIGIN_TOKEN));
  writeFileSync(`${stem}.meta`, JSON.stringify({ contentType, binary }));
}
```

(restructure the two branches so `bytes`/`text` are read once and reused for both the cache and the response; `cacheDir` joins the destructured options).

- [ ] **Step 4: Run the proxy tests**

Run: `bun test skills/map-beat/test/maptiler-proxy.test.ts`
Expected: PASS, the existing tests included.

- [ ] **Step 5: Mutation-verify** — (a) skip the cache read (`existsSync` → `false`): the first test fails; (b) write `text` without `stripKey` output (write the raw upstream text): the key test fails; (c) drop the `res.status === 200` guard: the error test fails. Restore after each.

- [ ] **Step 6: Commit**

```bash
F=(skills/map-beat/scripts/maptiler-proxy.mjs skills/map-beat/test/maptiler-proxy.test.ts)
git add -- "${F[@]}" && git commit -m "feat(map-beat): the MapTiler proxy keeps a keyless tile cache outside the repository" -- "${F[@]}"
```

---

### Task 3: A moving camera in `useLiveMap`, stills at any frame

**Files:**
- Modify: `skills/map-beat/assets/live-map.ts`, `skills/map-beat/scripts/render-video-map.mjs`
- Create: `skills/map-beat/test/live-map-camera.test.ts`

**Interfaces:**
- Consumes: Task 2's `cacheDir`.
- Produces:
  - `export function bootOptionsOf(plan: LiveMapPlan): { center: [number, number]; zoom: number } | { bounds: LngLatBoundsLike; fitBoundsOptions: { padding: 0; animate: false } }` — `plan.camera.view` (`{center, zoom}`) wins over `plan.camera.bounds`; neither throws.
  - `export async function settleFrame(map, { attempts = 5 } = {})` — waits `idle`, and while `!map.areTilesLoaded()` waits `idle` again up to `attempts`, then throws `a frame was released with a tile still loading`.
  - `renderVideoMap({ …, frame?: number, cacheDir?: string })`: `mode: "still"` renders `--frame=${frame ?? -1}`; `cacheDir` is passed to `startMapTilerProxy`.

- [ ] **Step 1: Write the failing test**

```ts
// skills/map-beat/test/live-map-camera.test.ts
import { describe, expect, it } from "bun:test";
import { bootOptionsOf, settleFrame } from "../assets/live-map.ts";

describe("bootOptionsOf", () => {
  it("should boot a moving-camera plan at its first view", () => {
    expect(bootOptionsOf({ camera: { view: { center: [10, 50], zoom: 3.2 } } } as any)).toEqual({ center: [10, 50], zoom: 3.2 });
  });
  it("should boot a fixed plan at its bounds, unanimated and unpadded", () => {
    expect(bootOptionsOf({ camera: { bounds: [[0, 0], [1, 1]] } } as any)).toEqual({ bounds: [[0, 0], [1, 1]], fitBoundsOptions: { padding: 0, animate: false } });
  });
  it("should refuse a plan with no camera", () => {
    expect(() => bootOptionsOf({ camera: {} } as any)).toThrow(/camera/);
  });
});

/** A map stand-in with MapLibre's two calls the settle reads; `loaded` lists what areTilesLoaded answers, idle by idle. */
function mapAnswering(loaded: boolean[]) {
  let i = 0;
  return { once: (_: string, fn: () => void) => queueMicrotask(fn), triggerRepaint() {}, areTilesLoaded: () => loaded[Math.min(i++, loaded.length - 1)] };
}

describe("settleFrame", () => {
  it("should wait for idle again until every tile is loaded", async () => {
    const map = mapAnswering([false, false, true]);
    await settleFrame(map as any);
    expect(map.areTilesLoaded()).toBe(true);
  });
  it("should refuse a frame whose tiles never load", async () => {
    await expect(settleFrame(mapAnswering([false]) as any, { attempts: 3 })).rejects.toThrow(/tile still loading/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test skills/map-beat/test/live-map-camera.test.ts`
Expected: FAIL — `bootOptionsOf` is not exported.

- [ ] **Step 3: Implement**

In `live-map.ts`:

```ts
export function bootOptionsOf(plan: LiveMapPlan) {
  const camera = plan.camera as { view?: { center: [number, number]; zoom: number }; bounds?: maplibregl.LngLatBoundsLike };
  if (camera?.view) return { center: camera.view.center, zoom: camera.view.zoom };
  if (camera?.bounds) return { bounds: camera.bounds, fitBoundsOptions: { padding: 0 as const, animate: false as const } };
  throw new Error("a live map plan needs camera.view or camera.bounds");
}

export async function settleFrame(map: Pick<maplibregl.Map, "once" | "triggerRepaint" | "areTilesLoaded">, { attempts = 5 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await new Promise<void>((resolve) => {
      map.once("idle", () => resolve());
      map.triggerRepaint();
    });
    if (map.areTilesLoaded()) return;
  }
  throw new Error("a frame was released with a tile still loading");
}
```

Change `LiveMapPlan.camera` to `{ bounds?: maplibregl.LngLatBoundsLike; view?: { center: [number, number]; zoom: number } }`; in the map constructor replace `bounds`/`fitBoundsOptions` with `...bootOptionsOf(plan)`; replace both `waitIdle(map)` calls with `settleFrame(map)`, the per-frame one ending in `.then(…).catch((err) => cancelRender(sanitizedError(err)))`; after `style.load`, call `map.setProjection({ type: "mercator" })` before `mount(map, plan)`.

In `render-video-map.mjs`: destructure `frame` and `cacheDir`; pass `cacheDir` to `startMapTilerProxy({ key: mapTilerKey, cacheDir })`; build the still args with `` `--frame=${frame ?? -1}` ``.

- [ ] **Step 4: Run the tests**

Run: `bun test skills/map-beat/test/live-map-camera.test.ts skills/map-beat/test skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/a-video-render-hides-the-env.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation-verify** — (a) in `settleFrame`, `return` after the first idle regardless of `areTilesLoaded`: the "wait again" test still passes? It must not — the stand-in returns `false` first, so the refusal test FAILS (it resolves); confirm one fail. (b) Make `view` lose to `bounds`: the first test fails. Restore after each.

- [ ] **Step 6: Commit**

```bash
F=(skills/map-beat/assets/live-map.ts skills/map-beat/scripts/render-video-map.mjs skills/map-beat/test/live-map-camera.test.ts)
git add -- "${F[@]}" && git commit -m "feat(map-beat): a live video map boots at a view and moves, and no frame leaves with a tile still loading" -- "${F[@]}"
```

---

### Task 4: The measurement pass

**Files:**
- Create: `skills/map-beat/scripts/measure-live-map.mjs`, `skills/map-beat/test/measure-live-map.live.test.ts`

**Interfaces:**
- Consumes: `startMapTilerProxy({ key, cacheDir })` (Task 2); `mountPlan`, `applyLiveStyle`-free path: the page fetches the style through the proxy and uses `transformStyle` like `useLiveMap`; `viewOf`, `bindState` (Task 1).
- Produces: `export async function measureLiveMap({ plan, states, seats, size, mapTilerKey, cacheDir, cell = 16, tints }) → { [stateName]: { tilesLoaded: boolean, projected: { [seatId]: [x, y] }, grid: { cell, cols, rows, colours: string[] } } }` where `states` is `{ [name]: state }` (a state carries `camX, camY, camZoom` and every bound field), `seats` is `{ [id]: [lon, lat] }`, `size` is `{ width, height }` in CSS px, and `colours[j * cols + i]` is the `#rrggbb` mean of cell `(i, j)` read from the canvas. It launches Chrome itself (`resolveChrome()` from `skills/scrolly/scripts/verify-live-map-scrolly.mjs`'s helper, `--use-angle=swiftshader --enable-unsafe-swiftshader`), serves the page from memory through `page.setContent`, and passes the proxied style URL and plan through `page.evaluate` — the key never enters the page.

- [ ] **Step 1: Write the failing live test**

```ts
// skills/map-beat/test/measure-live-map.live.test.ts
import { describe, expect, it } from "bun:test";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";
import { measureLiveMap } from "../scripts/measure-live-map.mjs";

/** Against the real map: needs the worktree's .env (set -a && . ./.env). A key-less run fails loudly, never skips. */
const key = mapTilerKeyIn(process.env);

describe("measureLiveMap on the real MapTiler dataviz style", () => {
  it("should project a seat where MapLibre draws it, load every tile, and read the sea at mid-Atlantic", async () => {
    if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
    const plan = { styleUrl: "https://api.maptiler.com/maps/dataviz/style.json?key=__MAPTILER" + "_KEY__", projection: "mercator", layers: [] };
    const state = cameraFields({ center: [10, 50], zoom: 3 });
    const out = await measureLiveMap({ plan, states: { whole: state }, seats: { centre: [10, 50], atlantic: [-30, 45] }, size: { width: 960, height: 540 }, mapTilerKey: key, tints: null });
    expect(out.whole.tilesLoaded).toBe(true);
    const [cx, cy] = out.whole.projected.centre;
    expect(Math.abs(cx - 480)).toBeLessThan(1);
    expect(Math.abs(cy - 270)).toBeLessThan(1);
    const { cell, cols, colours } = out.whole.grid;
    const [ax, ay] = out.whole.projected.atlantic;
    const sea = colours[Math.floor(ay / cell) * cols + Math.floor(ax / cell)];
    const land = colours[Math.floor(cy / cell) * cols + Math.floor(cx / cell)];
    expect(sea).toMatch(/^#[0-9a-f]{6}$/);
    expect(sea).not.toBe(land);
  }, 120_000);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `set -a && . ./.env && set +a && bun test skills/map-beat/test/measure-live-map.live.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// skills/map-beat/scripts/measure-live-map.mjs
//
// WHAT A LIVE MAP DRAWS AT EACH FIXED CAMERA, MEASURED ONCE AND FROZEN. A video's words outside the map
// (a gauge, a label, the credit) are placed in Bun, where they are tested offline; they need to know where
// MapLibre puts a seat and what colour it paints under a box. So each fixed camera of a beat is mounted on
// the real map at the video's size, settled with every tile loaded, and read back: the projected seats and
// a grid of mean cell colours. The key stays in this process: the page reaches MapTiler through the proxy.

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { startMapTilerProxy, DEFAULT_CACHE_DIR } from "./maptiler-proxy.mjs";
import { resolveChrome } from "../../scrolly/scripts/resolve-chrome.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const TRUNK = ["scrolly.mjs", "mount.mjs", "style.mjs"];
const PLACEHOLDER = "__MAPTILER" + "_KEY__";

async function trunkScript() {
  const parts = [];
  for (const file of TRUNK) {
    const text = await readFile(join(HERE, "../../../shared/map-beat", file), "utf8");
    parts.push(text.split("\n").filter((l) => !/^\s*import\s/.test(l)).join("\n").replace(/^export\s+/gm, ""));
  }
  return parts.join("\n");
}

/** A plan's MapTiler URLs pointed at the proxy, the key placeholder dropped. */
export function throughProxy(value, origin) {
  return JSON.parse(JSON.stringify(value).replaceAll("https://api.maptiler.com/", `${origin}/maptiler/`).replaceAll(`?key=${PLACEHOLDER}&`, "?").replaceAll(`?key=${PLACEHOLDER}`, "").replaceAll(`&key=${PLACEHOLDER}`, ""));
}

export async function measureLiveMap({ plan, states, seats, size, mapTilerKey, cacheDir = DEFAULT_CACHE_DIR, cell = 16, tints }) {
  if (!mapTilerKey) throw new Error("measureLiveMap needs the MapTiler key, read by the caller from the environment");
  const proxy = startMapTilerProxy({ key: mapTilerKey, cacheDir });
  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: 1 });
    const maplibre = await readFile(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
    await page.setContent(`<!doctype html><html><head><style>html,body,#map{margin:0;width:${size.width}px;height:${size.height}px}</style></head><body><div id="map"></div><script>${maplibre}</script><script>${await trunkScript()}</script></body></html>`);
    const proxied = throughProxy(plan, proxy.origin);
    const out = {};
    for (const [name, state] of Object.entries(states)) {
      out[name] = await page.evaluate(
        async ({ proxied, state, seats, cell, tints, first }) => {
          if (first) {
            const doc = await (await fetch(proxied.styleUrl)).json();
            const style = tints ? transformStyle(doc, { tints, glyphs: doc.glyphs, keepLabels: [] }) : doc;
            style.transition = { duration: 0, delay: 0 };
            window.__map = new maplibregl.Map({ container: "map", style, ...viewOf(state), interactive: false, attributionControl: false, fadeDuration: 0, canvasContextAttributes: { preserveDrawingBuffer: true } });
            await new Promise((r) => window.__map.once("style.load", r));
            window.__map.setProjection({ type: proxied.projection || "mercator" });
            mountPlan(window.__map, proxied);
          }
          const map = window.__map;
          map.jumpTo(viewOf(state));
          for (const layer of proxied.layers) for (const p in layer.bindings || {}) map.setPaintProperty(layer.id, p, bindState(layer.bindings[p], state), { validate: false });
          let tilesLoaded = false;
          for (let i = 0; i < 8 && !tilesLoaded; i++) {
            await new Promise((r) => { map.once("idle", r); map.triggerRepaint(); });
            tilesLoaded = map.areTilesLoaded();
          }
          const projected = Object.fromEntries(Object.entries(seats).map(([id, ll]) => { const p = map.project(ll); return [id, [p.x, p.y]]; }));
          const gl = map.getCanvas().getContext("webgl2") || map.getCanvas().getContext("webgl");
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const cols = Math.floor(w / cell), rows = Math.floor(h / cell);
          const colours = [];
          for (let j = 0; j < rows; j++)
            for (let i = 0; i < cols; i++) {
              let r = 0, g = 0, b = 0, n = 0;
              for (let y = j * cell; y < (j + 1) * cell; y += 2)
                for (let x = i * cell; x < (i + 1) * cell; x += 2) {
                  const k = ((h - 1 - y) * w + x) * 4; // readPixels starts at the bottom row
                  r += px[k]; g += px[k + 1]; b += px[k + 2]; n++;
                }
              const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
              colours.push(`#${hex(r)}${hex(g)}${hex(b)}`);
            }
          return { tilesLoaded, projected, grid: { cell, cols, rows, colours } };
        },
        { proxied, state, seats, cell, tints, first: Object.keys(out).length === 0 },
      );
    }
    return out;
  } finally {
    await browser.close();
    proxy.stop();
  }
}
```

If `skills/scrolly/scripts/resolve-chrome.mjs` does not exist in this worktree, copy `resolveChrome` from `skills/scrolly/scripts/verify-live-map-scrolly.mjs` on `quality/scrolly` into `skills/map-beat/scripts/resolve-chrome.mjs` (same body) and import it from there — a skill script may not import out of its own skill.

- [ ] **Step 4: Run the live test**

Run: `set -a && . ./.env && set +a && bun test skills/map-beat/test/measure-live-map.live.test.ts`
Expected: PASS. Never print the environment or the proxy's counts with a query string.

- [ ] **Step 5: Mutation-verify** — (a) flip the `readPixels` row (`k = (y * w + x) * 4`): the sea/land cells swap or collapse, and the test must fail (if sea ≠ land still holds, add `expect(land).not.toBe(sea)` on two more seats until the flip fails); (b) skip `jumpTo`: the centre test fails. Restore after each.

- [ ] **Step 6: Commit**

```bash
F=(skills/map-beat/scripts/measure-live-map.mjs skills/map-beat/test/measure-live-map.live.test.ts)
git add -- "${F[@]}" && git commit -m "feat(map-beat): a measurement pass reads a live map's projected seats and cell colours at each fixed camera, through the proxy" -- "${F[@]}"
```

(add `skills/map-beat/scripts/resolve-chrome.mjs` to `F` if it was created)

---

### Task 5: The choropleth's map plan

**Files:**
- Create: `proof/video-choropleth-europe-lowcarbon/plan.mjs` (copy), `proof/video-choropleth-europe-lowcarbon/seats.json` (copy), `proof/video-choropleth-europe-lowcarbon/map-plan.mjs`, `proof/video-choropleth-europe-lowcarbon/map-plan.test.ts`
- Modify: `shared/map-beat/COPIED-FROM.json` (add the two copies)

**Interfaces:**
- Consumes: `choroplethPlan(args)` (copied), `cameraFields` (Task 1), `maptilerFace(register)` and `assertNotFallback` (`#shared/map-beat/glyphs.mjs`), `plateTints`, `rampFor` and `loadSubject` (`../static-choropleth-europe-lowcarbon/beat.mjs`), the video registers (`videoRegistersOf`).
- Produces:
  - `export const REFERENCE = { width: 1920, height: 1080 }`
  - `export function camerasOf(subject) → { whole: CameraFields, closeUp: CameraFields }` — `whole` is the static plate's fit (the pilot runner's `WHOLE_ZOOM`/`WHOLE_CENTER` arithmetic, lines 176–186 of `render-directions-scrolly.mjs` at fdec7bbd) scaled to `REFERENCE`; `closeUp` is centred on Albania's seat at `whole.camZoom + 2.3`.
  - `export function mapPlanFor({ direction, registers, subject, cameras }) → plan` — `choroplethPlan` with the video's colours and faces, plus `camera: { view: viewOf(cameras.whole) }`, `referenceWidth/Height: REFERENCE`, the credit-free style (no in-map water names at the close-up), text sizes from the video's `axis` and `annot` registers.
  - `export const MAP_FIELDS = ["classes", "filter", "top", "zoom", "odd"]` — the bound state fields.

- [ ] **Step 1: Copy the pilot's plan and seats, extend the manifest**

```bash
git show fdec7bbd:proof/scrolly-choropleth-europe-lowcarbon/plan.mjs > proof/video-choropleth-europe-lowcarbon/plan.mjs
git show fdec7bbd:proof/scrolly-choropleth-europe-lowcarbon/seats.json > proof/video-choropleth-europe-lowcarbon/seats.json
```

Add both paths and their sha256 to `shared/map-beat/COPIED-FROM.json` (same `bun -e` as Task 1, the file list extended).

- [ ] **Step 2: Write the failing test**

```ts
// proof/video-choropleth-europe-lowcarbon/map-plan.test.ts
import { describe, expect, it } from "bun:test";
import { validatePlan } from "#shared/map-beat/plan.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan, viewOf } from "#shared/map-beat/scrolly.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { camerasOf, MAP_FIELDS } from "./map-plan.mjs";
import { mapStateAt } from "./scene.mjs";

const beat = loadBeat();

describe("the choropleth video's cameras", () => {
  it("should centre the close-up on Albania's seat, 2.3 zoom levels in from the whole map", () => {
    const { whole, closeUp } = camerasOf(beat.subject);
    const [lon, lat] = viewOf(closeUp).center;
    const seat = beat.mapSeats.ALB;
    expect(Math.abs(lon - seat[0])).toBeLessThan(1e-6);
    expect(Math.abs(lat - seat[1])).toBeLessThan(1e-6);
    expect(closeUp.camZoom - whole.camZoom).toBeCloseTo(2.3, 9);
  });
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  describe(`${id}'s map plan`, () => {
    it("should be renderable: no data-driven binding, every frame's state carrying a camera and every bound field", () => {
      const T = props.timing;
      const states = Array.from({ length: Math.ceil(T.total / 15) }, (_, i) => mapStateAt(props, i * 15));
      expect([...validateScrollyPlan(props.mapPlan, states), ...validateExpressions(props.mapPlan)]).toEqual([]);
      for (const s of states) for (const f of MAP_FIELDS) expect(typeof s[f]).toBe("number");
    });

    it("should draw the regions' borders only as the close-up arrives, beneath the water", () => {
      const regions = props.mapPlan.layers.find((l: any) => l.id === "regions");
      expect([regions.type, regions.beneath, JSON.stringify(regions.filter)]).toEqual(["line", "water", JSON.stringify(["==", ["get", "level"], 1])]);
      expect(JSON.stringify(regions.bindings["line-opacity"])).toContain('"$state":"zoom"');
    });

    it("should draw every in-map word at 30 px or more", () => {
      for (const layer of props.mapPlan.layers.filter((l: any) => l.type === "symbol")) expect([layer.id, layer.layout["text-size"] >= 30]).toEqual([layer.id, true]);
    });

    it("should carry no key and point at MapTiler through the placeholder only", () => {
      const text = JSON.stringify(props.mapPlan);
      expect(text).toContain("__MAPTILER" + "_KEY__");
      expect(text).not.toMatch(/key=[A-Za-z0-9]{16,}/);
    });
  });
}
```

(`beat.mapSeats` is added in Task 8's `loadBeat`; until then this test fails for that reason too.)

- [ ] **Step 3: Run to see it fail**

Run: `bun test proof/video-choropleth-europe-lowcarbon/map-plan.test.ts`
Expected: FAIL — `map-plan.mjs` not found.

- [ ] **Step 4: Implement `map-plan.mjs`**

```js
// THE CHOROPLETH VIDEO AS A MAP PLAN — the scrolly pilot's own plan (`plan.mjs`, copied), given the video's
// cameras, colours and faces. The frame drives it as the scroll drives the pilot: a camera in Mercator numbers
// and the bound fields `classes`, `filter`, `top`, `zoom`, `odd` (`scene.mjs`, `mapStateAt`).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adjustToContrast, mix, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { cameraFields, viewOf } from "#shared/map-beat/scrolly.mjs";
import { plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { BEAT } from "../static-choropleth-europe-lowcarbon/bake.mjs";
import { arrived, choroplethPlan, ISO, LAYER, LEVEL } from "./plan.mjs";

export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
export const MAP_FIELDS = Object.freeze(["classes", "filter", "top", "zoom", "odd"]);
/** The static plate's frame the whole-map camera fits (`geometry.mjs`'s FRAME). */
const FRAME = { width: 1000, height: 760 };
const CLOSE_UP_ZOOM = 2.3;

export const SEATS = JSON.parse(readFileSync(join(import.meta.dir, "seats.json"), "utf8")).seats;

const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const latOfWorldY = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) * 180) / Math.PI - 90;

export function camerasOf(subject) {
  const [[west, south], [east, north]] = BEAT.bounds;
  const frameWorldPx = Math.min(FRAME.width / (worldX(east) - worldX(west)), FRAME.height / (worldY(south) - worldY(north)));
  // THE STATIC PLATE'S FIT, at the video's size: its bounds fitted into its frame, that frame scaled to fill the
  // reference stage's width, centred on the bounds' Mercator middle — the pilot runner's own arithmetic.
  const zoom = Math.log2((frameWorldPx * (REFERENCE.width / FRAME.width)) / 512);
  const center = [(west + east) / 2, latOfWorldY((worldY(south) + worldY(north)) / 2)];
  return { whole: cameraFields({ center, zoom }), closeUp: cameraFields({ center: SEATS[subject.ODD_ONE], zoom: zoom + CLOSE_UP_ZOOM }), frameWorldPx };
}

export function mapPlanFor({ direction, registers, subject, cameras, iso2Of, words }) {
  const { ink, grid } = deriveFurniture(direction.ground);
  const tints = plateTints(direction);
  const classCount = subject.BREAKS.length + 1;
  const low = mix(direction.accent, direction.ground, 0.88);
  const high = mix(direction.accent, ink, 0.3);
  const classFills = Array.from({ length: classCount }, (_, i) => mix(low, high, i / (classCount - 1)));
  const trackingEm = (r) => Number.parseFloat(r.letterSpacing ?? "0") / Number.parseFloat(r.fontSize);
  const shares = Object.fromEntries([...subject.studySet].map((iso) => [iso2Of(iso), subject.value.get(iso)?.lowCarbon ?? null]));
  const plan = choroplethPlan({
    tints: { water: tints.water, land: tints.land },
    classFills,
    missingFill: mix(direction.ground, ink, 0.13),
    border: { studied: grid, other: mix(tints.land, grid, 0.4), width: direction.stroke?.hairline ?? 0.6 },
    shares,
    breaks: subject.BREAKS,
    top: subject.above.map((r) => iso2Of(r.iso)),
    odd: words.odd,
    neighbours: [],
    missing: subject.unreported.map((u) => ({ iso2: iso2Of(u.iso) })),
    waters: words.waters,
    words: { top: words.top },
    cameras: [cameras.whole, cameras.closeUp],
    statesForCards: [],
    fonts: {
      axis: maptilerFace(registers.feature),
      axisSize: registers.feature.fontSize,
      axisTracking: trackingEm(registers.feature),
      annot: maptilerFace(registers.water),
      annotSize: registers.water.fontSize,
      annotTracking: trackingEm(registers.water),
      ink: adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN) ?? ink,
      accentInk: adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent,
      waterInk: adjustToContrast(WATER_HUE, tints.water, TEXT_CONTRAST_MIN) ?? ink,
      topInk: adjustToContrast(direction.accent, classFills[classCount - 1], 7) ?? deriveFurniture(classFills[classCount - 1]).ink,
      topHalo: classFills[classCount - 1],
    },
    referenceWidth: REFERENCE.width,
    referenceHeight: REFERENCE.height,
    ringDegrees: (22 * 360) / cameras.frameWorldPx,
  });
  // A CAMERA THAT FOCUSES ON A COUNTRY SHOWS ITS REGIONS' BORDERS (the video rule): Countries' level-1 units,
  // secondary to the national border, beneath the water, arriving with the close-up.
  const countries = plan.layers.find((l) => l.id === "borders").source;
  const regions = {
    id: "regions",
    type: "line",
    beneath: "water",
    source: countries,
    sourceLayer: LAYER,
    filter: ["==", ["get", LEVEL], 1],
    paint: { "line-color": grid, "line-width": 0.5 * (direction.stroke?.hairline ?? 0.6), "line-opacity": 0 },
    bindings: { "line-opacity": arrived },
  };
  const at = plan.layers.findIndex((l) => l.id === "borders");
  return { ...plan, layers: [...plan.layers.slice(0, at), regions, ...plan.layers.slice(at)], camera: { view: viewOf(cameras.whole) } };
}
```

The neighbours' names are not map layers in the video: they are the close-up's SVG labels with their gauges (spec §4.4), so `neighbours: []`. `maptilerFace` is the video tree's `glyphs.mjs` export; read it first and adapt the call if its signature differs (it takes a register).

- [ ] **Step 5: Run the test** — it stays red on `mapStateAt`/`mapPlan`/`mapSeats` until Tasks 6 and 8; run only the cameras `describe` now:

Run: `bun test proof/video-choropleth-europe-lowcarbon/map-plan.test.ts -t "cameras"`
Expected: PASS once `loadBeat` exposes `mapSeats` — add to `build.mjs`'s `loadBeat` now: `mapSeats: SEATS` (import `SEATS` from `./map-plan.mjs`).

- [ ] **Step 6: Mutation-verify** — (a) change `CLOSE_UP_ZOOM` to 2.0: the cameras test fails; (b) bind `regions`' opacity to a constant 1: the regions test fails. Restore after each.

- [ ] **Step 7: Commit**

```bash
D=proof/video-choropleth-europe-lowcarbon
F=($D/plan.mjs $D/seats.json $D/map-plan.mjs $D/map-plan.test.ts $D/build.mjs shared/map-beat/COPIED-FROM.json)
git add -- "${F[@]}" && git commit -m "feat(video-choropleth): the scrolly pilot's map plan, given the video's cameras, colours and faces" -- "${F[@]}"
```

---

### Task 6: The frame drives the camera and the paint

**Files:**
- Modify: `proof/video-choropleth-europe-lowcarbon/scene.mjs`, `proof/video-choropleth-europe-lowcarbon/scene.test.ts`

**Interfaces:**
- Consumes: `fieldAt`, `WINDOWS`, `GATES`, `COUNT_UP` (existing in `scene.mjs`); `cameras` from Task 5 (in props as `props.cameras = { whole, closeUp }`).
- Produces:
  - `export function cameraAt(cameras, t) → CameraFields` — `camX`, `camY` and `camZoom` interpolated linearly between `whole` (t = 0) and `closeUp` (t = 1); `t` is the eased `zoom` field.
  - `export function mapStateAt(props, frame) → { camX, camY, camZoom, camBearing, camPitch, classes, filter, top, zoom, odd }` — `classes`, `filter` linear as today; `top`, `odd` eased as today and gated like the overview names (`top × gates.overview`, `odd × max(gates.overview, gates.closeUp)`); `zoom` the eased camera travel.
  - `sceneAt(props, frame)` keeps every field the SVG overlay reads (`title`, `furniture`, `source`, `swatches`, `swatchesBack`, `counter`, `cursor`, `countUp`, `gauges`, `names` for the close-up labels, `gates`) and drops `viewBox`, `fills`, `waters`, `ring`.
  - `viewBoxAt`, `overviewViewBox`, `closeUpViewBox`, `toStage` are removed.

- [ ] **Step 1: Write the failing tests** (replace the camera tests in `scene.test.ts`)

```ts
import { cameraAt, mapStateAt } from "./scene.mjs";

describe(`${id}'s map camera, frame by frame`, () => {
  it("should hold the whole map from frame 0 to the camera's departure, and return to exactly it", () => {
    const whole = props.cameras.whole;
    for (const f of [0, endOf(T.reveal) - 1, T.total - 1]) {
      const s = mapStateAt(props, f);
      expect([s.camX, s.camY, s.camZoom]).toEqual([whole.camX, whole.camY, whole.camZoom]);
    }
  });

  it("should stand on the close-up, Albania at the centre, at the end of subject", () => {
    const s = mapStateAt(props, endOf(T.subject) - 1);
    expect([s.camX, s.camY, s.camZoom]).toEqual([props.cameras.closeUp.camX, props.cameras.closeUp.camY, props.cameras.closeUp.camZoom]);
  });

  it("should move the zoom linearly with the camera's travel and the centre in Mercator units", () => {
    const { whole, closeUp } = props.cameras;
    const mid = cameraAt(props.cameras, 0.5);
    expect(mid.camZoom).toBeCloseTo((whole.camZoom + closeUp.camZoom) / 2, 12);
    expect(mid.camX).toBeCloseTo((whole.camX + closeUp.camX) / 2, 12);
    expect(mid.camY).toBeCloseTo((whole.camY + closeUp.camY) / 2, 12);
  });

  it("should name nothing on the map while the camera moves", () => {
    for (let f = T.subject.start; f < T.total; f++) {
      const s = mapStateAt(props, f);
      const moving = s.zoom > 1e-9 && s.zoom < 1 - 1e-9;
      if (moving) expect([f, s.top]).toEqual([f, 0]);
    }
  });

  it("should reveal the classes and raise the floor exactly as the key's swatches do", () => {
    for (let f = 0; f < endOf(T.reveal); f += 3) {
      const s = mapStateAt(props, f);
      const scene = sceneAt(props, f);
      expect(s.classes * props.colours.classFills.length).toBeCloseTo(scene.swatches.reduce((a: number, v: number) => a + v, 0), 0);
    }
  });
});
```

Delete from `scene.test.ts` the tests that read `viewBox`, `fills`, `waters` or `ring`, and the close-up framing test built on `closeUpViewBox` (the close-up is now centred on Albania by the plan's camera, the owner's rule).

- [ ] **Step 2: Run to see them fail**

Run: `bun test proof/video-choropleth-europe-lowcarbon/scene.test.ts`
Expected: FAIL — `cameraAt` is not exported.

- [ ] **Step 3: Implement in `scene.mjs`**

```js
/** The camera between the whole map (t = 0) and the close-up (t = 1): every field linear in t — the zoom is
 *  already logarithmic, the centre is in Web Mercator units, the plane MapLibre moves in (the pilot's rule). */
export function cameraAt(cameras, t) {
  const { whole, closeUp } = cameras;
  if (t <= 0) return { ...whole };
  if (t >= 1) return { ...closeUp };
  const at = (k) => whole[k] + (closeUp[k] - whole[k]) * t;
  return { camX: at("camX"), camY: at("camY"), camZoom: at("camZoom"), camBearing: 0, camPitch: 0 };
}

export function mapStateAt(props, frame) {
  const { states, timing } = props;
  const at = (field) => fieldAt(field, frame, states, timing);
  const gates = gatesAt(frame, timing);
  const zoom = at("zoom");
  return {
    ...cameraAt(props.cameras, zoom),
    classes: at("classes"),
    filter: at("filter"),
    top: clamp01(at("top") * gates.overview),
    zoom,
    odd: clamp01(at("odd") * Math.max(gates.overview, gates.closeUp)),
  };
}
```

`zoom` is already eased by `fieldAt` (it is not in `LINEAR`). In `sceneAt`, remove `viewBox`, `fills`, `waters`, `ring` and the per-shape fill loop; keep the rest.

- [ ] **Step 4: Run the scene tests**

Run: `bun test proof/video-choropleth-europe-lowcarbon/scene.test.ts proof/video-choropleth-europe-lowcarbon/states.test.ts proof/video-choropleth-europe-lowcarbon/timing.test.ts`
Expected: the new camera tests PASS; tests depending on `build.mjs` props that Task 8 changes (`props.cameras`) may still fail — run again after Task 8.

- [ ] **Step 5: Mutation-verify** — (a) interpolate `camY` in degrees (convert through `lonLatOf`, lerp latitude, back through `mercatorOf`): the Mercator test fails; (b) drop `gates.overview` from `top`: the "nothing named while moving" test fails. Restore after each.

- [ ] **Step 6: Commit** (with Task 8, whose props this test reads — see Task 8 Step 8).

---

### Task 7: Measure the choropleth's two fixed cameras

**Files:**
- Create: `proof/video-choropleth-europe-lowcarbon/measure.mjs`, `proof/video-choropleth-europe-lowcarbon/measured.json`

**Interfaces:**
- Consumes: `measureLiveMap` (Task 4), `mapPlanFor`, `camerasOf`, `SEATS` (Task 5), `mapStateAt` field names (Task 6).
- Produces: `measured.json` = `{ planDigest: { [direction]: sha256 }, size: {width:1920,height:1080}, cameras: { [direction]: { whole: MeasureOut, closeUp: MeasureOut } } }`, where each `MeasureOut` is `measureLiveMap`'s per-state output; the `whole` state is measured with every class in and the floor down (`classes: 1, filter: 0, top: 0, zoom: 0, odd: 1`) and a second time with the floor up (`filter: 1`) under the key `wholeFiltered`; `closeUp` with `classes: 1, filter: 0, top: 0, zoom: 1, odd: 0` (the SVG labels are drawn over it, not the map's own ring). `export function planDigestOf(plan)` = sha256 of `JSON.stringify(plan)`.

- [ ] **Step 1: Implement `measure.mjs`**

```js
// Usage: set -a && . ./.env && set +a && bun proof/video-choropleth-europe-lowcarbon/measure.mjs
//
// THE CHOROPLETH'S FIXED CAMERAS, MEASURED ON THE REAL MAP ONCE AND FROZEN: where MapLibre draws every seat the
// overlay needs, and the colour it paints under every cell, for each direction. `build.mjs` reads the result
// offline; a plan that changes after it is refused there (`planDigest`).

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { measureLiveMap } from "../../skills/map-beat/scripts/measure-live-map.mjs";
import { buildDirection, loadBeat } from "./build.mjs";

export const planDigestOf = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");

if (import.meta.main) {
  const key = mapTilerKeyIn(process.env);
  if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
  const beat = loadBeat();
  const out = { size: { width: 1920, height: 1080 }, planDigest: {}, cameras: {} };
  for (const id of ["creme", "nocturne", "rapport"]) {
    const { props } = buildDirection(id, beat, { measured: null });
    const base = { classes: 1, filter: 0, top: 0, odd: 0 };
    const states = {
      whole: { ...props.cameras.whole, ...base, zoom: 0, odd: 1 },
      wholeFiltered: { ...props.cameras.whole, ...base, filter: 1, zoom: 0 },
      closeUp: { ...props.cameras.closeUp, ...base, zoom: 1 },
    };
    out.planDigest[id] = planDigestOf(props.mapPlan);
    out.cameras[id] = await measureLiveMap({ plan: props.mapPlan, states, seats: beat.mapSeats, size: out.size, mapTilerKey: key, tints: props.mapPlan.tints });
    for (const [name, m] of Object.entries(out.cameras[id])) if (!m.tilesLoaded) throw new Error(`${id} ${name}: a tile was still loading when it was measured`);
    console.log(`${id} measured`);
  }
  writeFileSync(join(import.meta.dir, "measured.json"), JSON.stringify(out) + "\n");
}
```

- [ ] **Step 2: Run it**

Run: `set -a && . ./.env && set +a && bun proof/video-choropleth-europe-lowcarbon/measure.mjs`
Expected: `creme measured`, `nocturne measured`, `rapport measured`; `measured.json` written. Check: `grep -c "key=" proof/video-choropleth-europe-lowcarbon/measured.json` prints `0`.

(`buildDirection(id, beat, { measured: null })` is Task 8's signature: a build without measurement produces the plan and cameras only. Implement Task 8 Step 3's `measured` option first if it does not exist yet.)

- [ ] **Step 3: Commit** (with Task 8).

---

### Task 8: The overlay placed from the measurement, the map under it

**Files:**
- Modify: `proof/video-choropleth-europe-lowcarbon/build.mjs`, `layout.mjs`, `ChoroplethFrame.tsx`, `DirectedChoroplethVideo.tsx`, `Root.tsx`, `anatomy.test.ts`, `layout.test.ts`, `frame.test.ts`, `scene.test.ts`
- Delete: `proof/video-choropleth-europe-lowcarbon/geometry.mjs`, `proof/video-choropleth-europe-lowcarbon/geometry.test.ts`

**Interfaces:**
- Consumes: Tasks 5–7.
- Produces:
  - `buildDirection(id, beat, { measured = readMeasured() } = {})` → `{ props, … }` with `props.mapPlan`, `props.cameras`, `props.names` (close-up labels only, each with `gauge`), `props.panel`, `props.source`, `props.colours`, `props.states`, `props.timing`. With `measured: null` it returns only `mapPlan` and `cameras` (for Task 7). With a `measured` whose `planDigest[id]` differs from the current plan's, it throws `the plan changed since it was measured — run measure.mjs again`.
  - Placement reads the measured grid: `cellAt(measure, x, y) → "#rrggbb"`; a box's colours are the cells it covers.
  - `ChoroplethFrame` renders `<div ref={useLiveMap(...)} />` under the SVG, full frame.

- [ ] **Step 1: Rewrite the placement tests against the measurement**

In `anatomy.test.ts`, replace every read of Natural Earth rings (`shapeUnder`, `insideRing`, `props.shapes`) with the measured grid:

```ts
import measured from "./measured.json";
const cellsUnder = (camera: "whole" | "closeUp", box: { x: number; y: number; width: number; height: number }) => {
  const m = measured.cameras[id][camera].grid;
  const out = new Set<string>();
  for (let j = Math.floor(box.y / m.cell); j <= Math.floor((box.y + box.height) / m.cell); j++)
    for (let i = Math.floor(box.x / m.cell); i <= Math.floor((box.x + box.width) / m.cell); i++) out.add(m.colours[j * m.cols + i]);
  return [...out];
};
```

and keep, rewritten on it, these tests:
- "should set every close-up label in an ink that reads on every cell it covers": for each `props.names` entry, `contrast(n.ink, c) >= 4.5` for every `c` in `cellsUnder("closeUp", box)` (7 for Albania's).
- "should seat every close-up label within one label height of its measured seat, off Albania's seat, inside the frame": the measured `projected` of the seat against the label's box.
- "should set the credit on one line, inside the margins, clear of the panel, over the sea": every cell under the credit's box at `whole` equals, within 3 in each channel, the cell measured at the Atlantic seat `[-30, 45]` (add it to `mapSeats` as `atlantic`).
- "should seat the panel over the sea at the whole map": the same sea test for the panel box.
Delete the seas-names and six-names placement tests (the six and the seas are map layers now); delete `geometry.test.ts`.

In `layout.test.ts`, keep the title-card and panel tests; the source test reads `props.source` (one line, type floor).

In `frame.test.ts`, keep the type-floor/data-width test per event; render `ChoroplethFrame` with a `LiveMap` stand-in prop (`liveMap: () => null`) so the markup renders in Bun without MapLibre.

- [ ] **Step 2: Run to see them fail**

Run: `bun test proof/video-choropleth-europe-lowcarbon`
Expected: FAIL — `measured` fields and `props.mapPlan` absent.

- [ ] **Step 3: Rewrite `build.mjs`**

Keep: the direction and registers, `layoutFor` (title card, key panel, credit forms), the colours for the key and overlay, `copyOf` (drop `waters` and the overview `names`; keep the close-up names as labels: Albania, the three neighbours with their shares, Kosovo « hors données »), the gauges (`withGauge`), `placePills` for the close-up labels, `STATES_SEEN` ink rule.

Remove: `videoGeometry`, rings, `insideRing`, `ownerOf`, `coverFor`, land grids, the overview names, the seas search, the Natural Earth `shapes` in props.

Add:

```js
import measuredFile from "./measured.json" with { type: "json" };
import { camerasOf, mapPlanFor, SEATS } from "./map-plan.mjs";
import { planDigestOf } from "./measure.mjs";

const cellsOf = (grid, box) => {
  const out = new Set();
  for (let j = Math.max(0, Math.floor(box.y / grid.cell)); j <= Math.min(grid.rows - 1, Math.floor((box.y + box.height) / grid.cell)); j++)
    for (let i = Math.max(0, Math.floor(box.x / grid.cell)); i <= Math.min(grid.cols - 1, Math.floor((box.x + box.width) / grid.cell)); i++) out.add(grid.colours[j * grid.cols + i]);
  return [...out];
};
const near = (a, b, tolerance = 3) => [1, 3, 5].every((k) => Math.abs(Number.parseInt(a.slice(k, k + 2), 16) - Number.parseInt(b.slice(k, k + 2), 16)) <= tolerance);
```

and in `buildDirection`:

1. `const cameras = camerasOf(subject);` `const mapPlan = mapPlanFor({ direction, registers, subject, cameras, iso2Of, words });` — `words.top` are the six with their `SEATS`, `words.odd` Albania, `words.waters` the pilot's three seas.
2. If `measured === null` return `{ props: { mapPlan, cameras } }`.
3. `const m = measured.cameras[id];` refuse a digest mismatch.
4. Close-up labels: `placePills` at the close-up with `cx, cy` = `m.closeUp.projected[seat]`, `allowed(box)` = an ink exists reading on every cell of `cellsOf(m.closeUp.grid, box)` (the existing `inkOn` over those colours), `avoid` = a box of Albania's seat radius around `m.closeUp.projected.ALB`.
5. The panel: tried on the existing `PANEL_STEP` grid inside the margins at `whole`, the first bottom-left-most position whose cells (`wholeFiltered` and `whole`) are all `near` the Atlantic cell `m.whole.projected.atlantic`; refuse when none.
6. The credit (one line, `sources` longest first): the first position under the panel, then bottom-up left-right, whose cells at `whole` are all sea by the same test and which touches the panel by no gap.
7. `props` = `{ frame, stage, layoutInset, registers, titleCard, source, panel, colours, strokes, names, cameras, mapPlan, states, timing }`.

- [ ] **Step 4: Rewrite `ChoroplethFrame.tsx`**

The SVG keeps: the close-up labels with their gauges (opacity `scene.names[key]`), the panel, the title card, the credit. Remove the nested map `<svg>` (sea rect, shapes, ring) and the water words. The component takes `liveMap: (frame: number) => React.ReactNode` and renders:

```tsx
<div style={{ position: "relative", width: frame.width, height: frame.height, background: colours.sea }}>
  {props.liveMap(props.at)}
  <svg ref={props.svgRef} style={{ position: "absolute", inset: 0 }} width={frame.width} height={frame.height} viewBox={`0 0 ${frame.width} ${frame.height}`}>
    {/* gauges, labels, panel, credit, title card — as before */}
  </svg>
</div>
```

- [ ] **Step 5: Wire the live map in `DirectedChoroplethVideo.tsx`**

```tsx
import { mountPlan } from "#shared/map-beat/mount.mjs";
import { bindState, viewOf } from "#shared/map-beat/scrolly.mjs";
import { transformStyle } from "#shared/map-beat/style.mjs";
import { useLiveMap } from "../../skills/map-beat/assets/live-map";
import { mapStateAt } from "./scene.mjs";

function LiveChoroplethMap(props: DirectedChoroplethVideoProps & { at: number }) {
  const container = useLiveMap({
    plan: props.mapPlanProxied,
    styleUrl: props.mapPlanProxied.styleUrl,
    tints: props.mapPlanProxied.tints,
    frame: props.at,
    mount: mountPlan,
    transform: transformStyle,
    paint: (map, frame) => {
      const state = mapStateAt(props as never, frame);
      map.jumpTo(viewOf(state));
      for (const layer of props.mapPlanProxied.layers) for (const p in layer.bindings ?? {}) map.setPaintProperty(layer.id, p, bindState(layer.bindings[p], state), { validate: false });
    },
  });
  return <div ref={container} style={{ position: "absolute", inset: 0 }} />;
}
```

and render `<ChoroplethFrame {...props} at={frame} liveMap={() => <LiveChoroplethMap {...props} at={frame} />} svgRef={ref} />` once the faces are ready. `mapPlanProxied` is `throughProxy(props.mapPlan, origin)`, added to the props file by the runner (Task 9) — never committed. The composition's `defaultProps` in `Root.tsx` gain `mapPlanProxied: null`, and `LiveChoroplethMap` renders nothing when it is null.

- [ ] **Step 6: Run the beat's tests**

Run: `bun test proof/video-choropleth-europe-lowcarbon skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/a-directed-video-types-no-style.test.ts`
Expected: PASS.

- [ ] **Step 7: Mutation-verify** — (a) in the credit search, accept a position whose cells are land: the credit sea test fails; (b) place the close-up labels on `SEATS` projected by the old SVG camera (any constant offset of 40 px): the seat-distance test fails; (c) drop the digest check and change `CLOSE_UP_ZOOM`: the build must throw — confirm it does with the check, and that a test exists (`should refuse a plan that changed since it was measured`, added in Step 1 of this task: build with a `measured` whose digest is `"stale"`, expect a throw). Restore after each.

- [ ] **Step 8: Commit Tasks 6–8**

```bash
D=proof/video-choropleth-europe-lowcarbon
F=($D/scene.mjs $D/scene.test.ts $D/measure.mjs $D/measured.json $D/build.mjs $D/layout.mjs $D/ChoroplethFrame.tsx $D/DirectedChoroplethVideo.tsx $D/Root.tsx $D/anatomy.test.ts $D/layout.test.ts $D/frame.test.ts $D/map-plan.test.ts $D/geometry.mjs $D/geometry.test.ts)
git add -- "${F[@]}" && git commit -m "feat(video-choropleth): the live MapTiler map under the overlay — the frame drives camera and paint, the labels, key and credit placed from the measured map" -- "${F[@]}"
```

---

### Task 9: Render through the proxy, and prove no key leaves

**Files:**
- Modify: `proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs`
- Create: `proof/video-choropleth-europe-lowcarbon/no-key.live.test.ts`

**Interfaces:**
- Consumes: `renderVideoMap({ entry, composition, buildProps(origin), outDir, name, mapTilerKey, mode, frame?, cacheDir })` (Task 3), `throughProxy` (Task 4), `buildDirection` (Task 8), `DEFAULT_CACHE_DIR` (Task 2).
- Produces: `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json` (the committed props WITHOUT `mapPlanProxied`); `--look <dir>` renders the event-end frames and the mid-camera frames as stills through the same proxy.

- [ ] **Step 1: Rewrite the runner's render section**

```js
const key = mapTilerKeyIn(process.env);
if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded (set -a && . ./.env && set +a)");
// … per direction, after the type-floor assertions:
const buildProps = async (origin) => {
  const withFaces = await writeRenderProps({ props: { ...props, mapPlanProxied: throughProxy(props.mapPlan, origin) }, wanted: wantedOf(props.registers), auditPath: null });
  return withFaces;
};
await writeFile(join(OUT, `${id}-props.json`), JSON.stringify(props, null, 2)); // the audit copy: no proxy origin, no key
for (const { name, frame } of lookDir ? lookFrames(props.timing) : [{ name: "final-frame", frame: -1 }])
  await renderVideoMap({ entry, composition: COMPOSITION, buildProps, outDir: lookDir ?? OUT, name: lookDir ? `${id}-${String(frame).padStart(3, "0")}-${name}` : `${id}-final-frame`, mapTilerKey: key, mode: "still", frame, cacheDir: DEFAULT_CACHE_DIR });
if (!lookDir && !stillOnly) {
  const { seconds, proxyCounts } = await renderVideoMap({ entry, composition: COMPOSITION, buildProps, outDir: OUT, name: id, mapTilerKey: key, mode: "mp4", cacheDir: DEFAULT_CACHE_DIR });
  console.log(`  -> renders/${id}.mp4 (${seconds}s) · ${Object.entries(proxyCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
}
```

Read `renderVideoMap` and `writeRenderProps` first and match their real signatures (`buildProps` may be expected to return a path; if so, write the props file into the temp dir it provides). The mp4 and PNG size assertions stay.

- [ ] **Step 2: Write the key test**

```ts
// proof/video-choropleth-europe-lowcarbon/no-key.live.test.ts
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { DEFAULT_CACHE_DIR } from "../../skills/map-beat/scripts/maptiler-proxy.mjs";

/** After a render: the key is in no file the render or the measurement wrote. Needs the worktree's .env. */
const key = mapTilerKeyIn(process.env);
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

describe("the choropleth video's outputs", () => {
  it("should carry the MapTiler key in no render, props file, measurement or cached tile", () => {
    if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
    const dirs = [join(import.meta.dir, "renders"), DEFAULT_CACHE_DIR];
    const leaks = [...dirs.flatMap(files), join(import.meta.dir, "measured.json")].filter((f) => readFileSync(f).includes(Buffer.from(key)));
    expect(leaks).toEqual([]);
  });
});
```

- [ ] **Step 3: Render the look frames for one direction and read them**

Run: `set -a && . ./.env && set +a && bun proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs --only creme --look "$SCRATCH/look-choro-live"` (SCRATCH = the session scratchpad)
Expected: every event-end still written; read them: every country present at the whole map (North Africa, the Middle East, Russia drawn), the classes arriving, the six names on their countries, the close-up centred on Albania with the gauges, the credit on one line over the sea. Then the other two directions.

- [ ] **Step 4: Run the key test**

Run: `set -a && . ./.env && set +a && bun test proof/video-choropleth-europe-lowcarbon/no-key.live.test.ts skills/splash/test/no-key-in-the-repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation-verify the key test** — write a file `renders/leak.txt` containing the key read from the environment inside a `bun -e` (never echo it), run the test (expect FAIL), delete the file.

- [ ] **Step 6: Commit the code, then render and commit the renders**

```bash
D=proof/video-choropleth-europe-lowcarbon
F=($D/render-directions-video.mjs $D/no-key.live.test.ts)
git add -- "${F[@]}" && git commit -m "feat(video-choropleth): rendered through the MapTiler proxy with its tile cache; no key in any output" -- "${F[@]}"
osascript -e 'tell application "QuickTime Player" to quit'
set -a && . ./.env && set +a && bun proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs
R=$D/renders; F=($R/creme.mp4 $R/nocturne.mp4 $R/rapport.mp4 $R/creme-final-frame.png $R/nocturne-final-frame.png $R/rapport-final-frame.png $R/creme-props.json $R/nocturne-props.json $R/rapport-props.json)
git add -- "${F[@]}" && git commit -m "render(video-choropleth): three directions on the live MapTiler map" -- "${F[@]}"
```

Record each direction's render time and proxy counts (from the runner's log line) for Task 10.

---

### Task 10: Record the pilot and hand it to the owner

**Files:**
- Modify: `proof/video-choropleth-europe-lowcarbon/BRIEF.md`, `skills/map-beat/references/types/choropleth.md`, `docs/design-base/CATALOGUE.md`

- [ ] **Step 1: BRIEF.md** — replace « Data, shapes and modules », « The picture », « The still's anatomy » with the live map: the plan copied from the scrolly pilot, the map layers (classes beneath the water, the six names, the seas, the ring), the SVG overlay (panel, close-up labels and gauges, credit with « © MapTiler © OpenStreetMap »), the measurement pass and its refusal on a stale plan, the proxy and its cache, the render time and request counts measured in Task 9. Keep the choreography table; change its `subject` row to name the close-up centred on Albania and the regional borders (Countries level 1) arriving with it.

- [ ] **Step 2: The type sheet** — in `choropleth.md` « In video », replace the vector-SVG paragraph with: the map is the live MapTiler map of the scrolly pilot's plan, driven per frame (`mapStateAt`: camera in Mercator numbers, bound fields), held until every tile is loaded, rendered `--gl=swangle` through the key proxy; the words that must be measured are SVG placed from a frozen measurement of each fixed camera.

- [ ] **Step 3: The catalogue** — the Choropleth video row: `proof/video-choropleth-europe-lowcarbon — live MapTiler map (pilot, awaiting the owner)`; the other seven map video rows unticked until redone (spec §5).

- [ ] **Step 4: NBSP check, guards, commit**

```bash
grep -nP '\x{00A0}' proof/video-choropleth-europe-lowcarbon/*.mjs proof/video-choropleth-europe-lowcarbon/*.ts proof/video-choropleth-europe-lowcarbon/*.tsx skills/map-beat/scripts/*.mjs skills/map-beat/assets/live-map.ts
bun test skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/a-directed-video-types-no-style.test.ts skills/map-beat/test/copied-from-scrolly.test.ts
F=(proof/video-choropleth-europe-lowcarbon/BRIEF.md skills/map-beat/references/types/choropleth.md docs/design-base/CATALOGUE.md)
git add -- "${F[@]}" && git commit -m "docs(video-choropleth): the map video pilot on the live MapTiler map recorded" -- "${F[@]}"
git log -8 --format=%B | grep -ci "claude\|anthropic"   # expect 0
```

- [ ] **Step 5: Open the three mp4s** — `open -a "QuickTime Player" proof/video-choropleth-europe-lowcarbon/renders/{creme,nocturne,rapport}.mp4` — and report to the owner in French: what changed (every country present, the basemap's coasts, the names as map layers, the close-up centred), what stayed (the choreography), the render time and request counts, and the next types once he validates.
