# End-to-end remediation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four defects in this repository that an end-to-end run on 2026-09-22 found between a clean install and a delivered chart, each with the test that fails without the fix.

**Architecture:** Three of the four are one shape — a guard exists and the path a user actually takes does not call it. So each task adds the missing call *and* the test that reaches it, rather than a second guard beside the first. No new mechanism is introduced anywhere.

**Tech Stack:** Bun 1.3.5, `bun:test`, React 19 + resvg for the render path.

**Spec:** the end-to-end findings report of 2026-09-22 (four install blockers, four defects, six observations). The four tasks below close D3, D1, D4 and O6; B1–B4, D2, O1, O3 and O4 are Engine's or the gallery's and are not in this repository; O2 and O5 are held pending a ruling.

## Global constraints

- Runtime is Bun. Tests are `bun:test`. `bun run test` is the fast lane, `bun run test:heavy` renders.
- Code, comments, commit messages and branch names in English.
- `render-still.mjs` and `sizes.mjs` are CARRIED: canonical is `skills/chart-beat/scripts/<name>`, and `shared/chart-beat/<name>` must stay byte-identical including line 1. Edit the canonical, copy across, and let `skills/splash/test/carried-copies.test.ts` hold you to it.
- Branch `fix/e2e-remediation`, worktree `splash/e2e-remediation`. Nothing is pushed to the org.

---

### Task 1: A recorded total meets the panel guard

**Files:**
- Modify: `skills/storyboard/scripts/ground-claim.mjs` — `resolveRecordedClaim`, the `if (shape === "total")` branch (~line 3811)
- Test: `skills/storyboard/test/recorded-claim-shape.test.ts`

**Interfaces:**
- Consumes: `panelShapeOf(columns, rows)` from `../../intake/scripts/profile.mjs`, already imported in this file and already used by the inferred branch.
- Produces: no new export. `resolveRecordedClaim` keeps its `{ claim, verdict, detail, shape, recorded }` shape.

**Why:** the inferred totality branch refuses a panel by name. The recorded branch copies that branch's *cancellation* asymmetry — and says so in a comment — but not its panel guard, so a journalist who answers the G1 shape question honestly gets `contradicted` where one who declines gets `unverifiable`. `groundingScalar` will not close Gate 2 on `contradicted`.

- [ ] **Step 1: Write the failing test**

```ts
it("refuses a recorded total on a panel, as the inferred path already does", () => {
  const profile = {
    columns: [
      { name: "country", type: "text" },
      { name: "year", type: "number" },
      { name: "share_pct", type: "number", sum: 400, min: 10, max: 60 },
    ],
    rows: [
      ["FR", 2023, 40], ["DE", 2023, 60],
      ["FR", 2024, 45], ["DE", 2024, 55],
    ],
  };
  const recorded = { shape: "total", column: "share_pct", entity: "FR" };
  const claim = resolveRecordedClaim(recorded, profile, "These shares account for 100% of the total.");

  expect(claim.verdict).toBe("unverifiable");
  expect(claim.detail).toContain("is a share measured once per");
  expect(claim.detail).not.toContain("not 100");
});
```

- [ ] **Step 2: Run it and read the failure**

Run: `bun test skills/storyboard/test/recorded-claim-shape.test.ts -t "refuses a recorded total on a panel"`
Expected: FAIL — `verdict` is `"contradicted"`, detail reads `column "share_pct" sums to 400, not 100`.

- [ ] **Step 3: Add the guard before the `holds` comparison**

```js
const recordedPanel = panelShapeOf(columns, rows);
if (recordedPanel.isPanel)
  return say(
    "unverifiable",
    `column "${column.name}" is a share measured once per ` +
      `"${recordedPanel.entityColumn?.name ?? "subject"}" per "${recordedPanel.periodColumn.name}", ` +
      `and this table carries ${recordedPanel.rowsPerPeriod} such rows for a single period — ` +
      `so its sum across all ${rows.length} rows (${column.sum}) is not a quantity anything ` +
      `is a part of, and a totality claim cannot be checked against it`,
  );
```

Place it after the `column.sum` null check and before `const totals = columnTotals(column, rows);`.

- [ ] **Step 4: Run the test and both files either side of the seam**

Run: `bun test skills/storyboard/test/recorded-claim-shape.test.ts skills/storyboard/test/panel-grounding.test.ts skills/storyboard/test/ground-claim.test.ts`
Expected: PASS, no regression in the guard's own file.

- [ ] **Step 5: Commit**

```bash
git add skills/storyboard/scripts/ground-claim.mjs skills/storyboard/test/recorded-claim-shape.test.ts
git commit -m "fix(grounding): a recorded total meets the same panel guard the inferred one does"
```

