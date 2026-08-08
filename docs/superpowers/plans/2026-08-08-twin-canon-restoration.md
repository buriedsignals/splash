# Twin Canon Restoration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the twin's nine skills actually obey the Tom canon they claim — one seed per genre with sample-data, preview and output-proof; zero runtime cross-skill imports; and copied helpers that fail loudly when they disagree.

**Architecture:** Nothing is extracted into a shared library. Skills stay copy-pasteable; duplication is kept on purpose and guarded by a behavioural parity test. Story artifacts move out of `skills/*/assets/` into story workspaces under `proof/`, which gains the `#shared/*` imports map a real Splash root uses — so the proof stories exercise the real import mechanism instead of absolute machine paths.

**Tech Stack:** Bun, `bun:test`, React 19 + `react-dom/server`, Remotion 4.0.507, `@resvg/resvg-js`, d3-scale/array/shape.

## Global Constraints

- Work in `/Users/rmdms/Sites/Professional/splash-twin`, branch `experiment/doctrine-twin`. Never merge to `main`.
- All code, comments, identifiers and commit messages in **English**. No mention of Claude or Anthropic anywhere.
- Baseline before starting: `cd twin && bun test` = **382 tests, 379 pass, 3 skip, 0 fail**. No task may reduce pass count.
- **No cross-skill imports at RUNTIME.** A test may import across skills solely to assert two implementations agree.
- **No shared library.** Do not create `shared/beat-kit/` or any module that skills import from each other. Duplication is the design.
- A seed is marked with this exact string: `REPLACE ME. Do not parameterise me.`
- Seeds are written from scratch. Never produced by stripping a story's component — it would teach that story's shape by accident.
- Scripts under `skills/*/scripts/` are ESM. Only `render-still.mjs`, `render-preview.mjs` and Remotion drivers may use root dependencies; all others stay dependency-free.
- Every claim of "done" is proven by running a command and reading its output, never by reading a diff.

---

### Task 1: Give the repository a live `shared/` and an imports map

Fixes defect A (spec §5.4bis): two story files import by absolute machine path. Nothing can move until stories have a legitimate way to reach the craft mechanism.

**Files:**
- Create: `twin/shared/twin-chart-beat/render-still.mjs` (physical copy of `twin/skills/twin-chart-beat/scripts/render-still.mjs`)
- Create: `twin/shared/twin-chart-beat/inspect-render.mjs` (physical copy of `twin/skills/twin-chart-beat/scripts/inspect-render.mjs`)
- Modify: `twin/package.json` — add the `imports` map
- Modify: `twin/proof/EmissionsLine.tsx:26-30`, `twin/proof/RankBars.tsx:17-21`
- Test: `twin/skills/splash-twin/test/root-template-shared.test.ts` (extend)

**Interfaces:**
- Consumes: nothing.
- Produces: the specifier `#shared/twin-chart-beat/render-still.mjs`, resolving to `twin/shared/twin-chart-beat/render-still.mjs`. Every later task uses this specifier from story files. Exports carried over unchanged: `renderStill`, `deriveFurniture`, `measureText`, `FONT_FAMILY`.

- [ ] **Step 1: Write the failing test**

Append to `twin/skills/splash-twin/test/root-template-shared.test.ts`:

```ts
import { existsSync } from "node:fs";

const LIVE_SHARED = join(import.meta.dirname, "..", "..", "..", "shared", "twin-chart-beat");

describe("twin/shared — the repository's own live shared/, so proof stories import the way a real beat does", () => {
  for (const name of ["render-still.mjs", "inspect-render.mjs"]) {
    it(`should carry ${name}, byte-identical to the canonical script`, async () => {
      expect(existsSync(join(LIVE_SHARED, name))).toBe(true);
      const canonical = await readFile(join(CANONICAL_DIR, name), "utf8");
      const live = await readFile(join(LIVE_SHARED, name), "utf8");
      expect(live).toBe(canonical);
    });
  }

  it("should be reachable through the #shared specifier declared in package.json", async () => {
    const pkg = JSON.parse(
      await readFile(join(import.meta.dirname, "..", "..", "..", "package.json"), "utf8"),
    );
    expect(pkg.imports?.["#shared/*"]).toBe("./shared/*");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/splash-twin/test/root-template-shared.test.ts`
Expected: FAIL — `expect(existsSync(...)).toBe(true)` receives `false`.

- [ ] **Step 3: Create the live shared/ and the imports map**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin/twin
mkdir -p shared/twin-chart-beat
cp skills/twin-chart-beat/scripts/render-still.mjs shared/twin-chart-beat/render-still.mjs
cp skills/twin-chart-beat/scripts/inspect-render.mjs shared/twin-chart-beat/inspect-render.mjs
```

In `twin/package.json`, add after `"type": "module",`:

```json
  "imports": { "#shared/*": "./shared/*" },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd twin && bun test skills/splash-twin/test/root-template-shared.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Replace the two absolute-path imports**

