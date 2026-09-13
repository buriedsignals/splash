# Video quality pass — plan 2: the choropleth pilot

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first catalogue type produced as a directed video — `proof/video-choropleth-europe-lowcarbon/`, three mp4 (creme, nocturne, rapport), same subject, data and claim as `proof/static-choropleth-europe-lowcarbon/`, choreographed for video, rendered by the plan mounted live — and every lesson from it carried into the skills.

**Architecture:** Bun resolves each direction (families, registers, video scale, faces, treatments), lays the video frame out with the still's own measurement, and builds the map plan from a side-effect-free module extracted from the static beat. A Remotion composition draws the furniture as SVG and mounts the plan live in MapLibre over MapTiler tiles fetched through a local proxy that keeps the key; every choreography event changes the picture and is interpolated from the timing contract.

**Tech Stack:** Bun, TypeScript/ESM, bun:test, Remotion 4.0.507 (`--gl=swangle`), MapLibre 4.7.1, resvg (Bun-side measurement), MapTiler (through the proxy).

**Spec:** `docs/splash/2026-09-13-video-quality-pass-spec.md` (as of `9b967aab`). Plan 1: `docs/superpowers/plans/2026-09-13-video-quality-pass-1-mechanism.md`. Ledger of plan 1 (rulings, peer notes): `.superpowers/sdd/2026-09-13-video-quality-pass-1-mechanism/progress.md`. Spike reference code: `.superpowers/sdd/2026-09-13-video-quality-pass-1-mechanism/spike-sources/` (`useDirectedMap.ts`, `LiveMap.tsx`, `run.mjs` — throwaway, read for shape only).

## Global Constraints

- Bun always; never npm, never node. zsh: pathspec arrays.
- Code, comments, commit messages in English. **Commit messages carry no trailer lines** — no `Claude-Session:`, no `Co-Authored-By:`, nothing naming a vendor. Check `git log -1 --format=%B` after every commit.
- `git add` / `git commit` with explicit pathspecs; never `-A`, never bare; never `git stash`.
- Targeted tests only: `bun test --timeout 120000 <files>`; never the full suite.
- Every new guard is mutation-verified (name the mutation, run it, restore, record the red test).
- `shared/` belongs to nobody. Announced and cleared with the other sessions for this plan: `shared/map-beat/glyphs.mjs` (+ `skills/splash/assets/root-template/shared/map-beat/glyphs.mjs`) gains `maptilerFace`/`FACE_WEIGHTS`, strictly additive; `skills/doctrine/references/motion-grammar.md` amended. **Do not touch** `shared/map-beat/style.mjs`, `mount.mjs`, `plan.mjs` (modified on the web branch). Any other `shared/` change: stop and report.
- A carried file keeps line 1 `// twin/<canonical path>` and is byte-identical to its canonical.
- Nothing reads `.leading` outside the three trunk owners; place lines with `leadOf` / `gapOf` and the video seam's `lead`.
- A directed video composition types no size, weight, lead, tracking, family, style, case or colour (`a-directed-video-types-no-style.test.ts`); text reaches it already cased by `applyCase`.
- Video size: landscape 1920×1080, `typeScale` 2.5, floor 30 px; registers scaled by one `k = max(typeScale, 30 / smallest resolved size)`.
- Every `remotion` spawn passes an empty `--env-file`; the MapTiler key never enters the page, a props file, a saved log or a command argument — it lives in the render process behind a proxy bound to `127.0.0.1` that forwards only to `api.maptiler.com`.
- A MapTiler text face is always named with its face suffix (`maptilerFace`), and `assertNotFallback` stays live: a bare family comes back as Noto Sans with a 200.
- The static choropleth's renders must not move: `bun scripts/design-base/renders-moved.mjs proof/static-choropleth-europe-lowcarbon` → `same` for creme, nocturne, rapport, and a `compared N` line with N > 0.
- The static ladder CHOOSES on the filed rhythm and DRAWS on the drawn rhythm (`layoutFor(…, rhythm: "filed" | "drawn")` in `DirectedChoroplethMap.tsx`) — the extraction keeps that separation.
- Open only the three mp4 for the owner; frames are for the implementer's own looking.