---

### Task 2: Preflight probes with the platform fetch

**Files:**
- Modify: `skills/splash/scripts/preflight.mjs:176` — the `runPreflight` destructuring
- Modify: `skills/splash/SKILL.md` — the bullet documenting the call
- Test: `skills/splash/test/preflight.test.ts`

**Interfaces:**
- Produces: `runPreflight({ root })` becomes a complete call. `fetchFn` stays an accepted parameter so tests keep injecting a stub.

**Why:** `env` defaults to `process.env` and `fetchFn`, beside it, defaults to nothing. An agent calling it as `SKILL.md` writes it gets every capability probe crashing on a TypeError, surfaced to the journalist as advice to obtain keys they already hold, while `ready` stays `true`.

- [ ] **Step 1: Write the failing test**

```ts
it("probes with the platform fetch when the caller passes none", async () => {
  const result = await runPreflight({ root: ROOT, env: { MAPTILER_KEY: "not-a-real-key" } });
  const reasons = Object.values(result.capabilities).map((c) => String(c.reason ?? ""));
  for (const reason of reasons) expect(reason).not.toContain("fetchFn is not a function");
});
```

Assert on the reason, never on `available`: with no valid credentials the honest answer is still unavailable.

- [ ] **Step 2: Run it**

Run: `bun test skills/splash/test/preflight.test.ts -t "platform fetch"`
Expected: FAIL — reasons carry `MapTiler threw: fetchFn is not a function`.

- [ ] **Step 3: Give `fetchFn` the default its neighbour has**

```js
export async function runPreflight({
  root,
  env = process.env,
  fetchFn = globalThis.fetch,
  templateRoot = ROOT_TEMPLATE_DIR,
  newsroomPath = join(root, "NEWSROOM.md"),
}) {
```

- [ ] **Step 4: Run it**

Run: `bun test skills/splash/test/preflight.test.ts`
Expected: PASS.

- [ ] **Step 5: Correct the documented call**

In `skills/splash/SKILL.md`, `runPreflight({root, env, fetchFn})` becomes `runPreflight({root})`, with `fetchFn` named one line below as the seam tests inject.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/scripts/preflight.mjs skills/splash/test/preflight.test.ts skills/splash/SKILL.md
git commit -m "fix(preflight): probe with the platform fetch instead of reporting a TypeError as a missing key"
```

---

### Task 3: A width guard beside the height guard

**Files:**
- Modify: `skills/chart-beat/scripts/sizes.mjs` — add `assertWithinFrame` beside `assertWithinStage`
- Modify: `skills/chart-beat/scripts/render-still.mjs` — call it where `assertLegible` is already called
- Copy: `shared/chart-beat/sizes.mjs`, `shared/chart-beat/render-still.mjs` (carried, byte-identical)
- Test: `skills/chart-beat/test/`

**Interfaces:**
- Consumes: `sizeFor(name)`, `frameInsetFor(name)`, `measureText(text, {fontSize, fontWeight})`.
- Produces: `assertWithinFrame(svg, name, { what })` — throws naming every offending string, its measured width and the room it had.

**Why:** `assertWithinStage` refuses a `<text>` baseline outside the portrait safe band; nothing refuses a `<text>` that runs past the right gutter, and nothing on the documented render path calls either. The first render of the measles beat shipped a clipped title and a source line missing its year, silently.

- [ ] **Step 1: Write the failing test**

```ts
it("refuses a title that runs past the frame's own gutter", async () => {
  const long = "One EU country holds almost every measles case reported anywhere in the union";
  await expect(
    renderStill({
      element: createElement(TitleOnly, { text: long, size: "portrait" }),
      width: 1080, height: 1920, outDir: tmp, name: "overflow",
    }),
  ).rejects.toThrow(/measures \d+px .* and has \d+px/);
});
```

`TitleOnly` is a fixture component in the test file: one `<svg>`, one `<text>` at `x` = the frame inset, at the portrait title size. It exists to overflow and must not import the seed.

- [ ] **Step 2: Run it**

Run: `bun test skills/chart-beat/test/ -t "runs past the frame"`
Expected: FAIL — `renderStill` resolves and writes a clipped PNG.

- [ ] **Step 3: Write the guard, mirroring the one above it**

```js
export function assertWithinFrame(svg, name, { what = "this render" } = {}) {
  const { width } = sizeFor(name);
  const inset = frameInsetFor(name);
  const outside = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    if (/transform="/.test(attrs)) continue;
    const x = Number(/\bx="(-?\d+(?:\.\d+)?)"/.exec(attrs)?.[1]);
    const size = Number(/font-size="(\d+(?:\.\d+)?)"/.exec(attrs)?.[1] ?? 0);
    if (!Number.isFinite(x) || !size) continue;
    const words = m[2].replace(/<[^>]*>/g, "").trim();
    const weight = Number(/font-weight="(\d+)"/.exec(attrs)?.[1] ?? 400);
    const room = width - inset - x;
    const drawn = measureText(words, { fontSize: size, fontWeight: weight });
    if (drawn > room)
      outside.push(`"${words.slice(0, 40)}" measures ${Math.round(drawn)}px at x ${x} and has ${Math.round(room)}px`);
  }
  if (outside.length)
    throw new Error(`${what} draws past the frame's own gutter: ${outside.join("; ")}`);
}
```

Deliberately skipped, in the same shape as the height guard: a `<text>` carrying a `transform`, because a rotated label's box is not its advance width. Anchor is assumed `start`; a beat using `text-anchor="middle"` or `"end"` widens the guard rather than earning an exemption.

- [ ] **Step 4: Call it where contrast is already called**

In `render-still.mjs`, once the SVG string exists and beside the existing `assertLegible` calls, run `assertWithinFrame(svg, size)` and `assertWithinStage(svg, size)`.

- [ ] **Step 5: Run the test, then the corpus**

Run: `bun test skills/chart-beat/test/` then `bun --no-env-file run test:heavy`
Expected: the new test passes; the heavy lane names any beat that has been overflowing since it was written. That lane is slow — budget hours, not minutes.

- [ ] **Step 6: Copy the carried files and commit**

```bash
cp skills/chart-beat/scripts/sizes.mjs shared/chart-beat/sizes.mjs
cp skills/chart-beat/scripts/render-still.mjs shared/chart-beat/render-still.mjs
bun test skills/splash/test/carried-copies.test.ts
git add skills/chart-beat shared/chart-beat
git commit -m "feat(chart-beat): refuse text that runs past the frame, the way the stage already refuses text outside it"
```

---

### Task 4: No story in a root that cannot render it

**Files:**
- Modify: `skills/splash/scripts/new-story.mjs` — `createStory`, before any directory is made
- Test: `skills/splash/test/new-story.test.ts`

**Interfaces:**
- Produces: `createStory({root, title})` throws when `root` carries no `package.json` or no `shared/`, naming both and leaving the filesystem untouched.

**Why:** a story was created in a bare directory and walked intake, framing and storyboard before anything noticed; the failure would first have surfaced as an unresolved `#shared/…` import several gates later.

