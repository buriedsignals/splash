# Video quality pass — plan 1: prerequisites, mechanism, and the map-video spike

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the pieces every directed video needs — faces for several families and styles, the register-to-drawing seam scaled to the video size table, a guard that a directed video types no style — and answer, with a throwaway spike, how a map plan is rendered into a video, so plan 2 (map renderer + choropleth pilot) is written against facts.

**Architecture:** Registers are resolved in Bun through the design-base trunk (`registerOf`) and scaled to the video size row, then handed to a Remotion composition as plain props; the composition's faces arrive as bytes (`videoFaces` → `useEmbeddedFaces`). Nothing here renders a catalogue type yet — the first type rendered is the choropleth pilot, in plan 2.

**Tech Stack:** Bun, TypeScript/ESM, bun:test, Remotion 4.0.507, resvg (via `#shared/chart-beat/render-still.mjs`), MapLibre 4.7.1, Puppeteer.

**Spec:** `docs/splash/2026-09-13-video-quality-pass-spec.md` (commit `2913cc66`).

## Global Constraints

- Bun always; never npm, never node.
- Code, comments, commit messages and branch names in English. No mention of Claude or Anthropic anywhere.
- `git add` and `git commit` with explicit pathspecs; never `-A`, never bare.
- Targeted tests only; never the full `bun run test` unless the owner asks (`KNOWN-STATE.md` cost rule).
- Every new guard is mutation-verified: name the mutation that turns it red, run it, restore.
- `shared/` belongs to nobody: any change there is announced to the other sessions (web `sp1/`, scrolly `scrolly/`, static `rerender/`) before it starts, naming exact files, and every carried copy is updated in the same commit. This plan changes nothing under `shared/`.
- A file carried into another skill keeps line 1 `// twin/<canonical path>` and is byte-identical (`skills/splash/test/carried-copies.test.ts`).
- Nothing reads `.leading` directly outside `shared/design-base/register.mjs`, `shared/design-base/read-direction.mjs`, `shared/chart-beat/registers.mjs` (static branch guard `a-leading-is-read-only-through-the-register.test.ts`).
- Video type floors (`shared/chart-video/sizes.mjs`): landscape 1920×1080 `typeScale` 2.5 `minTypePx` 30; square 1080×1080 3.0 / 36; portrait 1080×1920 3.0 / 36, stage 269–1248.
- Open only mp4 files for the owner's review; frames are for the implementer's own looking.

---

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `skills/chart-video/scripts/video-faces.mjs` | modify — faces for a list of `{family, weight, style}` requests, not one stack | 1 |
| `skills/chart-video/assets/face-coverage.ts` | modify — a run's style must match the face's style | 1 |
| `skills/chart-video/assets/embedded-faces.ts` | modify — read each run's computed `font-style` | 1 |
| `skills/chart-video/test/video-faces.test.ts`, `face-coverage.test.ts` | extend | 1 |
| `skills/chart-video/scripts/video-registers.mjs` | create — `scaleRegister` (pure) and `videoRegistersOf(direction, sizeName)` | 2 |
| `skills/chart-video/test/video-registers.test.ts` | create | 2 |
| `skills/splash/test/a-directed-video-types-no-style.test.ts` | create — the guard | 3 |
| `docs/splash/2026-09-13-video-quality-pass-spec.md` | modify — §4.1 (layout measured in Bun) and §4.3 (map renderer), after the owner's decision | 4 |

---

### Task 0: Rebase onto the merged static pass and confirm the trunk

Precondition: the owner has merged `rerender/static-corpus` into `main`. Do not start before.

**Files:** none modified.

- [ ] **Step 1: Confirm the merge landed**