---

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `skills/splash/test/a-directed-video-types-no-style.test.ts` | modify — MapLibre array rule flags only literal members | 1 |
| `skills/doctrine/references/motion-grammar.md` | modify — zoom/rescale/reframe admitted when it reveals evidence | 2 |
| `skills/chart-video/references/directed-type-choreography.md` | create — the video repertoire | 2 |
| `skills/chart-video/scripts/choreography.mjs` | create — `assertEventStates(states)` | 2 |
| `skills/chart-video/test/choreography.test.ts` | create | 2 |
| `shared/map-beat/glyphs.mjs` + root-template copy | modify — `FACE_WEIGHTS`, `maptilerFace` exported | 3 |
| `shared/map-beat/test` or `skills/map-beat/test/maptiler-face.test.ts` | create | 3 |
| `proof/static-choropleth-europe-lowcarbon/beat.mjs` | create — the side-effect-free subject: data, shapes, claims, breaks, ramp, layers, copy | 4 |
| `proof/static-choropleth-europe-lowcarbon/render-directions.mjs` | modify — imports `beat.mjs` and trunk `maptilerFace`; renders unchanged | 3, 4 |
| `skills/map-beat/scripts/maptiler-proxy.mjs` | create — the key-keeping proxy | 5 |
| `skills/map-beat/test/maptiler-proxy.test.ts` | create | 5 |
| `skills/map-beat/scripts/{video-faces,video-registers,choreography}.mjs`, `skills/map-beat/assets/{embedded-faces,face-coverage}.ts` | create — `// twin/` copies from `skills/chart-video` | 6 |
| `skills/map-beat/assets/live-map.ts` | create — `useLiveMap`: boot, mount, per-frame paint, idle | 6 |
| `skills/map-beat/scripts/render-video-map.mjs` | create — proxy + empty env + swangle + still-then-mp4 | 6 |
| `proof/video-choropleth-europe-lowcarbon/BRIEF.md`, `PALETTE.md` | create — subject + choreography (data read from the static beat) | 7 |
| `proof/video-choropleth-europe-lowcarbon/layout.mjs` (+ test) | create — the video frame laid out in Bun | 8 |
| `proof/video-choropleth-europe-lowcarbon/{timing-contract.ts,timing.test.ts,states.mjs}` | create — events and per-event states | 9 |
| `proof/video-choropleth-europe-lowcarbon/{DirectedChoroplethVideo.tsx,Root.tsx,index.ts}` | create — the composition | 10 |
| `proof/video-choropleth-europe-lowcarbon/render-directions-video.mjs` | create — the runner | 11 |
| `skills/chart-video/SKILL.md`, `skills/map-beat/SKILL.md`, `skills/map-beat/references/types/choropleth.md`, `docs/design-base/CATALOGUE.md`, `MATRIX.md` | modify — lessons into the skills | 13 |

---

### Task 1: The MapLibre rule stops flagging register-driven arrays

**Files:** Modify `skills/splash/test/a-directed-video-types-no-style.test.ts`.

**Interfaces:** Produces `typedStylesIn(source)` unchanged in signature.

- [ ] **Step 1: Add the failing scanner cases** inside `describe("the scanner", …)`:

```ts
  it("should accept a MapLibre font array built from a register", () => {
    expect(typedStylesIn(`"text-font": [maptilerFace(r.axis)],`)).toEqual([]);
  });
  it("should accept a MapLibre expression array", () => {
    expect(typedStylesIn(`"fill-opacity": ["interpolate", ["linear"], ["get", "t"], 0, 0, 1, 1],`)).toEqual([]);
  });
  it("should still find a MapLibre font array with a literal face", () => {
    expect(typedStylesIn(`"text-font": ["Open Sans Bold"],`)).toEqual(["a typed MapLibre property"]);
  });
  it("should still find a MapLibre property with a literal number", () => {
    expect(typedStylesIn(`"text-size": 14,`)).toEqual(["a typed MapLibre property"]);
  });
```

If the rule's display name in the file differs from `"a typed MapLibre property"`, use the file's own name in the last two expectations.

- [ ] **Step 2: Run** `bun test --timeout 120000 skills/splash/test/a-directed-video-types-no-style.test.ts` — expect the two "accept" cases to FAIL.

- [ ] **Step 3: Narrow the rule.** A kebab MapLibre key followed by `:` is flagged when the value is a number literal, a string literal, or an array whose FIRST element is a string literal that is not a MapLibre expression operator. Operators to exempt: `interpolate`, `step`, `match`, `case`, `coalesce`, `get`, `literal`, `linear`, `exponential`, `feature-state`, `zoom`, `*`, `+`, `-`, `/`, `min`, `max`, `to-color`, `rgb`, `rgba`. An array whose first element is not a string literal (`[maptilerFace(r)]`, `[x, y]`) is not flagged. Update the header's blind-spot list: an expression array can still carry a literal colour or number inside it (e.g. `["match", …, "#fff"]`) — caught only by the colour rule when the literal is a hex or a named colour.

- [ ] **Step 4: Run** the file — all green.

- [ ] **Step 5: Mutation** — revert Step 3's operator exemption (flag every `[` again) → the two "accept" cases FAIL; restore.

- [ ] **Step 6: Commit** `test(video): a MapLibre array built from a register or an expression is not a typed style`.

---

### Task 2: The video choreography, as doctrine and as a guard

**Files:** Create `skills/chart-video/references/directed-type-choreography.md`, `skills/chart-video/scripts/choreography.mjs`, `skills/chart-video/test/choreography.test.ts`; modify `skills/doctrine/references/motion-grammar.md`.