- [ ] **Step 1: Write the failing test**

```ts
it("refuses a root that carries no render substrate, naming what is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "splash-bare-"));
  await expect(createStory({ root, title: "Anything At All" })).rejects.toThrow(/package\.json/);
  expect(existsSync(join(root, "stories"))).toBe(false);
});
```

The second assertion matters as much as the first: a refusal that has already made directories is one the journalist has to clean up.

- [ ] **Step 2: Run it**

Run: `bun test skills/splash/test/new-story.test.ts -t "no render substrate"`
Expected: FAIL — `createStory` resolves and `stories/` exists.

- [ ] **Step 3: Refuse before anything is written**

```js
const missing = [];
if (!existsSync(join(root, "package.json"))) missing.push("package.json");
if (!existsSync(join(root, "shared"))) missing.push("shared/");
if (missing.length)
  throw new Error(
    `${root} is not a Splash root: it carries no ${missing.join(" and no ")}. ` +
      `A beat there cannot resolve "#shared/..." and cannot render. ` +
      `Create the story under the root Engine provisioned, or run the installer against this one.`,
  );
```

- [ ] **Step 4: Run it and the phase resolver beside it**

Run: `bun test skills/splash/test/new-story.test.ts skills/splash/test/where.test.ts`
Expected: PASS. A test that breaks here was asserting the behaviour this task removes — give its fixture the two files and keep it.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/scripts/new-story.mjs skills/splash/test/new-story.test.ts
git commit -m "fix(splash): refuse to create a story in a root that cannot resolve #shared"
```

---

## Held, pending a ruling

**O2 — the row selection no file records.** The analyst carries every frozen row and says so; which rows a beat draws is decided in a hand-written component and recorded nowhere, while every other consequential decision is written to a file and gated. The ruling needed: does the population belong to the slot (a tenth gate, `checkStoryboard` requires it) or to the beat's `BRIEF.md` (a declaration, guarded against `data.json`, and a 160-beat migration)?

**O5 — placement in an article with no internal headings.** The question offers the article's own headings; a reported newspaper feature has one, its title. The ruling needed: what is a position in such an article? Paragraph runs, the paragraphs carrying the takeaway's own numbers, or the journalist typing it with the frozen text read back for confirmation.