Run: `git -C /Users/rmdms/Sites/Professional/splash/video fetch --all 2>/dev/null; git -C /Users/rmdms/Sites/Professional/splash/video log --oneline main -- shared/design-base/register.mjs | head -3`
Expected: at least one commit (the static branch's `ed8cc50d` or its merge). If empty: STOP, the merge has not landed.

- [ ] **Step 2: Rebase**

Run: `git -C /Users/rmdms/Sites/Professional/splash/video rebase main`
Expected: success. Conflicts are only possible in files both branches touched; on `quality/video` that is `skills/chart-video/scripts/typefaces.mjs` (carried copy — take the result that equals `shared/design-base/typefaces.mjs` byte for byte). If any other file conflicts: STOP and report.

- [ ] **Step 3: Confirm the signatures this plan is written against**

Run:
```bash
cd /Users/rmdms/Sites/Professional/splash/video && bun -e '
import * as r from "#shared/design-base/register.mjs";
import { naturalLineHeightOf } from "#shared/design-base/vertical-metrics.mjs";
import { filedDirections, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { REGISTERS } from "#shared/chart-beat/registers.mjs";
const d = resolveDirectionFamilies(filedDirections()[0], {});
const reg = r.registerOf(d, "body");
console.log(Object.keys(r).sort().join(","));
console.log(REGISTERS.join(","));
console.log(Object.keys(reg).sort().join(","));
console.log(typeof r.leadOf(reg), naturalLineHeightOf("Open Sans", 400).toFixed(3));'
```
Expected, line by line:
1. contains `EYEBROW_TO_DISPLAY,READING_TO_SOURCE,capRatioOf,gapOf,leadOf,registerOf`
2. `display,eyebrow,body,annot,value,axis` (order may differ; the six names must be present)
3. contains `fill,filedSize,fontFamily,fontSize,fontStyle,fontWeight,letterSpacing,lineHeight,naturalLineHeight,transform`
4. `number 1.362`

If any differs: STOP. Tasks 2–3 are written against these names.

- [ ] **Step 4: Re-run this branch's own tests on the rebased tree**

Run: `bun test skills/chart-video/test skills/splash/test/carried-copies.test.ts skills/splash/test/video-helper-parity.test.ts`
Expected: 0 fail.

---

### Task 1: Faces for several families and both styles

A directed video sets its display register in one family (Merriweather in `creme`) and its body in another (Open Sans), sometimes italic. `videoFaces` takes one stack and upright weights only.

**Files:**
- Modify: `skills/chart-video/scripts/video-faces.mjs`
- Modify: `skills/chart-video/assets/face-coverage.ts`
- Modify: `skills/chart-video/assets/embedded-faces.ts`
- Test: `skills/chart-video/test/video-faces.test.ts`, `skills/chart-video/test/face-coverage.test.ts`

**Interfaces:**
- Consumes: `embeddedWebFaces(wanted: Array<{family, weight?, style?}>, text)` from `./typefaces.mjs` (already supports several families and italic).
- Produces:
  - `videoFaces({ wanted?, stack?, weights?, props })` → `Promise<{ fontFamily: string|null, faces: EmbeddedFace[] }>` — `wanted` wins; `stack`+`weights` stay valid for existing callers.
  - `writeRenderProps({ props, wanted?, stack?, weights?, auditPath })` → `Promise<string>`.
  - `DrawnRun = { text: string; family: string; weight: number; style?: "normal" | "italic" }` — absent `style` means `"normal"`.

- [ ] **Step 1: Write the failing tests**

Append to `skills/chart-video/test/face-coverage.test.ts`, inside `describe("uncoveredText", …)`:

```ts
  it("should report an italic run when only the upright face was embedded", () => {
    const faces = [openSans(400, "U+61")];
    const runs = [{ text: "a", family: "Open Sans", weight: 400, style: "italic" as const }];
    expect(uncoveredText(runs, faces)).toEqual([
      { codePoint: 0x61, family: "Open Sans", weight: 400 },
    ]);
  });

  it("should accept an italic run set in an embedded italic face", () => {
    const faces = [{ ...openSans(400, "U+61"), style: "italic" as const }];
    const runs = [{ text: "a", family: "Open Sans", weight: 400, style: "italic" as const }];
    expect(uncoveredText(runs, faces)).toEqual([]);
  });
```

Append to `skills/chart-video/test/video-faces.test.ts`, inside `describe("videoFaces", …)`:

```ts
  it("should embed every family and style a directed video asks for", async () => {
    const { faces } = await videoFaces({
      wanted: [
        { family: "Merriweather", weight: 700 },
        { family: "Open Sans", weight: 400 },
        { family: "Open Sans", weight: 400, style: "italic" },
      ],
      props: { title: "Émissions de CO₂" },
    });
    const runs = [
      { text: "Émissions de CO₂", family: "Merriweather", weight: 700 },
      { text: "Émissions de CO₂", family: "Open Sans", weight: 400 },
      { text: "Émissions de CO₂", family: "Open Sans", weight: 400, style: "italic" as const },
    ];
    expect(uncoveredText(runs, faces)).toEqual([]);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `bun test skills/chart-video/test/face-coverage.test.ts skills/chart-video/test/video-faces.test.ts`
Expected: `should report an italic run…` FAILS (returns `[]`, style ignored); `should embed every family…` FAILS (`wanted` ignored → Merriweather and italic runs reported).

- [ ] **Step 3: Implement**

In `skills/chart-video/assets/face-coverage.ts`, change the run type and the match:

```ts
export type DrawnRun = { text: string; family: string; weight: number; style?: "normal" | "italic" };
```

and in `uncoveredText`, destructure `style` and add it to the key and the condition:

```ts
  for (const { text, family, weight, style = "normal" } of runs) {
    for (const ch of text) {
      if (INKLESS.test(ch)) continue;
      const codePoint = ch.codePointAt(0)!;
      const key = `${family}|${weight}|${style}|${codePoint}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const covered = parsed.some(
        ({ face, ranges }) =>
          face.family === family &&
          face.style === style &&
          weight >= face.weight &&
          weight <= face.weightTo &&
          ranges.some(([lo, hi]) => codePoint >= lo && codePoint <= hi),
      );
      if (!covered) out.push({ codePoint, family, weight });
    }
  }
```

In `skills/chart-video/assets/embedded-faces.ts`, `drawnRuns` pushes the computed style:

```ts
    runs.push({
      text,
      family: style.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, ""),
      weight: Number.parseInt(style.fontWeight, 10),
      style: style.fontStyle === "italic" || style.fontStyle.startsWith("oblique") ? "italic" : "normal",
    });
```

In `skills/chart-video/scripts/video-faces.mjs`, replace `videoFaces` and `writeRenderProps`:

```js
/**
 * @param {{wanted?: Array<{family: string, weight?: number, style?: "normal"|"italic"}>,
 *          stack?: string, weights?: number[], props: object}} beat
 *        `wanted` is what a directed video passes — one entry per family × weight × style its
 *        registers resolve to. `stack` + `weights` is the single-family form the seed uses.
 */
export async function videoFaces({ wanted, stack, weights, props }) {
  const requests =
    wanted ?? [...new Set(weights)].map((weight) => ({ family: requestedFamily(stack), weight }));
  const faces = await embeddedWebFaces(requests, [LATIN_1, ...stringsOf(props)].join("\n"));
  return {
    fontFamily: stack ?? null,
    faces: faces.map(({ family, style, weight, weightTo, unicodeRange, base64 }) => ({
      family,
      style,
      weight,
      weightTo,
      unicodeRange,
      base64,
    })),
  };
}

export async function writeRenderProps({ props, wanted, stack, weights, auditPath }) {
  const typeface = await videoFaces({ wanted, stack, weights, props });
  const rendered = { ...props, ...typeface };
  const audit = { ...props, ...typeface, faces: typeface.faces.map(({ base64, ...face }) => face) };
  await writeFile(auditPath, JSON.stringify(audit, null, 2));
  const renderPath = join(await mkdtemp(join(tmpdir(), "video-props-")), "props.json");
  await writeFile(renderPath, JSON.stringify(rendered));
  return renderPath;
}
```

Keep the existing JSDoc block above `writeRenderProps`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `bun test skills/chart-video/test`
Expected: 0 fail.

- [ ] **Step 5: Mutation check**

Using a scratch copy and restore (never `git stash`):
- M1: delete `face.style === style &&` in `face-coverage.ts` → `should report an italic run…` must FAIL.
- M2: in `videoFaces`, replace `wanted ??` with `undefined ??` → `should embed every family…` must FAIL.
Restore; re-run Step 4; 0 fail.

- [ ] **Step 6: Render the seed once to prove the browser half still holds**

Run: `bun skills/chart-video/scripts/render-preview.mjs --check`
Expected: `preview.png matches a fresh render of the seed.`

- [ ] **Step 7: Commit**

```bash
P=(skills/chart-video/scripts/video-faces.mjs skills/chart-video/assets/face-coverage.ts skills/chart-video/assets/embedded-faces.ts skills/chart-video/test/video-faces.test.ts skills/chart-video/test/face-coverage.test.ts)
git add -- "${P[@]}" && git commit -m "feat(video): a video embeds every family and style its registers resolve to, and an italic run needs an italic face" -- "${P[@]}"
```

---

### Task 2: The register-to-drawing seam, at the video size

**Files:**
- Create: `skills/chart-video/scripts/video-registers.mjs`
- Test: `skills/chart-video/test/video-registers.test.ts`

**Interfaces:**
- Consumes: `registerOf(direction, name)` and its returned `fontFamily, fontSize, fontWeight, fontStyle, letterSpacing, transform, lineHeight` (em multiple), `fill` (`#shared/design-base/register.mjs`); `REGISTERS` (`#shared/chart-beat/registers.mjs`); `sizeFor(name)` → `{ width, height, typeScale, minTypePx, stage }` (`#shared/chart-video/sizes.mjs`).
- Produces:
  - `scaleRegister(resolved, { typeScale, minTypePx })` → `VideoRegister = { fontFamily, fontSize, fontWeight, fontStyle, letterSpacing, transform, lead, fill }` where `lead` is the baseline-to-baseline distance in frame pixels.
  - `videoRegistersOf(direction, sizeName)` → `Record<"display"|"eyebrow"|"body"|"annot"|"value"|"axis", VideoRegister>`; `direction` must already have gone through `resolveDirectionFamilies`.

- [ ] **Step 1: Write the failing tests**

Create `skills/chart-video/test/video-registers.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { filedDirections, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { scaleRegister, videoRegistersOf } from "../scripts/video-registers.mjs";

/**
 * A register filed for a 960×540 still is resolved by the trunk (cap height, the face's own line)
 * and then drawn at the VIDEO size: multiplied by the row's type scale and never below its floor.
 * The lead travels in pixels — the web seam dropped it without a word, and this one must not.
 */

const LANDSCAPE = { typeScale: 2.5, minTypePx: 30 };
const body = {
  fontFamily: "Open Sans",
  fontSize: 13,
  fontWeight: 400,
  fontStyle: "normal",
  letterSpacing: 0.26,
  transform: "none",
  lineHeight: 1.9068,
  fill: "#61605a",
};

describe("scaleRegister", () => {
  it("should multiply the size by the row's type scale", () => {
    expect(scaleRegister(body, LANDSCAPE).fontSize).toBeCloseTo(32.5, 6);
  });

  it("should carry the lead in pixels at the drawn size", () => {
    expect(scaleRegister(body, LANDSCAPE).lead).toBeCloseTo(61.971, 3);
  });

  it("should scale the tracking with the size", () => {
    expect(scaleRegister(body, LANDSCAPE).letterSpacing).toBeCloseTo(0.65, 6);
  });

  it("should lift a register the scale leaves under the floor to the floor", () => {
    const axis = { ...body, fontSize: 11.44 };
    expect(scaleRegister(axis, LANDSCAPE).fontSize).toBe(30);
  });

  it("should lead a lifted register on its lifted size", () => {
    const axis = { ...body, fontSize: 11.44 };
    expect(scaleRegister(axis, LANDSCAPE).lead).toBeCloseTo(57.204, 3);
  });
});

describe("videoRegistersOf", () => {
  const text = { display: "Émissions de CO₂", eyebrow: "Climat", body: "Source", annot: "Lecture", value: "12,5", axis: "2024" };

  for (const direction of filedDirections()) {
    it(`should draw every ${direction.id} register at or above the landscape floor`, () => {
      const registers = videoRegistersOf(resolveDirectionFamilies(direction, text), "landscape");
      const under = Object.entries(registers).filter(([, r]) => r.fontSize < 30).map(([name]) => name);
      expect([direction.id, under]).toEqual([direction.id, []]);
    });
  }
});
```

Hand derivation of the literals: 13 × 2.5 = 32.5; 1.9068 × 32.5 = 61.971; 0.26 × 32.5 / 13 = 0.65; 11.44 × 2.5 = 28.6 < 30 → 30; 1.9068 × 30 = 57.204.

- [ ] **Step 2: Run to see it fail**

Run: `bun test skills/chart-video/test/video-registers.test.ts`
Expected: FAIL — `Cannot find module '../scripts/video-registers.mjs'`.

- [ ] **Step 3: Implement**

Create `skills/chart-video/scripts/video-registers.mjs`:

```js
// twin/skills/chart-video/scripts/video-registers.mjs
//
// A DIRECTION'S REGISTERS, DRAWN AT A VIDEO SIZE.
//
// The trunk resolves a register the way the still does — its filed size read as a cap height on
// its role's ladder head, its line as a coefficient of the face's own declared line
// (`registerOf`). What it resolves is a register for a 960×540 still read in an article column. A
// video is watched: the size row's `typeScale` carries it to the frame, and `minTypePx` is the
// floor no register may be drawn under (`sizes.mjs` states where 30 and 36 come from). A register
// the scale leaves under the floor is lifted to it, and led on the size it is actually drawn at.
//
// THE LEAD TRAVELS, IN PIXELS. `shared/design-base/web.mjs` turns a register into a style and
// drops the leading without a word; a composition reading this object cannot, because `lead` is
// one of the fields it draws with.
//
// Runs in Bun only: `registerOf` measures through resvg, which no browser bundle can load. The
// composition receives the result as props.

import { registerOf } from "#shared/design-base/register.mjs";
import { REGISTERS } from "#shared/chart-beat/registers.mjs";
import { sizeFor } from "#shared/chart-video/sizes.mjs";

/**
 * @param {{fontFamily: string, fontSize: number, fontWeight: number, fontStyle: string,
 *          letterSpacing: number, transform: string, lineHeight: number, fill: string}} resolved
 *        a register as `registerOf` returns it — `lineHeight` is a multiple of the size
 * @param {{typeScale: number, minTypePx: number}} row  a row of the video size table
 */
export function scaleRegister(resolved, { typeScale, minTypePx }) {
  const fontSize = Math.max(Math.round(resolved.fontSize * typeScale * 100) / 100, minTypePx);
  return {
    fontFamily: resolved.fontFamily,
    fontSize,
    fontWeight: resolved.fontWeight,
    fontStyle: resolved.fontStyle,
    letterSpacing: (resolved.letterSpacing * fontSize) / resolved.fontSize,
    transform: resolved.transform,
    lead: resolved.lineHeight * fontSize,
    fill: resolved.fill,
  };
}

/** Every register of a direction that has been through `resolveDirectionFamilies`, at `sizeName`. */
export function videoRegistersOf(direction, sizeName) {
  const row = sizeFor(sizeName);
  return Object.fromEntries(REGISTERS.map((name) => [name, scaleRegister(registerOf(direction, name), row)]));
}
```

- [ ] **Step 4: Run to see it pass**

Run: `bun test skills/chart-video/test/video-registers.test.ts`
Expected: 0 fail. If a `videoRegistersOf` floor test fails for a direction, the `Math.max` is not applied — do not weaken the test.

- [ ] **Step 5: Mutation check**

- M1: remove `Math.max(…, minTypePx)` (keep the scaled size) → `should lift a register…` FAILS.
- M2: `lead: resolved.lineHeight * resolved.fontSize` → `should carry the lead in pixels…` FAILS.
- M3: `letterSpacing: resolved.letterSpacing` → `should scale the tracking…` FAILS.
Restore; re-run Step 4.

- [ ] **Step 6: Confirm the leading guard and imports guard stay green**

Run: `bun test skills/splash/test/a-leading-is-read-only-through-the-register.test.ts skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/carried-copies.test.ts`
Expected: 0 fail (the seam reads `.lineHeight`, never `.leading`).

- [ ] **Step 7: Commit**

```bash
P=(skills/chart-video/scripts/video-registers.mjs skills/chart-video/test/video-registers.test.ts)
git add -- "${P[@]}" && git commit -m "feat(video): a direction's registers drawn at a video size, on the floor, with their lead in pixels" -- "${P[@]}"
```

---

### Task 3: A directed video types no style

The static branch ratchets typed leading in directed stills (`a-directed-layout-types-no-leading.test.ts`), which does not scan `render-directions-video.mjs` beats. This guard is the video counterpart, wider: a directed video composition takes every size, weight, lead, tracking and colour from its registers and direction.

**Files:**
- Create: `skills/splash/test/a-directed-video-types-no-style.test.ts`

**Interfaces:**
- Consumes: the tree layout from spec §4.4 — `proof/video-<type>/Directed<Type>Video.tsx` beside `render-directions-video.mjs`.
- Produces: `typedStylesIn(source: string): string[]` (test-local).

- [ ] **Step 1: Write the test (the scanner is exercised on literal sources, so it can go red today)**

Create `skills/splash/test/a-directed-video-types-no-style.test.ts`:

```ts
/**
 * A DIRECTED VIDEO TAKES ITS STYLE FROM ITS DIRECTION, OR IT IS NOT DIRECTED.
 *
 * The video beats that predate the design base type everything: `FONT_FAMILY = "Helvetica…"`,
 * `TITLE: { fontSize: 38, fontWeight: 700, lead: 48 }`, a hex per mark. A directed video receives
 * its registers (`videoRegistersOf`) and its direction's colours as props, so any of those literals
 * in its composition is a value the direction no longer controls — and the second direction is
 * where it shows. The static twin of this guard scans only `render-directions.mjs` beats.
 *
 * WHAT IT DOES NOT CATCH: a literal hidden behind a variable (`const s = 38; fontSize={s}`), or a
 * colour computed by `mix` from a typed hex. It reads source text.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");

const RULES: Array<[string, RegExp]> = [
  ["a typed font size", /fontSize\s*[:=]\s*\{?\s*\d/],
  ["a typed font weight", /fontWeight\s*[:=]\s*\{?\s*\d/],
  ["a typed lead", /\blead\s*:\s*\d/],
  ["a typed line height", /lineHeight\s*[:=]\s*\{?\s*\d/],
  ["a typed tracking", /letterSpacing\s*[:=]\s*\{?\s*-?\d*\.?\d*[1-9]/],
  ["a typed family", /(FONT_FAMILY|fontFamily)\s*[:=]\s*\{?\s*["'`][A-Z]/],
  ["a typed colour", /["'`]#[0-9a-fA-F]{3,8}["'`]/],
];

export function typedStylesIn(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return RULES.filter(([, re]) => re.test(code)).map(([name]) => name);
}

function directedVideos(): string[] {
  const proof = join(ROOT, "proof");
  const out: string[] = [];
  for (const dir of readdirSync(proof)) {
    const beat = join(proof, dir);
    if (!existsSync(join(beat, "render-directions-video.mjs"))) continue;
    for (const file of readdirSync(beat))
      if (/^Directed.*Video\.tsx$/.test(file)) out.push(join(beat, file));
  }
  return out;
}

describe("the scanner", () => {
  it("should find a typed size", () => {
    expect(typedStylesIn(`<text fontSize={38}>`)).toEqual(["a typed font size"]);
  });
  it("should find a typed lead in a token table", () => {
    expect(typedStylesIn(`const T = { lead: 48 };`)).toEqual(["a typed lead"]);
  });
  it("should find a typed colour", () => {
    expect(typedStylesIn(`fill="#aac9e0"`)).toEqual(["a typed colour"]);
  });
  it("should find a typed family", () => {
    expect(typedStylesIn(`export let FONT_FAMILY = "Open Sans, Helvetica";`)).toEqual(["a typed family"]);
  });
  it("should accept a composition that draws from its registers", () => {
    const source = `<text fontSize={r.display.fontSize} fontWeight={r.display.fontWeight} fill={ink}
      letterSpacing={0} fontFamily={r.display.fontFamily} y={top + r.display.lead}>`;
    expect(typedStylesIn(source)).toEqual([]);
  });
  it("should not read a size written in a comment", () => {
    expect(typedStylesIn(`// it used to say fontSize: 38\n<text fontSize={r.body.fontSize}>`)).toEqual([]);
  });
});

describe("every directed video in the tree", () => {
  for (const path of directedVideos()) {
    it(`${path.slice(ROOT.length + 1)} should type no style`, () => {
      expect(typedStylesIn(readFileSync(path, "utf8"))).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: Run it**

Run: `bun test skills/splash/test/a-directed-video-types-no-style.test.ts`
Expected: 6 pass (no directed video exists yet, so the second describe is empty — the scanner cases carry the proof).

- [ ] **Step 3: Mutation check**

- M1: delete the `a typed colour` rule → `should find a typed colour` FAILS.
- M2: remove the comment-stripping `.replace(/^\s*\/\/.*$/gm, "")` → `should not read a size written in a comment` FAILS.
- M3: change the tracking regex to `/letterSpacing\s*[:=]\s*\{?\s*-?\d/` → `should accept a composition…` FAILS (`letterSpacing={0}` must stay allowed).
Restore; re-run Step 2.

- [ ] **Step 4: Confirm it lands in the fast lane**

Run: `bun scripts/test-lanes.mjs --fast | grep a-directed-video-types-no-style`
Expected: one line.

- [ ] **Step 5: Commit**

```bash
P=(skills/splash/test/a-directed-video-types-no-style.test.ts)
git add -- "${P[@]}" && git commit -m "test(video): a directed video takes its sizes, weights, leads, tracking and colours from its direction" -- "${P[@]}"
```

---

### Task 4: Spike — how a map plan becomes a video (throwaway)

`skills/map-beat/references/map-plan.md` §1 names the video renderer "mounted, captured frame by frame", and the static pilot bakes its marks into the plate. A video reveal needs marks that change over time, and the provider key is hydrated only inside Engine's sealed bake (`README.md`, Credentials). Before plan 2 is written, measure which of these renders a plan into frames, and at what cost. **Nothing from this task is committed except the report's conclusion in the spec (Step 7).**

**Files:**
- Create (untracked, deleted at Step 8): `proof/_spike-map-video/`
- Modify at Step 7 only: `docs/splash/2026-09-13-video-quality-pass-spec.md` §4.1, §4.3

- [ ] **Step 1: Set up the throwaway workspace from the static pilot's own plan**

```bash
cd /Users/rmdms/Sites/Professional/splash/video
mkdir -p proof/_spike-map-video
bun proof/static-choropleth-europe-lowcarbon/render-directions.mjs > proof/_spike-map-video/static-run.txt 2>&1; echo exit=$?
ls proof/static-choropleth-europe-lowcarbon/plate/
```
Expected: `exit=0`; one plate directory per direction, each with `plate.png` and `geometry.json`. Copy one direction's written plan (the path is printed in `static-run.txt`, or re-create it with `makePlan` from the exported `plans`) to `proof/_spike-map-video/plan.json`.

- [ ] **Step 2: Probe A — plan mounted live inside a Remotion composition**

Write `proof/_spike-map-video/LiveMap.tsx`: a composition that creates a `maplibregl.Map` on a div at the plan's drawn size, loads the plan's style with `transformStyle`, calls `mountPlan(map, plan)`, and on each frame sets the `classes` layer's `fill-opacity` from `interpolate(frame, [0, 60], [0, 1])`, then `delayRender` until `map.once("idle")`. Render 90 frames:
```bash
bunx remotion render proof/_spike-map-video/index.ts live proof/_spike-map-video/live.mp4 --gl=angle --concurrency=1
```
Record: does it render at all; seconds per frame; are two renders of frame 45 byte-identical (`ffmpeg -i live.mp4 -vf "select=eq(n\,45)" -vsync 0 -frames:v 1 a.png`, twice, `cmp`); did tiles or glyphs need the network and the MapTiler key at render time (watch requests with `--log=verbose`).

- [ ] **Step 3: Probe B — baked basemap plate as an image source, marks mounted without provider tiles**

Write `proof/_spike-map-video/PlateMap.tsx`: a MapLibre style with no provider source — one `image` source whose `coordinates` are the plate's `geometry.json` `frameCorners`, plus the plan's own GeoJSON layers; glyphs served locally from the cache `serveGlyphs(dir)` uses. Same per-frame opacity and `idle` wait. Render 90 frames as in Step 2.
Record the same four measurements.

- [ ] **Step 4: Probe C — per-layer transparent plates composited in React**

Bake the `classes` layer group and the `subject-ring`/label groups as separate transparent PNGs (bake the plan with the basemap layers hidden), stack them as `<Img>` in a composition with per-layer opacity. Render 90 frames.
Record: renders; seconds per frame; determinism; whether a per-country reveal is possible (it is not unless baked per country — count the bakes that would need).

- [ ] **Step 5: Look at the frames**

For each mp4 extract frames 0, 45, 89 and look: registration of marks over the basemap (a 1 px misalignment at country borders is a fail), label crispness, whether the reveal is visible.

- [ ] **Step 6: Write the report and bring it to the owner**

In the session scratchpad, a table per probe: renders (yes/no), s/frame, deterministic (yes/no), needs key at render (yes/no), per-feature reveal possible (yes/no), registration defect (px). Recommend one renderer, with the evidence. Ask the owner to decide. Do not proceed to Step 7 without the decision.

- [ ] **Step 7: Amend the spec with the decision**

Edit `docs/splash/2026-09-13-video-quality-pass-spec.md`:
- §4.1: layout measured in Bun (resvg, the same font files) — the map's drawn size must be known before a plate or plan is built — and verified in Chrome against the drawn widths; replace the sentence saying the composition measures its wraps with `measureText`.
- §4.3: the renderer the owner chose, with the spike's numbers.

```bash
P=(docs/splash/2026-09-13-video-quality-pass-spec.md)
git add -- "${P[@]}" && git commit -m "docs(video): layout is measured where the still measures it, and a map plan reaches a video through the renderer the spike proved" -- "${P[@]}"
```

- [ ] **Step 8: Delete the throwaway workspace**

Probe before deleting: `git -C /Users/rmdms/Sites/Professional/splash/video status --short proof/_spike-map-video` must list only `??` entries (untracked). Then `rm -r /Users/rmdms/Sites/Professional/splash/video/proof/_spike-map-video`.

---

## What plan 2 covers (written after Task 4's decision)

Not tasks here — the content depends on the spike. Plan 2 will hold: the map video renderer on the chosen path, carried into `map-beat` with `// twin/` copies of `video-faces.mjs`, `video-registers.mjs`, `embedded-faces.ts`, `face-coverage.ts`; the Chrome-side layout-agreement guard; the choropleth pilot `proof/video-choropleth-europe-lowcarbon/` (BRIEF, video copy ladder, timing contract and test, Bun layout, one plan per direction, three mp4, frames, owner review); the choropleth video section in `skills/map-beat/references/types/`; the `chart-video` and `map-beat` SKILL.md design-base sections; the catalogue and matrix updates; retiring `proof/mapgen-choropleth-video`. After the pilot is validated, each further type follows spec §5 as its own short plan.