**Interfaces:** Produces `assertEventStates(states: Array<Record<string, number>>, events: string[])` → returns `states`; throws when two consecutive states are equal, when a state has a non-finite field, or when `states.length !== events.length`.

- [ ] **Step 1: Write the failing test** `skills/chart-video/test/choreography.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { assertEventStates } from "../scripts/choreography.mjs";

describe("assertEventStates", () => {
  const events = ["establish", "reference", "reveal"];

  it("should return states in which every event changes the picture", () => {
    const states = [{ fill: 0, zoom: 1 }, { fill: 0.5, zoom: 1 }, { fill: 1, zoom: 2 }];
    expect(assertEventStates(states, events)).toBe(states);
  });

  it("should refuse an event whose state equals the one before it", () => {
    const states = [{ fill: 0 }, { fill: 1 }, { fill: 1 }];
    expect(() => assertEventStates(states, events)).toThrow(/reveal changes nothing/);
  });

  it("should refuse a state with a non-finite field", () => {
    const states = [{ fill: 0 }, { fill: Number.NaN }, { fill: 1 }];
    expect(() => assertEventStates(states, events)).toThrow(/reference\.fill/);
  });

  it("should refuse a state list that does not match the events", () => {
    expect(() => assertEventStates([{ fill: 0 }], events)).toThrow(/3 events/);
  });
});
```

- [ ] **Step 2: Run** — FAIL (module missing).

- [ ] **Step 3: Implement** `skills/chart-video/scripts/choreography.mjs`:

```js
// twin/skills/chart-video/scripts/choreography.mjs
//
// EVERY EVENT CHANGES THE PICTURE. A directed video is the static beat's subject choreographed, not
// its plate replayed (`references/directed-type-choreography.md`). The runner computes the picture's
// state at the end of each event of the timing contract — a fill, a window, a count, a filter — and
// this refuses the event a viewer would sit through while nothing moves. The scrolly's `assertStates`
// is the same rule for a card.

export function assertEventStates(states, events) {
  if (states.length !== events.length)
    throw new Error(`${states.length} states for ${events.length} events: one state closes each event`);
  states.forEach((state, i) => {
    for (const [key, value] of Object.entries(state))
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${events[i]}.${key} is ${JSON.stringify(value)}; every field of a state must be a finite number`);
    if (i > 0) {
      const before = states[i - 1];
      const keys = new Set([...Object.keys(before), ...Object.keys(state)]);
      if ([...keys].every((k) => before[k] === state[k]))
        throw new Error(
          `${events[i]} changes nothing: its state is ${events[i - 1]}'s. Give it a gesture of its own — ` +
            `reveal, filter, zoom, reorder, rescale, count, compare, trace, name — or fold it into ` +
            `${events[i - 1]} (references/directed-type-choreography.md)`,
        );
    }
  });
  return states;
}
```

- [ ] **Step 4: Run** — green. **Mutation:** delete the equality check → `should refuse an event whose state equals…` FAILS; restore.

- [ ] **Step 5: Write** `skills/chart-video/references/directed-type-choreography.md` — a French-free English doctrine page in the shape of `skills/scrolly/references/directed-type-choreography.md` on branch `quality/scrolly` (read it with `git -C /Users/rmdms/Sites/Professional/splash/scrolly show quality/scrolly:skills/scrolly/references/directed-type-choreography.md`), adapted to time: the static plate is the floor; the choreography is written shot by shot in `BRIEF.md` before code (what the shot says, the gesture, what moves, which timing event); every event changes the picture (`assertEventStates`); a derived mark is computed and asserted in the runner; motion follows the timing contract (`progressOf`), linear on a time axis, eased for arrivals, the hold readable; the same repertoire table (reveal in order, filter, zoom/focus, reorder, rescale, count up, compare, trace, name, pull back) with "reach for it when"; precision still applies (layout measured in Bun, width agreement in Chrome, floors, safe zone). Quote the owner's words from spec §3.

- [ ] **Step 6: Amend** `skills/doctrine/references/motion-grammar.md` line 16's sentence: replace "the frame does not zoom" with "the frame zooms, rescales or reframes only when that move is itself evidence arriving — a window closing onto the years the claim is about, a region enlarged to print values the overview cannot; never for energy". Add one paragraph under "Data arriving is the motion event" pointing to `chart-video/references/directed-type-choreography.md` for the repertoire. Keep every other rule verbatim.

- [ ] **Step 7: Run** `bun test --timeout 120000 skills/chart-video/test/choreography.test.ts skills/splash/test/web-entrance-is-an-addition.test.ts` — the web guard reads delivered HTML only and must stay green (if it is too slow, record and skip it with the reason; the web session confirmed it does not parse the doctrine).

- [ ] **Step 8: Commit** (one commit, pathspec the four files) `feat(video): a directed video is choreographed event by event, and a zoom that is evidence is admitted`.

---

### Task 3: `maptilerFace` joins the trunk, additively

**Files:** Modify `shared/map-beat/glyphs.mjs`, `skills/splash/assets/root-template/shared/map-beat/glyphs.mjs` (byte-identical copy), `proof/static-choropleth-europe-lowcarbon/render-directions.mjs`. Create `skills/map-beat/test/maptiler-face.test.ts`.

**Interfaces:** Produces `FACE_WEIGHTS` and `maptilerFace({ fontFamily, fontWeight, fontStyle })` → `string` from `#shared/map-beat/glyphs.mjs`, same behaviour as `render-directions.mjs:731-745` today.