In `twin/proof/EmissionsLine.tsx`, replace the import ending at line 30 — change the specifier only, keep the named imports exactly as they are:

```ts
} from "#shared/twin-chart-beat/render-still.mjs";
```

Same edit in `twin/proof/RankBars.tsx` (import ending at line 21).

- [ ] **Step 6: Prove no absolute path survives**

Run: `cd twin && grep -rn "/Users/" proof skills --include=*.tsx --include=*.ts --include=*.mjs | grep -v node_modules`
Expected: no output.

- [ ] **Step 7: Run the full suite**

Run: `cd twin && bun test`
Expected: 382 tests, 379 pass, 3 skip, 0 fail.

- [ ] **Step 8: Commit**

```bash
git add twin/shared twin/package.json twin/proof/EmissionsLine.tsx twin/proof/RankBars.tsx twin/skills/splash-twin/test/root-template-shared.test.ts
git commit -m "fix(twin): a live shared/ and an imports map — proof stories stop importing by absolute machine path"
```

---

### Task 2: Move the CO₂ story into its own workspace

**Files:**
- Create: `twin/proof/co2-suisse/` — moved: `EmissionsLine.tsx`, `crossing-geometry.ts`, `BRIEF.md`, `STORYBOARD.md`, `co2-suisse-still.png`, and `EmissionsWeb.tsx` (from `twin/skills/twin-chart-web/assets/`)
- Modify: `twin/skills/twin-chart-web/scripts/render-web.mjs:25-28`, `twin/skills/twin-chart-web/test/render-web.test.ts:9-15`
- Modify: `twin/skills/twin-chart-video/assets/EmissionsVideo.tsx:36` (its `crossing-geometry` import)
- Modify: `twin/skills/twin-chart-web/SKILL.md`, `twin/skills/twin-chart-web/references/web-discipline.md` (cited paths)

**Interfaces:**
- Consumes: `#shared/twin-chart-beat/render-still.mjs` from Task 1.
- Produces: `twin/proof/co2-suisse/crossing-geometry.ts` exporting `crossingGeometry` and `fr` — the path Tasks 4–6 must not break.

- [ ] **Step 1: Write the failing test**

Create `twin/skills/twin-chart-web/test/canon.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-chart-web assets — the canon's shape, not a story's", () => {
  it("should not carry the CO2 story's component", () => {
    expect(existsSync(join(ASSETS, "EmissionsWeb.tsx"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/twin-chart-web/test/canon.test.ts`
Expected: FAIL — received `true`.

- [ ] **Step 3: Move the files**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin/twin
mkdir -p proof/co2-suisse
git mv proof/EmissionsLine.tsx proof/crossing-geometry.ts proof/BRIEF.md proof/STORYBOARD.md proof/co2-suisse-still.png proof/co2-suisse/
git mv skills/twin-chart-web/assets/EmissionsWeb.tsx proof/co2-suisse/EmissionsWeb.tsx
```

- [ ] **Step 4: Repoint every importer**

- `twin/proof/co2-suisse/EmissionsWeb.tsx:33` — `from "../../../proof/crossing-geometry"` becomes `from "./crossing-geometry"`.
- `twin/skills/twin-chart-video/assets/EmissionsVideo.tsx:36` — `from "../../../proof/crossing-geometry"` becomes `from "../../../proof/co2-suisse/crossing-geometry"`.
- `twin/skills/twin-chart-web/scripts/render-web.mjs:28` and `test/render-web.test.ts:13` — `from "../assets/EmissionsWeb.tsx"` becomes `from "../../../proof/co2-suisse/EmissionsWeb.tsx"`.
- `twin/skills/twin-chart-web/test/render-web.test.ts:15` — `from "../../../proof/crossing-geometry"` becomes `from "../../../proof/co2-suisse/crossing-geometry"`.

- [ ] **Step 5: Break the layout ownership the move exposes**

`EmissionsWeb.tsx` currently exports `WebLayout`, `DESKTOP_LAYOUT` and `NARROW_LAYOUT`, and
`render-web.mjs:25-28` imports them. If the story keeps them, the **skill's** renderer imports its
frame geometry from a **story** — the dependency runs backwards and the next story would have to
re-export the same names to keep the skill working.

Resolve it so neither owns the other:

- `render-web.mjs` stops importing layouts. Its exported entry becomes
  `renderWeb({ component, layouts, props, outDir, name })`, where `layouts` is
  `Array<{ id: string; width: number; height: number; pad: number }>` — the two rungs the caller
  passes in.
- The story keeps its own two layout constants inside `proof/co2-suisse/EmissionsWeb.tsx` and hands
  them to `renderWeb`.
- The `WebLayout` type moves to the skill, in Task 3's seed, since it describes the genre's
  mechanics rather than a story's numbers.

- [ ] **Step 6: Prove no stale path remains**

Run: `cd twin && grep -rn "proof/crossing-geometry\|proof/EmissionsLine\|assets/EmissionsWeb" skills proof --include=*.ts --include=*.tsx --include=*.mjs --include=*.md | grep -v node_modules`
Expected: no output.

Run: `cd twin && grep -rn "DESKTOP_LAYOUT\|NARROW_LAYOUT" skills`
Expected: no output — the skill no longer knows any story's frame numbers.

- [ ] **Step 6: Run the suite**

Run: `cd twin && bun test`
Expected: 383 tests, 380 pass, 3 skip, 0 fail.

- [ ] **Step 7: Render the web beat and look at it**

```bash
cd twin && bun skills/twin-chart-web/scripts/render-web.mjs /tmp/canon-web
python3 -m http.server 8731 --directory /tmp/canon-web &
open http://localhost:8731/co2.html
```
Expected: the chart renders as before the move — title, 1967 reference rule, 1973 peak, 2024 subject point. Hover a point and confirm the tooltip still answers.

- [ ] **Step 8: Commit**

```bash
git add -A twin/proof twin/skills/twin-chart-web twin/skills/twin-chart-video/assets/EmissionsVideo.tsx
git commit -m "refactor(twin): the CO2 story moves into its own workspace, out of twin-chart-web's assets"
```

---

### Task 3: `twin-chart-web` gets a seed, sample data and a generated preview

**Files:**
- Create: `twin/skills/twin-chart-web/assets/ChartWebSeed.tsx`
- Create: `twin/skills/twin-chart-web/assets/sample-data/rainfall.json`
- Create: `twin/skills/twin-chart-web/scripts/render-preview.mjs`
- Create: `twin/skills/twin-chart-web/assets/preview.png` (generated, committed)
- Modify: `twin/skills/twin-chart-web/SKILL.md` (Files + Tuning knobs sections)
- Test: `twin/skills/twin-chart-web/test/canon.test.ts` (extend)

**Interfaces:**
- Consumes: `renderWeb` machinery in `scripts/render-web.mjs`.
- Produces: `ChartWebSeed` — a React component with props `{ data, title, source, alt, ground, accent, subject, layout }`, where `data` is `Array<{ year: number; value: number }>` and `layout` is the `WebLayout` type already exported by the skill.

- [ ] **Step 1: Write the failing test**

Extend `twin/skills/twin-chart-web/test/canon.test.ts`:

```ts
import { readFile } from "node:fs/promises";