- [ ] **Step 1: Failing test** `skills/map-beat/test/maptiler-face.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";

describe("maptilerFace", () => {
  it("should name an upright regular face with its weight word", () => {
    expect(maptilerFace({ fontFamily: "Open Sans", fontWeight: 400, fontStyle: "normal" })).toBe("Open Sans Regular");
  });
  it("should drop Regular from an italic regular face", () => {
    expect(maptilerFace({ fontFamily: "Open Sans", fontWeight: 400, fontStyle: "italic" })).toBe("Open Sans Italic");
  });
  it("should keep the weight word on a bold italic face", () => {
    expect(maptilerFace({ fontFamily: "Merriweather", fontWeight: 700, fontStyle: "italic" })).toBe("Merriweather Bold Italic");
  });
  it("should refuse a weight MapTiler serves no face name for", () => {
    expect(() => maptilerFace({ fontFamily: "Open Sans", fontWeight: 600, fontStyle: "normal" })).toThrow(/no MapTiler face name/);
  });
});
```

- [ ] **Step 2: Run** — FAIL (not exported).

- [ ] **Step 3: Move** `FACE_WEIGHTS` and `maptilerFace` (with their doc comment) from `render-directions.mjs:725-745` into `shared/map-beat/glyphs.mjs` as `export const FACE_WEIGHTS` / `export function maptilerFace(r)`, placed beside `assertNotFallback`, adding one sentence: a bare family is served as Noto Sans with a 200, which is why every text face asked of MapTiler goes through this name and `assertNotFallback`. Copy the file byte for byte to the root-template path. In `render-directions.mjs`, delete the two definitions and add `maptilerFace` to its imports from `#shared/map-beat/glyphs.mjs` (or add that import line).

- [ ] **Step 4: Run** `bun test --timeout 120000 skills/map-beat/test/maptiler-face.test.ts skills/splash/test/carried-copies.test.ts` — green.

- [ ] **Step 5: Prove the static renders did not move.** Run `bun proof/static-choropleth-europe-lowcarbon/render-directions.mjs` (plates are current; if it re-bakes, it needs the worktree `.env` as before), then `bun scripts/design-base/renders-moved.mjs proof/static-choropleth-europe-lowcarbon`. Expected: `same` ×3 and `compared N`. If `git status` shows re-written renders identical in geometry but different in bytes, restore them with `git checkout -- proof/static-choropleth-europe-lowcarbon/renders` after the `same` result, and say so.

- [ ] **Step 6: Mutation** — make `maptilerFace` keep `Regular` on italic → the italic test FAILS; restore.

- [ ] **Step 7: Commit** `feat(map-beat): the MapTiler face name is the trunk's, so a second beat asks for a real face and never Noto Sans`.

---

### Task 4: The static choropleth's subject, importable without rendering

**Files:** Create `proof/static-choropleth-europe-lowcarbon/beat.mjs`; modify `proof/static-choropleth-europe-lowcarbon/render-directions.mjs`.

**Interfaces:** Produces from `beat.mjs` (all pure or read-only file reads at call time, no module-level I/O, no spawn, no render):
- `loadSubject({ dir })` → `{ value, studySet, unreported, shapes, geo, BREAKS, FLOOR, ODD_ONE, NEIGHBOUR_CEILING, facts, offered, format, one, plain, french }` — it reads `data.csv` and `shapes.geojson` from `dir`, joins, builds shapes, runs every claim check the runner runs today and throws the same messages.
- `cameraFor({ width, height })`, `project`, `unproject`, `CAMERA_ASPECT`, `assertPlateShowsTheCamera`, `assertRoundingIsSubPixel` — moved unchanged.
- `copyOf(subject)` → `{ title, limits, reading, source, callout, waters, textPerRegister, eyebrow }` — the static copy ladders, unchanged.
- `rampFor(direction, subject)`, `layersFor(direction, g, placement, subject)` — moved; every module-level value they read (`BREAKS`, `studyAreas`, `seatOf`, `ODD_ONE`, `unproject`) is passed through `subject` or imported from `beat.mjs` itself.

- [ ] **Step 1: Record the baseline.** `git rev-parse HEAD` and confirm `bun scripts/design-base/renders-moved.mjs proof/static-choropleth-europe-lowcarbon` prints `same` ×3 on a clean tree (it compares to HEAD).