describe("twin-chart-web — the canon's assets", () => {
  it("should carry a seed marked with the canon's exact wording", async () => {
    const seed = await readFile(join(ASSETS, "ChartWebSeed.tsx"), "utf8");
    expect(seed).toContain("REPLACE ME. Do not parameterise me.");
  });

  it("should carry sample data the seed can render on its own", async () => {
    const raw = await readFile(join(ASSETS, "sample-data", "rainfall.json"), "utf8");
    const rows = JSON.parse(raw);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      expect(typeof r.year).toBe("number");
      expect(typeof r.value).toBe("number");
    }
  });

  it("should not name the CO2 story anywhere in the seed", async () => {
    const seed = await readFile(join(ASSETS, "ChartWebSeed.tsx"), "utf8");
    for (const leak of ["Suisse", "CO", "1967", "1973", "Mt"]) {
      expect(seed).not.toContain(leak);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/twin-chart-web/test/canon.test.ts`
Expected: FAIL — `ENOENT` on `ChartWebSeed.tsx`.

- [ ] **Step 3: Write the sample data**

`twin/skills/twin-chart-web/assets/sample-data/rainfall.json` — the same series the static seed uses, so a reader comparing the two skills sees the mechanics differ and the data does not:

```json
[
  { "year": 2015, "value": 912 },
  { "year": 2016, "value": 868 },
  { "year": 2017, "value": 795 },
  { "year": 2018, "value": 831 },
  { "year": 2019, "value": 742 },
  { "year": 2020, "value": 806 },
  { "year": 2021, "value": 688 },
  { "year": 2022, "value": 714 },
  { "year": 2023, "value": 651 },
  { "year": 2024, "value": 620 },
  { "year": 2025, "value": 604 }
]
```

- [ ] **Step 4: Write the seed from scratch**

`ChartWebSeed.tsx` teaches the **web genre's mechanics** and nothing else. It must demonstrate, and its doc-comment must name, exactly these four things:

1. one component called twice, once per `WebLayout`, both SSR'd at build time — no client-side layout math;
2. `tabIndex={0}` and a per-reading `aria-label` written at build time, so the no-JS frame is still keyboard-reachable;
3. an invisible nearest-point hit area shared by mouse and touch;
4. nothing argument-bearing gated behind interaction.

Its first doc-comment line is verbatim: `REPLACE ME. Do not parameterise me.`
It draws a plain falling line with a direct end label. It has **no** reference rule and **no** peak marker — those are editorial devices belonging to a story, and a seed that shipped them would teach the CO₂ argument.

- [ ] **Step 5: Write the preview generator**

`twin/skills/twin-chart-web/scripts/render-preview.mjs`. This is the canonical shape; Tasks 6 and 7
adapt it to their own seed and renderer, and the `--check` contract is identical in all three.

```js
// Renders THIS skill's seed from THIS skill's sample data. Never a story's render: a story's
// artifact proves the story, not the mechanism this skill teaches.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import { ChartWebSeed, SEED_LAYOUT } from "../assets/ChartWebSeed.tsx";

const HERE = import.meta.dirname;
const TARGET = join(HERE, "..", "assets", "preview.png");

const data = JSON.parse(
  await readFile(join(HERE, "..", "assets", "sample-data", "rainfall.json"), "utf8"),
);

const svg = renderToStaticMarkup(
  createElement(ChartWebSeed, {
    data,
    title: "Rainfall over the sample town fell by a third",
    source: "Sample data — not a real measurement",
    alt: "A line falling from 912 to 604 across eleven readings.",
    ground: "#FFFFFF",
    accent: "#0B7A75",
    subject: "the sample town",
    layout: SEED_LAYOUT,
  }),
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: SEED_LAYOUT.width } })
  .render()
  .asPng();

if (process.argv.includes("--check")) {
  const committed = await readFile(TARGET);
  if (!committed.equals(png)) {
    console.error("preview.png is stale — the seed changed and the preview did not. Re-run without --check.");
    process.exit(1);
  }
  console.log("preview.png matches a fresh render of the seed.");
} else {
  await writeFile(TARGET, png);
  console.log(`wrote ${TARGET} (${png.length} bytes) — now open it and look at it.`);
}
```

Note `SEED_LAYOUT`: the seed exports its own single layout for the preview. The two responsive rungs
a real beat ships are the beat's numbers, not the seed's, per Task 2 Step 5.

- [ ] **Step 6: Generate the preview and look at it**

Run: `cd twin && bun skills/twin-chart-web/scripts/render-preview.mjs`
Then open `twin/skills/twin-chart-web/assets/preview.png` and confirm it shows a falling line with a readable title, axis and source — not a blank or clipped frame.

- [ ] **Step 7: Add the preview-freshness test**

```ts
it("should have a preview.png that is a current render of the seed", async () => {
  const proc = Bun.spawn(["bun", "scripts/render-preview.mjs", "--check"], {
    cwd: join(import.meta.dirname, ".."),
  });
  expect(await proc.exited).toBe(0);
});
```

- [ ] **Step 8: Run the suite**

Run: `cd twin && bun test`
Expected: 387 tests, 384 pass, 3 skip, 0 fail.

- [ ] **Step 9: Commit**

```bash
git add twin/skills/twin-chart-web
git commit -m "feat(twin-chart-web): a seed that teaches the web genre, its sample data, and a generated preview"
```

---

### Task 4: Move the life-expectancy story out of `twin-chart-video`

**Files:**
- Create: `twin/proof/life-expectancy/` — moved: `LifeExpectancyVideo.tsx`, `life-expectancy-timing.ts`, `render-life-expectancy.mjs`
- Create: `twin/proof/life-expectancy/Root.tsx`, `twin/proof/life-expectancy/index.ts`
- Modify: `twin/skills/twin-chart-video/assets/Root.tsx` (drop the registration), `twin/skills/twin-chart-video/SKILL.md`
- Move: `twin/skills/twin-chart-video/test/life-expectancy-timing.test.ts` → `twin/proof/life-expectancy/timing.test.ts`

**Interfaces:**
- Consumes: `BeatTiming` and helpers from `twin/skills/twin-chart-video/assets/timing.ts`. The story reaches them through `#shared/twin-chart-video/timing.ts`, vendored in Task 8. Until Task 8 lands, use the relative path `../../skills/twin-chart-video/assets/timing` and let Task 8 convert it — do not invent a third route.
- Produces: composition id `life-expectancy` registered in `twin/proof/life-expectancy/Root.tsx`.

- [ ] **Step 1: Write the failing test**

Create `twin/skills/twin-chart-video/test/canon.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-chart-video assets — one seed, no story catalogue", () => {
  it("should not carry the life-expectancy story", () => {
    expect(existsSync(join(ASSETS, "LifeExpectancyVideo.tsx"))).toBe(false);
    expect(existsSync(join(ASSETS, "life-expectancy-timing.ts"))).toBe(false);
  });

  it("should register exactly one composition", async () => {
    const root = await readFile(join(ASSETS, "Root.tsx"), "utf8");
    expect([...root.matchAll(/<Composition/g)]).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/twin-chart-video/test/canon.test.ts`
Expected: FAIL on both — the files exist and three compositions are registered.

- [ ] **Step 3: Move the files**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin/twin
mkdir -p proof/life-expectancy
git mv skills/twin-chart-video/assets/LifeExpectancyVideo.tsx proof/life-expectancy/
git mv skills/twin-chart-video/assets/life-expectancy-timing.ts proof/life-expectancy/timing-contract.ts
git mv skills/twin-chart-video/scripts/render-life-expectancy.mjs proof/life-expectancy/render.mjs
git mv skills/twin-chart-video/test/life-expectancy-timing.test.ts proof/life-expectancy/timing.test.ts
```

- [ ] **Step 4: Give the story its own Remotion root**

`twin/proof/life-expectancy/Root.tsx`:

```tsx
// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { LifeExpectancyVideo, type LifeExpectancyVideoProps } from "./LifeExpectancyVideo";
import { LIFE_EXPECTANCY_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: LifeExpectancyVideoProps = {
  data: [],
  title: "",
  source: "",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  subject: "",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="life-expectancy"
    component={LifeExpectancyVideo}
    durationInFrames={LIFE_EXPECTANCY_TIMING.total}
    fps={30}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
```

Copy `PLACEHOLDER`'s field names from the `LIFE_EXPECTANCY_PLACEHOLDER` constant currently in
`twin/skills/twin-chart-video/assets/Root.tsx:43` — `LifeExpectancyVideoProps` is that component's
own type and the fields above are illustrative, not authoritative.

`twin/proof/life-expectancy/index.ts` is three lines:

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

In `render.mjs`, set `const ENTRY = join(HERE, "index.ts");` and repoint its imports at the moved files.

- [ ] **Step 5: Drop the registration from the skill's root**

In `twin/skills/twin-chart-video/assets/Root.tsx`, remove the `LifeExpectancyVideo` import, the `LIFE_EXPECTANCY_TIMING` import, the `LIFE_EXPECTANCY_PLACEHOLDER` constant and its `<Composition id="life-expectancy">` block.

- [ ] **Step 6: Render one still from the moved composition**

Run: `cd twin && bun proof/life-expectancy/render.mjs --still`
Expected: a PNG is written. **Open it and look at it** — a still that renders is not proof the right composition rendered; confirm it is the life-expectancy beat and not a blank or a neighbour.

- [ ] **Step 7: Run the suite**

Run: `cd twin && bun test`
Expected: 389 tests, 386 pass, 3 skip, 0 fail.

- [ ] **Step 8: Commit**

```bash
git add -A twin/proof/life-expectancy twin/skills/twin-chart-video
git commit -m "refactor(twin): the life-expectancy story moves out of twin-chart-video's assets"
```

---

### Task 5: Move the migration story out of `twin-chart-video`

Identical shape to Task 4, different story. The code is repeated here rather than referenced, because the implementer may read tasks out of order.

**Files:**
- Create: `twin/proof/migration/` — moved: `MigrationVideo.tsx`, `migration-timing.ts` → `timing-contract.ts`, `render-migration.mjs` → `render.mjs`
- Create: `twin/proof/migration/Root.tsx`, `twin/proof/migration/index.ts`
- Modify: `twin/skills/twin-chart-video/assets/Root.tsx`, `twin/skills/twin-chart-video/SKILL.md`

**Interfaces:**
- Consumes: `twin/skills/twin-chart-video/assets/timing.ts` by relative path until Task 8 converts it.
- Produces: composition id `migration` in `twin/proof/migration/Root.tsx`.

- [ ] **Step 1: Extend the failing test**

In `twin/skills/twin-chart-video/test/canon.test.ts`:

```ts
it("should not carry the migration story", () => {
  expect(existsSync(join(ASSETS, "MigrationVideo.tsx"))).toBe(false);
  expect(existsSync(join(ASSETS, "migration-timing.ts"))).toBe(false);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/twin-chart-video/test/canon.test.ts`
Expected: FAIL — the files exist.

- [ ] **Step 3: Move the files**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin/twin
mkdir -p proof/migration
git mv skills/twin-chart-video/assets/MigrationVideo.tsx proof/migration/
git mv skills/twin-chart-video/assets/migration-timing.ts proof/migration/timing-contract.ts
git mv skills/twin-chart-video/scripts/render-migration.mjs proof/migration/render.mjs
```

- [ ] **Step 4: Give the story its own Remotion root**

`twin/proof/migration/Root.tsx` registers one `<Composition id="migration">` bound to `MigrationVideo`, `durationInFrames` from `MIGRATION_TIMING.total`. `twin/proof/migration/index.ts`:

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

In `render.mjs`, set `const ENTRY = join(HERE, "index.ts");` and repoint its imports.

- [ ] **Step 5: Drop the registration from the skill's root**

Remove from `twin/skills/twin-chart-video/assets/Root.tsx`: the `MigrationVideo` import, the `MIGRATION_TIMING` import, `MIGRATION_PLACEHOLDER`, and the `<Composition id="migration">` block. `Root.tsx` now registers `co2-suisse` alone.

- [ ] **Step 6: Render one still and look at it**

Run: `cd twin && bun proof/migration/render.mjs --still`
Expected: a PNG that is visibly the migration beat, including its shaded sub-zero band.

- [ ] **Step 7: Run the suite**

Run: `cd twin && bun test`
Expected: 390 tests, 387 pass, 3 skip, 0 fail.

- [ ] **Step 8: Commit**

```bash
git add -A twin/proof/migration twin/skills/twin-chart-video
git commit -m "refactor(twin): the migration story moves out of twin-chart-video's assets"
```

---

### Task 6: `twin-chart-video` — canon wording, sample data, generated preview

**Files:**
- Modify: `twin/skills/twin-chart-video/assets/EmissionsVideo.tsx:4` (marker wording)
- Create: `twin/skills/twin-chart-video/assets/sample-data/rainfall.json`
- Create: `twin/skills/twin-chart-video/scripts/render-preview.mjs`
- Create: `twin/skills/twin-chart-video/assets/preview.png`
- Modify: `twin/skills/twin-chart-video/SKILL.md`

**Interfaces:**
- Consumes: `CO2_TIMING` from `assets/timing.ts`; `EmissionsVideo` stays the seed.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing test**

In `twin/skills/twin-chart-video/test/canon.test.ts`:

```ts
it("should mark its seed with the canon's exact wording", async () => {
  const seed = await readFile(join(ASSETS, "EmissionsVideo.tsx"), "utf8");
  expect(seed).toContain("REPLACE ME. Do not parameterise me.");
});

it("should carry sample data", async () => {
  const rows = JSON.parse(await readFile(join(ASSETS, "sample-data", "rainfall.json"), "utf8"));
  expect(rows.length).toBeGreaterThanOrEqual(8);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/twin-chart-video/test/canon.test.ts`
Expected: FAIL — the marker reads `REPLACE ME per story, the way …`, and `sample-data/` does not exist.

- [ ] **Step 3: Fix the marker and add the sample data**

`EmissionsVideo.tsx` line 4 becomes the canon's verbatim sentence, `REPLACE ME. Do not parameterise me.`, followed by the existing explanatory sentences. Copy the same `rainfall.json` written in Task 3 into `assets/sample-data/`.

- [ ] **Step 4: Write the preview generator**

`scripts/render-preview.mjs` renders the seed's **last frame** through Remotion `still` at `CO2_TIMING.total - 1`, writes `assets/preview.png`, and supports `--check` for byte comparison. The last frame is used because a video seed's first frame is deliberately empty — a preview taken at frame 0 would show nothing and pass.

- [ ] **Step 5: Generate and look**

Run: `cd twin && bun skills/twin-chart-video/scripts/render-preview.mjs`
Open the PNG. Expected: the finished chart with its reference rule, its subject point and the stated value — not an empty frame.

- [ ] **Step 6: Add the freshness test and run the suite**

Add the same `--check` spawn test as Task 3 Step 7, then run `cd twin && bun test`.
Expected: 393 tests, 390 pass, 3 skip, 0 fail.

- [ ] **Step 7: Commit**

```bash
git add twin/skills/twin-chart-video
git commit -m "feat(twin-chart-video): canon seed wording, sample data, and a preview rendered from the seed's last frame"
```

---

### Task 7: `twin-map-beat` — canon wording, sample data, generated preview

Two seeds are correct here: this skill ships two genres. Each marker must say which genre it seeds.

**Files:**
- Modify: `twin/skills/twin-map-beat/assets/Co2MapStill.tsx:4`, `twin/skills/twin-map-beat/assets/Co2MapVideo.tsx:4`
- Create: `twin/skills/twin-map-beat/assets/sample-data/regions.json`
- Create: `twin/skills/twin-map-beat/scripts/render-preview.mjs`
- Create: `twin/skills/twin-map-beat/assets/preview.png`
- Modify: `twin/skills/twin-map-beat/SKILL.md`
- Test: `twin/skills/twin-map-beat/test/canon.test.ts`

**Interfaces:**
- Consumes: `bake-plate.mjs` for the basemap plate; `geo.ts` for the projection.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing test**

Create `twin/skills/twin-map-beat/test/canon.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = join(import.meta.dirname, "..", "assets");

describe("twin-map-beat — one seed per genre, both marked", () => {
  for (const [file, genre] of [["Co2MapStill.tsx", "static"], ["Co2MapVideo.tsx", "video"]]) {
    it(`should mark ${file} as the ${genre} genre's seed`, async () => {
      const src = await readFile(join(ASSETS, file), "utf8");
      expect(src).toContain("REPLACE ME. Do not parameterise me.");
      expect(src).toContain(`seeds the ${genre} genre`);
    });
  }

  it("should carry sample data", async () => {
    const rows = JSON.parse(await readFile(join(ASSETS, "sample-data", "regions.json"), "utf8"));
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/twin-map-beat/test/canon.test.ts`
Expected: FAIL on all three.

- [ ] **Step 3: Fix the markers, write the sample data**

Each marker's first line becomes `REPLACE ME. Do not parameterise me.` followed by `This file seeds the static genre.` / `This file seeds the video genre.` `regions.json` holds at least four regions with an ISO code and a numeric value, chosen so the ramp has a visible spread.

- [ ] **Step 4: Write the preview generator and generate**

`scripts/render-preview.mjs` renders the **static** seed from `sample-data/regions.json` and the baked plate, writes `assets/preview.png`, supports `--check`.

Run: `cd twin && bun skills/twin-map-beat/scripts/render-preview.mjs`
Open the PNG. Expected: a shaded map with a legend whose bins are readable, not a blank plate.

- [ ] **Step 5: Add the freshness test and run the suite**

Run: `cd twin && bun test`
Expected: 397 tests, 394 pass, 3 skip, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add twin/skills/twin-map-beat
git commit -m "feat(twin-map-beat): canon seed wording per genre, sample data, and a generated preview"
```

---

### Task 8: Kill the runtime cross-skill imports

**Files:**
- Create: `twin/shared/twin-chart-video/timing.ts` (physical copy of `twin/skills/twin-chart-video/assets/timing.ts`)
- Create: `twin/skills/twin-chart-web/scripts/render-still.mjs`, `twin/skills/twin-chart-video/scripts/render-still.mjs`, `twin/skills/twin-map-beat/scripts/render-still.mjs` (physical copies)
- Modify: the import sites listed in spec §2.3
- Test: `twin/skills/splash-twin/test/no-cross-skill-imports.test.ts`

**Interfaces:**
- Consumes: Task 1's `#shared/*` map.
- Produces: the invariant every later change must keep.

- [ ] **Step 1: Write the failing test**

Create `twin/skills/splash-twin/test/no-cross-skill-imports.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

async function* sourceFiles(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "test") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(mjs|ts|tsx)$/.test(e.name)) yield p;
  }
}

describe("skills never import each other at runtime", () => {
  it("should find no cross-skill import outside test directories", async () => {
    const offenders: string[] = [];
    for (const skill of await readdir(SKILLS)) {
      for (const dir of ["scripts", "assets"]) {
        const root = join(SKILLS, skill, dir);
        try {
          for await (const file of sourceFiles(root)) {
            const src = await readFile(file, "utf8");
            for (const m of src.matchAll(/from\s+"(\.\.\/\.\.\/[a-z-]+\/[^"]+)"/g)) {
              offenders.push(`${file} → ${m[1]}`);
            }
          }
        } catch { /* skill has no such directory */ }
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/splash-twin/test/no-cross-skill-imports.test.ts`
Expected: FAIL listing the surviving offenders from spec §2.3 that Tasks 2–5 did not already remove.

- [ ] **Step 3: Vendor what each skill needs**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin/twin
for s in twin-chart-web twin-chart-video twin-map-beat; do
  cp skills/twin-chart-beat/scripts/render-still.mjs skills/$s/scripts/render-still.mjs
done
mkdir -p shared/twin-chart-video
cp skills/twin-chart-video/assets/timing.ts shared/twin-chart-video/timing.ts
```

Then repoint: every `from "../../twin-chart-beat/scripts/render-still.mjs"` becomes `from "./render-still.mjs"` (in `scripts/`) or `from "../scripts/render-still.mjs"` (in `assets/`). `twin-map-beat/assets/timing.ts`'s three imports of `../../twin-chart-video/assets/timing` become `#shared/twin-chart-video/timing.ts`. The story files under `proof/` switch from their Task 4/5 relative path to `#shared/twin-chart-video/timing.ts`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd twin && bun test skills/splash-twin/test/no-cross-skill-imports.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend the byte-identity guard to the new copies**

In `root-template-shared.test.ts`, assert each vendored `render-still.mjs` and `shared/twin-chart-video/timing.ts` is byte-identical to its canonical source.

- [ ] **Step 6: Run the suite**

Run: `cd twin && bun test`
Expected: 403 tests, 400 pass, 3 skip, 0 fail.

- [ ] **Step 7: Commit**

```bash
git add -A twin
git commit -m "refactor(twin): vendored copies replace every runtime cross-skill import, with a test that forbids their return"
```

---

### Task 9: The behavioural parity test, mutation-verified

The one place a cross-skill import is legitimate: asserting two implementations agree.

**Files:**
- Create: `twin/skills/splash-twin/test/helper-parity.test.ts`

**Interfaces:**
- Consumes: every `wrap` and `measureText` copy, and every vendored `deriveFurniture`.
- Produces: nothing.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from "bun:test";
import { wrap as videoWrap, measureText as videoMeasure } from "../../twin-chart-video/assets/EmissionsVideo";
import { measureText as canonicalMeasure } from "../../twin-chart-beat/scripts/render-still.mjs";

const FONT = { fontSize: 26, fontWeight: 700 };

const CASES: Array<[string, number]> = [
  ["", 300],
  ["Annemasse", 300],
  ["a b c d e f g h i j k l m n o p", 120],
  ["Supercalifragilisticexpialidocious", 40],
  ["two  spaces   between", 200],
  ["exactly at the boundary", 1],
];

describe("measureText — every copy agrees", () => {
  for (const [text] of CASES) {
    it(`should measure ${JSON.stringify(text)} identically`, () => {
      expect(videoMeasure(text, FONT)).toBe(canonicalMeasure(text, FONT));
    });
  }
});

describe("wrap — every copy agrees", () => {
  for (const [text, width] of CASES) {
    it(`should wrap ${JSON.stringify(text)} at ${width} identically`, () => {
      // The seed's own wrap is not exported; this asserts the two that are.
      expect(videoWrap(text, width, FONT)).toEqual(videoWrap(text, width, FONT));
    });
  }
});
```

Where a copy is not exported, export it. A helper that cannot be compared cannot be guarded, and an unexported copy is exactly where drift hides.

- [ ] **Step 2: Run it to verify it passes**

Run: `cd twin && bun test skills/splash-twin/test/helper-parity.test.ts`
Expected: PASS.

- [ ] **Step 3: MUTATION — prove the test is not vacuous**

In `twin/skills/twin-chart-video/assets/EmissionsVideo.tsx`, change `wrap`'s condition from `> maxWidth` to `>= maxWidth`.

Run: `cd twin && bun test skills/splash-twin/test/helper-parity.test.ts`
Expected: **FAIL.** If it passes, the test is vacuous and must be rewritten before going further — a green suite that stays green when the code is broken is worth less than no test.

- [ ] **Step 4: Revert the mutation and re-run**

```bash
cd /Users/rmdms/Sites/Professional/splash-twin
git checkout twin/skills/twin-chart-video/assets/EmissionsVideo.tsx
cd twin && bun test skills/splash-twin/test/helper-parity.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add twin/skills/splash-twin/test/helper-parity.test.ts twin/skills/twin-chart-video/assets/EmissionsVideo.tsx
git commit -m "test(twin): behavioural parity across every copied helper, mutation-verified"
```

---

### Task 10: `output-proof` for the four craft skills, and the SKILL.md files that describe all of it

**Files:**
- Create: `twin/skills/{twin-chart-beat,twin-chart-web,twin-chart-video,twin-map-beat}/output-proof/`
- Modify: the four `SKILL.md` Files sections
- Test: `twin/skills/splash-twin/test/canon-shape.test.ts`

**Interfaces:**
- Consumes: each skill's `scripts/render-preview.mjs`.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Create `twin/skills/splash-twin/test/canon-shape.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const CRAFT = ["twin-chart-beat", "twin-chart-web", "twin-chart-video", "twin-map-beat"];

describe("every craft skill carries the canon's four assets", () => {
  for (const s of CRAFT) {
    it(`${s} should carry sample-data, preview.png and output-proof`, () => {
      expect(existsSync(join(SKILLS, s, "assets", "sample-data"))).toBe(true);
      expect(existsSync(join(SKILLS, s, "assets", "preview.png"))).toBe(true);
      expect(existsSync(join(SKILLS, s, "output-proof"))).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd twin && bun test skills/splash-twin/test/canon-shape.test.ts`
Expected: FAIL — no skill has `output-proof/`.

- [ ] **Step 3: Produce each output-proof from the skill's own seed**

For each craft skill, run its `render-preview.mjs` with `--out output-proof/` so the proof is the artifact the seed produces from the skill's own sample data. Never copy a render from a story: a story's render proves the story, not the mechanism.

- [ ] **Step 4: Update the four SKILL.md Files sections**

Each must now list, with one line of purpose each: the seed and which genre it seeds, `sample-data/`, `preview.png` and how it is regenerated, `output-proof/`, and — for `twin-chart-video` and `twin-map-beat` — that the story beats formerly living here are now under `proof/<slug>/`.

- [ ] **Step 5: Verify no SKILL.md points at a moved file**

Run: `cd twin && grep -rn "LifeExpectancyVideo\|MigrationVideo\|EmissionsWeb\|assets/EmissionsLine" skills --include=*.md`
Expected: no output.

- [ ] **Step 6: Run the full suite**

Run: `cd twin && bun test`
Expected: 407 tests, 404 pass, 3 skip, 0 fail.

- [ ] **Step 7: Commit**

```bash
git add -A twin/skills
git commit -m "feat(twin): output-proof for every craft skill, and SKILL.md files that match the restored shape"
```

---

## Final verification

- [ ] `cd twin && bun test` — 407 tests, 404 pass, 3 skip, 0 fail. No skip is new.
- [ ] `cd twin && grep -rn "/Users/" proof skills shared --include=*.ts --include=*.tsx --include=*.mjs | grep -v node_modules` — no output.
- [ ] Open the four `preview.png` files and the four `output-proof/` artifacts and look at them. A test that a file exists is not a test that it shows anything.
- [ ] Render one still per registered Remotion composition (`co2-suisse` in the skill, `life-expectancy` and `migration` in their story workspaces) and confirm each is the beat its id names.
- [ ] `git log --oneline` shows ten commits, one per task.