- [ ] **Step 2: Write the characterization test** `proof/static-choropleth-europe-lowcarbon/beat.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { copyOf, loadSubject } from "./beat.mjs";

describe("the choropleth subject, loaded without rendering", () => {
  const subject = loadSubject({ dir: import.meta.dirname });

  it("should find exactly the seven countries above the floor the title names", () => {
    const above = [...subject.value.values()].filter((v) => v.lowCarbon > subject.FLOOR).length;
    expect(above).toBe(7);
  });

  it("should draw the class breaks the static plate draws", () => {
    expect(subject.BREAKS).toEqual([40, 55, 70, 85, 94]);
  });

  it("should hand out the static beat's own title ladder", () => {
    expect(copyOf(subject).title.length).toBe(3);
  });
});
```

(The literal 7 and the breaks come from `render-directions.mjs:427-434, 519`; the ladder length from `:564`.)

- [ ] **Step 3: Run** — FAIL (module missing).

- [ ] **Step 4: Extract.** Move the listed code from `render-directions.mjs` into `beat.mjs` without changing any expression; wrap module-level data work into `loadSubject` and `copyOf`. The runner keeps: the directions loop, `ensurePlate`, `mapGeometryFor`/`placementsFor` calls, plan writing, `renderStill`, and its exports (`report`, `plans`, `geometry`, `placements`, `copy`) with the same values. Keep the filed/drawn rhythm untouched (it lives in the component).

- [ ] **Step 5: Run** the characterization test — green. Run `bun test --timeout 120000 skills/map-beat/test` (includes `pilot-choropleth.live.test.ts` only if its credential is present; otherwise record the skip).

- [ ] **Step 6: Prove nothing moved.** Re-run the static runner, then `renders-moved` → `same` ×3, `compared N`. Restore byte-only render churn as in Task 3 Step 5.

- [ ] **Step 7: Prove importing does not render.** `bun -e 'import("./proof/static-choropleth-europe-lowcarbon/beat.mjs").then(() => console.log("imported"))'` then `git status --short proof/static-choropleth-europe-lowcarbon` — nothing changed and no child process spawned (the output is only `imported`).

- [ ] **Step 8: Commit** `refactor(proof): the choropleth's subject is a module a second export can import, and the still does not move`.

---

### Task 5: The proxy that keeps the MapTiler key

**Files:** Create `skills/map-beat/scripts/maptiler-proxy.mjs`, `skills/map-beat/test/maptiler-proxy.test.ts`.

**Interfaces:**
- `stripKey(text, key, proxyOrigin)` → `string` — replaces `https://api.maptiler.com/` with `${proxyOrigin}/maptiler/` and removes `key=<key>` query parameters (`?key=K&` → `?`, `?key=K` → ``, `&key=K` → ``).
- `upstreamUrlFor(requestUrl, key)` → `URL | null` — `null` for any path not under `/maptiler/`; otherwise `https://api.maptiler.com/<rest>` with every incoming query parameter except `key`, plus `key`.
- `startMapTilerProxy({ key })` → `{ origin: string, stop(): void, counts: Record<string, number> }` — `Bun.serve({ hostname: "127.0.0.1", port: 0 })`; JSON responses pass through `stripKey`; binary responses pass through; every response carries `access-control-allow-origin: *`.

- [ ] **Step 1: Failing tests** (pure functions; no network):

```ts
import { describe, expect, it } from "bun:test";
import { stripKey, upstreamUrlFor } from "../scripts/maptiler-proxy.mjs";

const K = "abc123SECRET";
const ORIGIN = "http://127.0.0.1:4321";

describe("stripKey", () => {
  it("should route MapTiler URLs through the proxy", () => {
    expect(stripKey(`"https://api.maptiler.com/tiles/v3/{z}.pbf"`, K, ORIGIN)).toBe(`"${ORIGIN}/maptiler/tiles/v3/{z}.pbf"`);
  });
  it("should remove the key when it is the only parameter", () => {
    expect(stripKey(`https://api.maptiler.com/a.json?key=${K}`, K, ORIGIN)).toBe(`${ORIGIN}/maptiler/a.json`);
  });
  it("should remove the key when it is followed by another parameter", () => {
    expect(stripKey(`https://api.maptiler.com/a.json?key=${K}&mtsid=1`, K, ORIGIN)).toBe(`${ORIGIN}/maptiler/a.json?mtsid=1`);
  });
  it("should remove the key when it follows another parameter", () => {
    expect(stripKey(`https://api.maptiler.com/a.json?mtsid=1&key=${K}`, K, ORIGIN)).toBe(`${ORIGIN}/maptiler/a.json?mtsid=1`);
  });
});

describe("upstreamUrlFor", () => {
  it("should refuse a path outside /maptiler/", () => {
    expect(upstreamUrlFor(new URL(`${ORIGIN}/etc/passwd`), K)).toBeNull();
  });
  it("should forward to api.maptiler.com only, with the key added and a caller's key dropped", () => {
    const url = upstreamUrlFor(new URL(`${ORIGIN}/maptiler/maps/x/style.json?key=evil&a=1`), K)!;
    expect([url.origin, url.pathname, url.searchParams.get("key"), url.searchParams.get("a")]).toEqual([
      "https://api.maptiler.com", "/maps/x/style.json", K, "1",
    ]);
  });
});
```

- [ ] **Step 2: Run** — FAIL (module missing).

- [ ] **Step 3: Implement** `maptiler-proxy.mjs` with the three exports above and a header stating the credential rule (spec §4.3): the key is read by the caller (`mapTilerKeyIn` from `#shared/map-beat/glyphs.mjs` on the worktree env) and handed only to `startMapTilerProxy`; nothing here logs the key or a keyed URL; `counts` keys are `<kind> <status>` with no query string. Binding: `hostname: "127.0.0.1"`.

- [ ] **Step 4: Run** — green. **Mutations:** (a) drop the `&key=` replacement → the "follows another parameter" test FAILS; (b) accept any path → the `/etc/passwd` test FAILS; restore.

- [ ] **Step 5: Commit** `feat(map-beat): a live map reaches MapTiler through a local proxy that keeps the key out of the page`.

---

### Task 6: The live map engine in `map-beat`

**Files:** Create `skills/map-beat/scripts/video-faces.mjs`, `video-registers.mjs`, `choreography.mjs`, `skills/map-beat/assets/embedded-faces.ts`, `face-coverage.ts` (byte-identical `// twin/` copies of the `skills/chart-video` canonicals; `video-faces.mjs` imports `./typefaces.mjs`, which `map-beat/scripts` already carries, so identity holds); create `skills/map-beat/assets/live-map.ts`, `skills/map-beat/scripts/render-video-map.mjs`.

**Interfaces:**
- `useLiveMap({ plan, styleUrl, tints, frame, paint, mount })` → `RefObject<HTMLDivElement>` — `mount` is `mountPlan`, passed in by the proof composition because a skill asset may not import `#shared/*`; — boots MapLibre once (`delayRender` until `style.load` + `mountPlan(map, plan)` + first `idle`), and on every frame calls `paint(map, frame)` then holds the frame (`delayRender`) until `idle`; `cancelRender` on any map error. `paint` sets paint/layout properties only. Map created with `interactive: false`, `attributionControl: false`, `fadeDuration: 0`, `preserveDrawingBuffer: true`, style `transition: { duration: 0, delay: 0 }`, `bounds: plan.camera.bounds`, `fitBoundsOptions: { padding: 0, animate: false }`.
- `renderVideoMap({ entry, composition, propsPath, outDir, name, mapTilerKey, frames: "still" | "mp4" })` → `Promise<{ path, seconds }>` — starts the proxy, writes an empty env file in a `mkdtemp` dir, spawns `node_modules/.bin/remotion` with `--gl=swangle`, `--env-file=<empty>`, `--props=<propsPath>`, `--concurrency=1`, `--timeout=180000`, stops the proxy and removes the env dir in `finally`. The props file carries `styleUrl` built from the proxy origin — so the runner starts the proxy FIRST and writes props after; the signature therefore takes `buildProps(proxyOrigin) => Promise<string /* propsPath */>` instead of `propsPath`.

- [ ] **Step 1: Carry the five files** (`cp`, then confirm line 1 names the chart-video canonical). Run `bun test --timeout 120000 skills/splash/test/carried-copies.test.ts skills/splash/test/no-cross-skill-imports.test.ts` — green.

- [ ] **Step 2: Write `live-map.ts`** from the spike's `useDirectedMap.ts` shape (boot, `waitIdle`, per-frame hold), with `paint` injected instead of the spike's hard-coded opacity, `logOrigins` removed, and a header naming the renderer decision (spec §4.3) and the swangle requirement. Import `mountPlan` from `#shared/map-beat/mount.mjs` (a Remotion bundle resolves `#shared/*`; a skill asset may not import out — so this file imports `mountPlan` via a prop instead: `useLiveMap({ …, mount })`, and the proof composition passes `mountPlan` in).

- [ ] **Step 3: Write `render-video-map.mjs`** per the interface, importing `startMapTilerProxy` from `./maptiler-proxy.mjs`.

- [ ] **Step 4: Guards** — run `bun test --timeout 120000 skills/splash/test/a-video-render-hides-the-env.test.ts skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/carried-copies.test.ts`. The env guard must see `render-video-map.mjs`'s `--env-file`. **Mutation:** remove `--env-file` from the spawn → the env guard FAILS; restore.

- [ ] **Step 5: Smoke render** — a throwaway composition is not committed; the engine is exercised end to end by Task 11. Record that in the report.

- [ ] **Step 6: Commit** `feat(map-beat): the live map engine — a plan mounted per frame, the key behind the proxy, the page given no env`.

---

### Task 7: The pilot's subject and its choreography, before any code — OWNER CHECKPOINT

**Files:** Create `proof/video-choropleth-europe-lowcarbon/BRIEF.md` and `PALETTE.md` (a copy of the static beat's). The data and shapes are NOT copied: the runner reads them from the static beat directory through `loadSubject({ dir })`, and `BRIEF.md` says so.

- [ ] **Step 1: Read** the static beat's `BRIEF.md`, its renders (`renders/*.png`, look at all three), `skills/chart-video/references/directed-type-choreography.md`, `skills/map-beat/references/types/choropleth.md`.

- [ ] **Step 2: Write `BRIEF.md`** — front matter `format: video`, `type: choropleth`, `size: landscape`; the confirmed claim (seven countries above 94 % low-carbon in 2024: six in the north-west, and Albania, whose neighbours are all under 60 %); and **the choreography table**: `| event | what the shot says | gesture | what moves | derived value asserted |` covering `establish`, `reference`, `reveal`, `subject`, `conclusion`, `hold`, drawing on the repertoire (e.g. reveal the classes in order of value; filter to the seven above the floor; zoom onto the Balkans to name Albania against its neighbours' values; pull back to Europe with the seven named). Every derived value named (a count, a neighbours' maximum) is one the runner will compute from `loadSubject` and assert.

- [ ] **Step 3: STOP.** Present the choreography table to the owner and wait for approval or changes. Do not start Task 8 before an explicit yes. Record the decision in the ledger.

- [ ] **Step 4: Commit** the approved `BRIEF.md` + `PALETTE.md`: `docs(video-choropleth): the subject choreographed for video, before the code`.

---

### Task 8: The video frame, laid out in Bun

**Files:** Create `proof/video-choropleth-europe-lowcarbon/layout.mjs`, `layout.test.ts`.

**Interfaces:**
- `videoLayoutFor({ registers, copy, aspect, size: "landscape" })` → `{ frame: { width: 1920, height: 1080 }, inset, blocks: Array<{ id, register, lines: Array<{ text, x, y, width }> }>, mapBox: { x, y, width, height }, drawn: { width, height } }`. `registers` is the video seam's output (`videoRegistersOf`, each with `lead`); `copy` is `copyOf(subject)` rewritten for video (a short title form, no limits paragraph, a short source); text already cased with `applyCase`. Lines are wrapped with `measureText(text, { fontSize, fontWeight, fontFamily, fontStyle }) + letterSpacing × (chars − 1)` against the block width; baselines advance by `lead`; blocks are separated by `gapOf`-equivalent multiples of the carrying register's `lead`. The map takes the remaining rectangle at the camera's aspect (`CAMERA_ASPECT`) and `drawn` is its rounded size.

- [ ] **Step 1: Failing tests** (real fonts through the cache, no mocks): every line's measured width ≤ its block width; every baseline + descent ≤ frame height − inset; the map rectangle does not overlap any text block; `drawn.width / drawn.height` within 1 % of `CAMERA_ASPECT`; a title that cannot fit at its first form steps to the next form (fixture: an overlong title string).

- [ ] **Step 2–4:** implement until green, following the static `mapGeometryFor`'s ladder idea (choose on the filed rhythm, draw on the drawn one — spec §4.1 amendment; peer note in plan-1 ledger).

- [ ] **Step 5: Commit** `feat(video-choropleth): the video frame laid out with the still's own measurement`.

---

### Task 9: The timing contract and the per-event states

**Files:** Create `timing-contract.ts`, `timing.test.ts`, `states.mjs` (+ `states.test.ts`) in the pilot directory.

**Interfaces:** `CHOROPLETH_VIDEO_TIMING: BeatTiming` (from `#shared/chart-video/timing.ts`), total ≥ 10 s at 30 fps, hold ≥ 2 s (the frame carries more words than a line). `statesFor(subject, events)` → one `Record<string, number>` per event (the choreography of Task 7 as numbers: class reveal progress, filter strength, camera zoom/centre as numbers, count shown), passed through `assertEventStates`.

- [ ] Tests: `checkTiming(CHOROPLETH_VIDEO_TIMING)` returns `[]`; `hold.duration ≥ 60`; `statesFor` passes `assertEventStates`; each derived value in the BRIEF equals the number the state carries (hand-derived from the data: the count 7; the neighbours' maximum below 60).
- [ ] Mutation: make two consecutive states equal → `assertEventStates` refuses; restore.
- [ ] Commit `feat(video-choropleth): the edit, written as a contract and as states that each change the picture`.

---

### Task 10: The composition

**Files:** Create `DirectedChoroplethVideo.tsx`, `Root.tsx`, `index.ts` in the pilot directory.

**Requirements (acceptance, not code):**
- Imports `useEmbeddedFaces` / `useLiveMap` from `../../skills/map-beat/assets/…` and `mountPlan` from `#shared/map-beat/mount.mjs` (passed to `useLiveMap`).
- Props: `{ layout, registers, faces, plan, styleUrl, tints, states, timing, colours }` — all from the runner; nothing typed (the no-style guard scans the directory).
- Draws every text line at the coordinates `layout` gives, as SVG `<text>` with the register's family, size, weight, style, tracking and fill; each measured line carries `data-width` for the width-agreement check (spec §4.1: cancel when `|getComputedTextLength() − width| > max(1 px, 1 %)`; implement the check in `skills/chart-video/assets/embedded-faces.ts` beside the coverage check and carry it to `map-beat` in the same commit).
- Mounts the map in `layout.mapBox` at `layout.drawn` size; `paint(map, frame)` interpolates the current event's state from the previous event's (`progressOf`), setting class opacities, filter, and camera (`map.jumpTo`) — never an animation MapLibre runs itself.
- Draws nothing until faces are ready and the map has booted (a gate component, not an early `return null` before hooks).
- The first frame is not empty (`video-first-frame-not-empty`).
- Commit `feat(video-choropleth): the composition — furniture from the registers, the map mounted live, each event its own gesture`.

---

### Task 11: The runner, the renders, and the implementer's own looking

**Files:** Create `render-directions-video.mjs` in the pilot directory.

- [ ] Per filed direction: `readDirection` → `resolveDirectionFamilies(direction, textPerRegister)` → `composeDirections` + `report` printed → `registerOf` for the six registers (pass `ctx` if the trunk's `registerOf` takes one by then) → `videoRegistersOf` → `wantedOf` + `writeRenderProps` → `videoLayoutFor` → `plateTints` + `rampFor` + `layersFor` (from `beat.mjs`, fed the video geometry) → `makePlan` + `validatePlan` + `validateExpressions` + `assertNoDoubledBasemap` (empty lists required) → `rangesNeededBy` / `assertRangesServed` for every map word → `statesFor` → `renderVideoMap` still (`--frame=-1`) then mp4 → `renders/<id>.mp4` + `renders/<id>-props.json` (audit, no bytes, no key).
- [ ] `assertDeliveredSize` on the still (PNG) and the mp4 (ffprobe) → 1920×1080.
- [ ] Look: the final frame of each direction, then four frames per mp4 at the end of `reference`, mid-`reveal`, end of `subject`, last frame of `hold` — font, floors, nothing clipped, the accent never before its evidence, the zoom (if any) printing values it promised, the hold readable. Record what was seen in the report, with frame numbers.
- [ ] Recalibrate the width-agreement tolerance from the three directions' measured maximum and write the number into spec §4.1.
- [ ] Commit renders + runner `feat(video-choropleth): three directions rendered, looked at frame by frame`.

---

### Task 12: Owner review — OWNER CHECKPOINT

- [ ] `open proof/video-choropleth-europe-lowcarbon/renders/creme.mp4 proof/video-choropleth-europe-lowcarbon/renders/nocturne.mp4 proof/video-choropleth-europe-lowcarbon/renders/rapport.mp4`
- [ ] Wait for the owner. Each defect is fixed **in the skill** first (doctrine, seam, engine, guard, type sheet) when it is not specific to this subject, then the type is re-rendered and reopened. Ledger every round.

---

### Task 13: Lessons into the skills, and the old video retired

**Files:** `skills/chart-video/SKILL.md`, `skills/map-beat/SKILL.md`, `skills/map-beat/references/types/choropleth.md`, `docs/design-base/CATALOGUE.md`, `MATRIX.md`, `proof/mapgen-choropleth-video/` (removed).

- [ ] `chart-video/SKILL.md`: a "design base" section at `chart-beat`'s level (every direction, colours from the direction, numbers reproducible), the Bun/Chrome boundary, the seam and `k`, faces (`wantedOf`, casing), the choreography reference, the env-file rule; fix the stale lines (Remotion is in the root template; the seed's size).
- [ ] `map-beat/SKILL.md`: the video format now mounts the plan live (proxy, swangle, `useLiveMap`, `render-video-map.mjs`), replacing "draws the same image and paths" and "differ only in an order in time".
- [ ] `choropleth.md`: a "In video" section — what the type keeps, drops and transforms, its gestures, what broke at validation.
- [ ] `CATALOGUE.md` choropleth video ✅; `bun scripts/matrix.mjs` regenerates `MATRIX.md` (note it had drifted before this branch).
- [ ] Remove `proof/mapgen-choropleth-video/` (probe: `git ls-files proof/mapgen-choropleth-video | wc -l` > 0 and no other beat imports from it: `rg -l "mapgen-choropleth-video" --glob '!proof/mapgen-choropleth-video/**'` — update or stop on any hit).
- [ ] Commit per file group.
