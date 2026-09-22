# The free parameter — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "what this page does that a still, a video and a scrolly of the same claim cannot" a
declared, mechanically checked property of a web beat, instead of a prose sentence checked at eight
words.

**Architecture:** The existing `const interaction = { earns, controls: [...] }` block gains four
atoms per control (`parameter`, `authorPicked`, `readerPicks`, `heldStill`). `renderWeb` stamps the
declaration onto the delivered figure as data attributes, so the verifier discovers it off the
markup — the same contract `shippedControls` and `assertOneVocabulary` already use. Build-time
refusals live in `interaction-plan.ts`; frame-comparison refusals live in `verify-web.mjs`, reusing
the per-option drive loop that already exists; the gate lives at G3, on approve.

**Tech Stack:** Bun, TypeScript, `bun:test`, puppeteer-core (the browser driver already in
`verify-web.mjs`), React SSR.

**Spec:** `docs/superpowers/specs/2026-09-23-web-free-parameter-design.md`

## Global Constraints

- Code, comments, commit messages, branch names: **English**, always.
- `skills/chart-web/assets/interaction-plan.ts` is carried **byte-identical** into
  `skills/map-web/assets/interaction-plan.ts`. Every edit to one is copied to the other in the same
  commit; `skills/splash/test/carried-copies.test.ts` enforces it.
- No cross-skill runtime imports. A skill imports from itself, from `#shared/`, or not at all.
- The ten-gesture repertoire in `GESTURES` is **unchanged**. This work constrains the argument, not
  the mechanism.
- No generator, no default, no "suggested" parameter (ruling R-D). Nothing in this plan may compute
  what a beat's free parameter should be.
- The 27 beats that already declare an `interaction` block must keep rendering unchanged until their
  own migration task; every new field is optional at the type level and required only at G3.
- Fast lane (`bun run test`) must stay green at every commit. Browser work lands in the heavy lane
  automatically — `scripts/test-lanes.mjs` reads it off the imports.

---

### Task 1: The four atoms, refused at build time

**Files:**
- Modify: `skills/chart-web/assets/interaction-plan.ts` (the `ReaderControl` type,
  `assertInteractionPlan`)
- Mirror: `skills/map-web/assets/interaction-plan.ts` (byte-identical copy)
- Test: `skills/chart-web/test/the-free-parameter.test.ts` (create)

**Interfaces:**
- Consumes: `GESTURES`, `Gesture`, `InteractionPlan`, `assertControlsChangeSomething` — all already
  exported from `interaction-plan.ts`.
- Produces: `type FreeParameter = { parameter: string; authorPicked: string; readerPicks: string[] |
  "every mark"; heldStill: string[] }`, merged into `ReaderControl`. `assertInteractionPlan` gains
  refusals `R2`, `R3`, `R7`, `R9`. Task 2 reads the same fields off the plan object; Task 3 reads
  them off the markup.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { assertInteractionPlan } from "../assets/interaction-plan.ts";

/** A page carrying one live ask control, so only the DECLARATION is under test here. */
const PAGE = `<figure class="chart-figure">
<svg class="chart"><circle class="pt" data-detail="Romania · 25,505 · 85,0 %"></circle>
<circle class="pt" data-detail="Italy · 1,045 · 3,5 %"></circle></svg>
<p class="chart-reading">x</p></figure>`;

const control = (over = {}) => ({
  question: "This bar is a sliver — how many cases is that?",
  gesture: "ask-a-mark",
  changes: "the row repaints and the answer carries its share of the EU total",
  parameter: "which mark is in question",
  authorPicked: "Romania",
  readerPicks: "every mark",
  heldStill: [".chart-plot", ".row-name"],
  ...over,
});
const plan = (...controls) => ({ earns: "a plate cannot print twenty-seven readings at once here", controls });

describe("the free parameter", () => {
  it("refuses a control that names none", () => {
    const { parameter, ...rest } = control();
    expect(() => assertInteractionPlan(PAGE, plan(rest), "the ranking")).toThrow(/free parameter/i);
  });

  it("refuses an author's value the reader cannot put it back to", () => {
    expect(() =>
      assertInteractionPlan(PAGE, plan(control({ readerPicks: ["Italy", "Germany"] })), "the ranking"),
    ).toThrow(/authorPicked/);
  });

  it("refuses two controls that move the same parameter", () => {
    expect(() =>
      assertInteractionPlan(PAGE, plan(control(), control({ gesture: "ask-a-line" })), "the ranking"),
    ).toThrow(/same free parameter/i);
  });

  it("refuses a control that holds nothing still", () => {
    expect(() => assertInteractionPlan(PAGE, plan(control({ heldStill: [] })), "the ranking")).toThrow(
      /holds nothing still/i,
    );
  });

  it("refuses two marks whose reading is identical", () => {
    const twins = PAGE.replace("Italy · 1,045 · 3,5 %", "Romania · 25,505 · 85,0 %");
    expect(() => assertInteractionPlan(twins, plan(control()), "the ranking")).toThrow(/same reading/i);
  });

  it("accepts a complete declaration", () => {
    expect(() => assertInteractionPlan(PAGE, plan(control()), "the ranking")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it and watch every case fail**

Run: `bun test skills/chart-web/test/the-free-parameter.test.ts`
Expected: 5 FAIL (no refusal fires), 1 PASS (the complete declaration, which throws nothing yet).

- [ ] **Step 3: Extend the type**

In `interaction-plan.ts`, beside `ReaderControl`:

```ts
/**
 * THE FREE PARAMETER — what a fixed frame is forced to settle on the reader's behalf.
 *
 * A still must pick a threshold, a bin width, a scale exponent, a unit, a reference year, a pivot,
 * a class rule, a denominator, a dot value — print it, and ask to be trusted. A video and a scrolly
 * settle the same parameter AND fix the order the alternatives are seen in, which is already
 * somebody's argument. The web export is the one that hands it back.
 *
 * Extracted from the catalogue, not invented: all 27 authored `earns` make this move in their own
 * words (`docs/superpowers/specs/2026-09-23-web-free-parameter-design.md` §1.4).
 */
export type FreeParameter = {
  /** The decision a fixed frame has to make and print. A noun phrase, the beat's own. */
  parameter: string;
  /** The value the still, the video and the scrolly of THIS claim had to fix. */
  authorPicked: string;
  /** The values the reader can put it at, or `"every mark"` when the marks are the values. */
  readerPicks: string[] | "every mark";
  /**
   * CSS selectors, never prose, because prose is what made this unverifiable. Every element these
   * name renders pixel-identical at every value of the parameter — the clause the corpus writes
   * every time (« sous une légende qui ne change pas », "the two ends of every band stay exactly
   * where they are") and nothing has ever measured.
   */
  heldStill: string[];
};
```

and `export type ReaderControl = { question: string; gesture: Gesture; changes: string } & FreeParameter;`

- [ ] **Step 4: Add the four refusals**

Inside `assertInteractionPlan`'s `plan.controls.forEach((control, i) => {...})`, after the `changes`
check:

```ts
    if (typeof control.parameter !== "string" || control.parameter.trim().split(/\s+/).length < 2)
      throw new Error(
        `${at} names no free parameter — the decision a fixed frame is forced to settle on the ` +
          `reader's behalf, and that this page hands back. A threshold, a bin width, a unit, a ` +
          `reference year, a pivot, a class rule, a denominator. Got ${JSON.stringify(control?.parameter)}`,
      );
    const picks = control.readerPicks;
    const everyMark = picks === "every mark";
    if (!everyMark && (!Array.isArray(picks) || picks.length < 2))
      throw new Error(
        `${at}: a parameter the reader can put at one value is not a choice, it is a view. ` +
          `Give \`readerPicks\` the values on offer, or "every mark" when the marks are the values.`,
      );
    if (!everyMark && !picks.includes(control.authorPicked))
      throw new Error(
        `${at}: \`authorPicked\` ${JSON.stringify(control.authorPicked)} is not among \`readerPicks\` ` +
          `(${picks.map((p) => JSON.stringify(p)).join(", ")}). A page that cannot be put back into ` +
          `the view its still, its video and its scrolly share no longer carries the claim at rest.`,
      );
    if (!Array.isArray(control.heldStill) || control.heldStill.length === 0)
      throw new Error(
        `${at} holds nothing still. A choice with nothing held is two pictures, not two readings — ` +
          `the reader has no fixed thing to read the change against. Name the selectors that must ` +
          `render identically at every value: the axis, the legend, the ranking, the totals.`,
      );
    declared.push(control.gesture);
```

After the `forEach`, before the shipped/declared cross-check:

```ts
  const byParameter = new Map<string, number>();
  for (const control of plan.controls) {
    const key = control.parameter.trim().toLowerCase();
    byParameter.set(key, (byParameter.get(key) ?? 0) + 1);
  }
  for (const [key, count] of byParameter)
    if (count > 1)
      throw new Error(
        `${where}: ${count} controls move the same free parameter (${JSON.stringify(key)}). That is ` +
          `one gesture wearing two chips — fold them into one control, or name what the second one ` +
          `actually settles that the first does not.`,
      );

  // R9 — the pairwise rule on the cheap axis. Two marks that answer with the same string are two
  // values of the parameter that give the reader the same reading, which is R5 in miniature and
  // costs no browser to find.
  if (plan.controls.some((c) => c.readerPicks === "every mark")) {
    const answers = askAnswers(html);
    const seen = new Set<string>();
    for (const answer of answers) {
      if (seen.has(answer))
        throw new Error(
          `${where}: two marks answer with the same reading (${JSON.stringify(answer)}). Asking one ` +
            `rather than the other tells the reader nothing, so the parameter has fewer values than ` +
            `it appears to.`,
        );
      seen.add(answer);
    }
  }
```

- [ ] **Step 5: Run the test**

Run: `bun test skills/chart-web/test/the-free-parameter.test.ts`
Expected: 6 PASS.

- [ ] **Step 6: Mirror into map-web and run the fast lane**

```bash
cp skills/chart-web/assets/interaction-plan.ts skills/map-web/assets/interaction-plan.ts
bun run test
```
Expected: green. If a catalogue beat's own declaration now fails, that beat is migrated in Task 6 —
note the beat name and move on; do NOT weaken a refusal to keep it green.

- [ ] **Step 7: Commit**

```bash
git add skills/chart-web/assets/interaction-plan.ts skills/map-web/assets/interaction-plan.ts skills/chart-web/test/the-free-parameter.test.ts
git commit -m "feat(web): a control declares the free parameter it hands the reader"
```

---

### Task 2: The declaration reaches the delivered page

**Files:**
- Modify: `skills/chart-web/scripts/render-web.mjs` (inside `renderWeb`, before `assertInteractionPlan`)
- Test: `skills/chart-web/test/the-free-parameter.test.ts` (append)

**Interfaces:**
- Consumes: `props.interaction` (already threaded), the `FreeParameter` fields from Task 1.
- Produces: `stampFreeParameters(markup, plan)` — returns markup whose `figure.chart-figure` carries
  `data-free-parameter` (one per control, `|`-joined) and `data-held-still` (selectors, `|`-joined).
  Task 3 reads exactly these two attributes.

- [ ] **Step 1: Write the failing test**

```ts
import { stampFreeParameters } from "../scripts/render-web.mjs";

describe("the declaration a delivered page carries", () => {
  const markup = `<figure class="chart-figure"><svg class="chart"></svg></figure>`;

  it("stamps each control's parameter and what it holds still", () => {
    const out = stampFreeParameters(markup, {
      earns: "x",
      controls: [
        { parameter: "the reference year", heldStill: [".x-axis", ".chart-total"] },
        { parameter: "which mark is in question", heldStill: [".chart-plot"] },
      ],
    });
    expect(out).toContain('data-free-parameter="the reference year|which mark is in question"');
    expect(out).toContain('data-held-still=".x-axis|.chart-total|.chart-plot"');
  });

  it("leaves a page with no plan exactly as it was", () => {
    expect(stampFreeParameters(markup, null)).toBe(markup);
  });

  it("escapes a parameter carrying a quote, so the attribute cannot be broken out of", () => {
    const out = stampFreeParameters(markup, {
      earns: "x",
      controls: [{ parameter: 'the "author's" cut', heldStill: [".a"] }],
    });
    expect(out).not.toMatch(/data-free-parameter="[^"]*"[^>]*"/);
    expect(out).toContain("&quot;");
  });
});
```

- [ ] **Step 2: Run it**

Run: `bun test skills/chart-web/test/the-free-parameter.test.ts`
Expected: FAIL — `stampFreeParameters` is not exported.

- [ ] **Step 3: Implement**

In `render-web.mjs`, beside `webDocument`:

```js
/**
 * THE DECLARATION TRAVELS WITH THE PAGE, as attributes on the figure.
 *
 * `verify-web.mjs` reads a delivered HTML file and has no access to the beat's render module, so a
 * declaration that stays in the module is a declaration no driven browser can check. Everything
 * else this format guards is discovered off the markup the same way — `shippedControls` finds a
 * control because the attribute that makes it work is there, `plotViewBoxOf` reads the geometry the
 * component actually drew — and this is that contract, for the one clause the corpus writes in
 * prose and nobody measures.
 */
function stampFreeParameters(markup, plan) {
  if (!plan || !Array.isArray(plan.controls) || plan.controls.length === 0) return markup;
  const parameters = plan.controls.map((c) => c.parameter).filter(Boolean);
  const held = [...new Set(plan.controls.flatMap((c) => c.heldStill ?? []))];
  if (parameters.length === 0 && held.length === 0) return markup;
  return markup.replace(
    /<figure class="chart-figure"/,
    `<figure class="chart-figure" data-free-parameter="${escapeHtml(parameters.join("|"))}" data-held-still="${escapeHtml(held.join("|"))}"`,
  );
}
```

Call it in `renderWeb`, immediately before `assertInteractionPlan(draft, ...)`:

```js
  markup = stampFreeParameters(markup, props.interaction ?? null);
```

and add `stampFreeParameters` to the `export { ... }` list.

- [ ] **Step 4: Run the test and the fast lane**

Run: `bun test skills/chart-web/test/the-free-parameter.test.ts && bun run test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add skills/chart-web/scripts/render-web.mjs skills/chart-web/test/the-free-parameter.test.ts
git commit -m "feat(web): the free-parameter declaration travels with the delivered page"
```

---

### Task 3: R5 and R6 — the two frame comparisons

**Files:**
- Modify: `skills/chart-web/scripts/verify-web.mjs`, inside `checkControlSurface`'s per-control
  block (the loop opening at `for (const option of control.options)`, around line 1478)

**Interfaces:**
- Consumes: the helpers already in scope in that block — `shot(clip)`, `apart(a, b)`,
  `plotBase.floor`, `plotClip`, `geometry`, `probe`, `quiesce`, `boxOf`, `check`, `skip`, `who`.
- Produces: two new named checks per control. Nothing downstream consumes them.

- [ ] **Step 1: Capture each option's frame instead of discarding it**

The loop already computes `const plotNow = await shot(plotClip);`. Above the loop add:

```js
    // R5 — EVERY VALUE OF THE PARAMETER PAINTS ITS OWN PICTURE.
    //
    // `assertEventStates` transposed. A video compares state(i) to state(i-1) across the whole
    // sequence; a page has no sequence, but it has the values of one parameter, and the comparison
    // is exactly as mechanical. Until now each option was compared to the LANDING VIEW only, so two
    // options producing the same drawing both passed — which is how a page can offer a reader three
    // choices and give them two answers.
    const framesByOption = new Map();
    const heldByOption = new Map();
```

and inside the loop, after `const plotNow = await shot(plotClip);`:

```js
      framesByOption.set(option.key, plotNow);
```

- [ ] **Step 2: Compare pairwise after the loop**

Immediately after the `for (const option of control.options)` loop closes:

```js
    const keys = [...framesByOption.keys()];
    const same = [];
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        const differ = await apart(framesByOption.get(keys[i]), framesByOption.get(keys[j]));
        if (differ <= plotBase.floor) same.push(`"${keys[i]}" and "${keys[j]}" (${differ}px apart)`);
      }
    if (keys.length >= 2)
      check(
        same.length === 0,
        `${who}: every value of this parameter paints its own picture`,
        same.length === 0
          ? `${(keys.length * (keys.length - 1)) / 2} pairs compared, all above the ${plotBase.floor}-pixel floor`
          : `${same.join(", ")} — a reader who moves between them is operating a control while the picture stands still`,
      );
```

- [ ] **Step 3: Read the held-still selectors off the page and measure them**

Before the option loop:

```js
    // R6 — AND WHAT THE BEAT SAID WOULD NOT MOVE, DOES NOT.
    //
    // The clause every authored `earns` in the catalogue carries — « sous une légende qui ne change
    // pas », "the two ends of every band stay exactly where they are" — and the one nothing has ever
    // measured. Declared as selectors rather than inferred from what happens to be stable: inferring
    // it would report whatever is stable as if it had been promised.
    const heldSelectors = await page.evaluate(() => {
      const figure = document.querySelector(".chart-figure[data-held-still]");
      return figure ? figure.getAttribute("data-held-still").split("|").filter(Boolean) : [];
    });
    const heldAtRest = new Map();
    for (const selector of heldSelectors) {
      const box = await boxOf(selector);
      if (box && box.width > 0 && box.height > 0) heldAtRest.set(selector, { clip: { ...box }, frame: await shot({ ...box }) });
    }
```

Inside the loop, after `framesByOption.set(...)`:

```js
      for (const [selector, rest] of heldAtRest) {
        const moved = await apart(await shot(rest.clip), rest.frame);
        if (moved > plotBase.floor) heldByOption.set(`${selector} @ "${option.key}"`, moved);
      }
```

After the loop:

```js
    if (heldSelectors.length === 0)
      skip(
        `${who}: what this control holds still`,
        "the beat declares no `heldStill` selectors, so there is nothing it promised to hold",
      );
    else
      check(
        heldByOption.size === 0,
        `${who}: everything this beat holds still, holds`,
        heldByOption.size === 0
          ? `${heldSelectors.length} selector(s) identical at every value: ${heldSelectors.join(", ")}`
          : [...heldByOption].map(([at, px]) => `${at} moved by ${px}px`).join(", "),
      );
```

- [ ] **Step 4: Drive a real browser and watch both checks pass**

```bash
bun skills/chart-web/scripts/verify-web.mjs --file proof/web-grouped-bar-wind-vs-solar/renders/nocturne.html
```
Expected: the two new rows appear. `every value of this parameter paints its own picture` passes;
`what this control holds still` **skips**, because no beat declares `heldStill` yet.

- [ ] **Step 5: Mutation — prove R5 is not vacuous**

On a scratch copy of the beat, make two of its options generate identical CSS (delete one option's
generated rule block from the inlined `<style>`). Re-run.
Expected: RED, naming the two option keys and their pixel distance. Restore.

- [ ] **Step 6: Commit**

```bash
git add skills/chart-web/scripts/verify-web.mjs
git commit -m "feat(web): compare every value of a parameter to every other, and hold what was promised"
```

---

### Task 4: The BRIEF asks for it, upstream

**Files:**
- Modify: `skills/chart-web/scripts/choreography.mjs` (`renderChoreographySection`)
- Modify: `skills/map-web/scripts/choreography.mjs` (its own, same edit)
- Test: `skills/chart-web/test/the-free-parameter.test.ts` (append)

**Interfaces:**
- Consumes: `choreographyFrame({ format: "web" }, sheet)`, already called by `chainFrameFor`.
- Produces: the section the scaffold writes, with the six columns. Task 5's front matter and the G3
  gate do not read this table — it is the journalist's, and the checked declaration is the block.

- [ ] **Step 1: Write the failing test**

```ts
import { renderChoreographySection } from "../scripts/choreography.mjs";
import { chainFrameFor } from "../scripts/scaffold-web-beat.mjs";

describe("what the BRIEF asks the journalist, upstream", () => {
  it("asks for the free parameter and what is held still, not only for the gesture", () => {
    const { frame } = chainFrameFor("bar-and-column");
    const section = renderChoreographySection(frame);
    expect(section).toContain("| le paramètre libre |");
    expect(section).toContain("| ce que le fixe a dû trancher |");
    expect(section).toContain("| ce qui ne bouge pas |");
  });
});
```

- [ ] **Step 2: Run it**

Run: `bun test skills/chart-web/test/the-free-parameter.test.ts`
Expected: FAIL — the table has four columns.

- [ ] **Step 3: Replace the header row**

In `renderChoreographySection`, the header currently reads
`| order | what the reader asks | gesture | what changes |`. Replace with:

```
| # | le paramètre libre | ce que le fixe a dû trancher | ce que le lecteur peut poser | ce qui ne bouge pas | la lecture qui revient |
| --- | --- | --- | --- | --- | --- |
```

and add, in the section's own comment block above the table:

```
     THE FREE PARAMETER. A fixed frame is forced to settle one decision on the reader's behalf —
     a threshold, a bin width, a scale exponent, a unit, a reference year, a pivot, a class rule,
     a denominator, a camera remove, a dot value — print it, and ask to be trusted. A video and a
     scrolly settle the same one AND fix the order the alternatives are seen in. This page is the
     export that hands it back. Name it, name what the still had to pick, name what the reader can
     put it at, and name what does NOT move while it moves — that last one as SELECTORS, because
     it is measured in a real browser and prose cannot be.
```

- [ ] **Step 4: Run the test and the fast lane**

Run: `bun test skills/chart-web/test/the-free-parameter.test.ts && bun run test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add skills/chart-web/scripts/choreography.mjs skills/map-web/scripts/choreography.mjs skills/chart-web/test/the-free-parameter.test.ts
git commit -m "feat(web): the BRIEF asks for the free parameter before any code"
```

---

### Task 5: Scaffolded beats join the chain, and G3 holds the gate

**Files:**
- Modify: all eight `skills/*/scripts/scaffold-*.mjs` — the `BRIEF.md` template gains front matter
- Modify: `skills/deliver/scripts/output-review.mjs` (`writeOutputReview`)
- Test: `skills/splash/test/a-scaffolded-beat-joins-the-chain.test.ts` (create)

**Interfaces:**
- Consumes: `parseBriefFrontMatter(text)` from `#shared/chart-beat/sizes.mjs` — returns a flat
  `Record<string, string>` or `null`.
- Produces: nothing new is exported. `writeOutputReview` throws when `decision === "approve"` and the
  beat is a web beat with an incomplete declaration.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBriefFrontMatter } from "#shared/chart-beat/sizes.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

/** Every `scaffold-*.mjs` any skill ships — discovered, so the population cannot silently shrink. */
function scaffolds(): string[] {
  const out: string[] = [];
  for (const skill of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const dir = join(SKILLS, skill.name, "scripts");
    let entries: string[];
    try { entries = readdirSync(dir); } catch { continue; }
    for (const file of entries) if (/^scaffold-.*\.mjs$/.test(file)) out.push(join(dir, file));
  }
  return out.sort();
}

describe("a beat a journalist scaffolds", () => {
  it("is born with the front matter the editorial chain finds it by", () => {
    const without = scaffolds().filter((path) => {
      const source = readFileSync(path, "utf8");
      const brief = /const BRIEF = `([\s\S]*?)`;/.exec(source);
      const record = brief ? parseBriefFrontMatter(brief[1]) : null;
      return !record || !record.format || !record.type || !record.medium;
    });
    expect(without.map((p) => p.split("/").slice(-3).join("/"))).toEqual([]);
  });

  it("finds the scaffolds at all, so this file cannot pass by looking at nothing", () => {
    expect(scaffolds().length).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run it**

Run: `bun test skills/splash/test/a-scaffolded-beat-joins-the-chain.test.ts`
Expected: FAIL, naming all eight scaffolds.

- [ ] **Step 3: Add the front matter to each of the eight BRIEF templates**

Each scaffold's `const BRIEF = ...` template opens with `# %%BEAT%% — brief`. Prepend, with the
skill's own constants (`format` is that scaffold's export, `medium` is `chart` for `chart-*`,
`image-beat` and `scrolly`'s chart scaffold, `map` for `map-*` and `scrolly`'s map scaffold):

```
---
format: web
type: %%TYPE%%
medium: chart
---

```

`grounding` and `derived` are NOT written: `grounding` is the analyst's answer, and `derived: v1`
marks a beat migrated into the L5 census, which a fresh beat has not been.

- [ ] **Step 4: Run the test**

Run: `bun test skills/splash/test/a-scaffolded-beat-joins-the-chain.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Write the failing G3 test**

Append to the same file:

```ts
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { writeOutputReview } from "../../deliver/scripts/output-review.mjs";

describe("G3 on a web beat", () => {
  it("refuses to approve one whose free parameter is not declared", async () => {
    const dir = mkdtempSync(join(tmpdir(), "g3-web-"));
    writeFileSync(join(dir, "BRIEF.md"), "---\nformat: web\ntype: bar-and-column\nmedium: chart\n---\n\n# b\n");
    writeFileSync(join(dir, "render-directions-web.mjs"), "// no interaction block\n");
    await expect(
      writeOutputReview({ beatDir: dir, decision: "approve", /* …the caller's usual fields… */ } as never),
    ).rejects.toThrow(/free parameter/i);
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 6: Add the refusal to `writeOutputReview`**

Inside `if (decision === "approve") { ... }`, before `approvalAgainstCurrent(...)`:

```js
    // A WEB BEAT IS APPROVABLE ONLY ONCE IT HAS SAID WHAT IT HANDS THE READER.
    //
    // Here and not earlier, deliberately. At scaffold time there is nothing to check; at render time
    // an author could not look at their own draft, which is how a discipline becomes a workaround;
    // and enrolling scaffolded beats in the L5 census would turn this repository red on every
    // unfinished scratch beat under proof/ — and would still never see a journalist's story, which
    // lives in the install root.
    assertWebBeatDeclaresItsFreeParameter(beatDir);
```

and, in the same file:

```js
/** Refuses a web beat whose render module carries no complete free-parameter declaration. */
export function assertWebBeatDeclaresItsFreeParameter(beatDir) {
  const brief = join(beatDir, "BRIEF.md");
  if (!existsSync(brief)) return;
  const record = parseBriefFrontMatter(readFileSync(brief, "utf8"));
  if (record?.format !== "web") return;
  const runner = readdirSync(beatDir).find((f) => /^render-.*web\.mjs$/.test(f));
  const source = runner ? readFileSync(join(beatDir, runner), "utf8") : "";
  const block = /\nconst interaction = \{[\s\S]*?\n\};\n/.exec(source);
  if (!block)
    throw new Error(
      `${relative(process.cwd(), beatDir)} is a web beat and declares no interaction: its render ` +
        `module carries no \`const interaction = { … }\`. The web export exists to hand the reader a ` +
        `parameter a still, a video and a scrolly are each forced to settle on their behalf; a page ` +
        `that has not said which one is a still with a stylesheet ` +
        `(docs/superpowers/specs/2026-09-23-web-free-parameter-design.md).`,
    );
  for (const field of ["parameter", "authorPicked", "readerPicks", "heldStill"])
    if (!new RegExp(`\\b${field}:`).test(block[0]))
      throw new Error(
        `${relative(process.cwd(), beatDir)}: its interaction declares no \`${field}\`. ` +
          `A web beat names the free parameter, what the fixed frame had to pick, what the reader ` +
          `can put it at, and what does not move while it moves.`,
      );
}
```

- [ ] **Step 7: Run both tests and the fast lane**

Run: `bun test skills/splash/test/a-scaffolded-beat-joins-the-chain.test.ts && bun run test`
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add skills/*/scripts/scaffold-*.mjs skills/deliver/scripts/output-review.mjs skills/splash/test/a-scaffolded-beat-joins-the-chain.test.ts
git commit -m "feat: a scaffolded beat joins the editorial chain, and G3 holds the web gate"
```

---

### Task 6: Migrate the 27 declaring beats, and the story beat

**Files:**
- Modify: each `proof/web-*/render-directions-web.mjs` that carries a `const interaction` block (27),
  four fields per control
- Modify: `~/.local/share/splash-stories/stories/romania-measles-vaccination-collapse/beats/romania-share-web/render-directions-web.mjs`

**Interfaces:**
- Consumes: Task 1's refusals, which are what tells you a beat is incomplete.
- Produces: nothing. This is the migration.

- [ ] **Step 1: List what is owed**

```bash
bun -e '
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
for (const d of readdirSync("proof").filter((x) => x.startsWith("web-"))) {
  const r = join("proof", d, "render-directions-web.mjs");
  if (!existsSync(r)) continue;
  const b = /\nconst interaction = \{[\s\S]*?\n\};\n/.exec(readFileSync(r, "utf8"));
  if (!b) { console.log(`${d}  NO BLOCK`); continue; }
  const owed = ["parameter","authorPicked","readerPicks","heldStill"].filter((f) => !new RegExp(`\\b${f}:`).test(b[0]));
  if (owed.length) console.log(`${d}  owes ${owed.join(", ")}`);
}'
```

- [ ] **Step 2: Fill them, one beat at a time, reading each beat's own `earns`**

The free parameter is **already written** in every one of the 27 `earns`, in the author's words. Do
not invent one: read the sentence and transcribe what it already says. Examples from the corpus:

| beat | the sentence already says | `parameter` |
| --- | --- | --- |
| `web-histogram-carbon-footprint` | « un fixe doit choisir une largeur de palier » | the quantile the coverage is read at |
| `web-area-swiss-co2` | « une plaque ne peut couper la surface qu'une fois, à l'année de l'auteur » | the year the surface is cut at |
| `web-dot-density-europe-stations` | "all have exactly one dot value" | what one dot is worth |
| `web-flow-map-ukraine-protection` | "neither can let the reader change the denominator" | the denominator the band's width is read in |
| `web-lollipop-co2-per-person` | « le lecteur choisit le pays à l'aune duquel les cinq autres sont mesurés » | the country the other five are measured against |

For `heldStill`, read the same sentence's second clause and turn it into selectors against the
beat's own component. Run `bun <beat>/render-directions-web.mjs` after each: Task 1's refusals fire
at build time, so an incomplete beat cannot render.

- [ ] **Step 3: Re-render every migrated beat and drive three of them**

```bash
for d in proof/web-*/; do bun "$d/render-directions-web.mjs" >/dev/null || echo "REFUSED $d"; done
for b in web-histogram-carbon-footprint web-area-swiss-co2 web-flow-map-ukraine-protection; do
  bun skills/chart-web/scripts/verify-web.mjs --file "proof/$b/renders/nocturne.html" | tail -3
done
```
Expected: no refusals; the two new checks pass on all three, with `holds` now measured rather than
skipped.

- [ ] **Step 4: The story beat**

Its `earns` already says it: *"A bar on a shared baseline spends its whole width on the largest
value… the still had to bracket them"*. So `parameter: "which mark is in question"`,
`authorPicked: "Romania"`, `readerPicks: "every mark"`,
`heldStill: [".chart-plot", ".x-axis"]` — the ranking, the names and the axis do not move while a
mark answers. Re-render and re-verify.

- [ ] **Step 5: Commit**

```bash
git add proof/
git commit -m "chore(web): every declaring beat names the free parameter its own earns already argued"
```

---

### Task 7: The 13 beats that declare nothing

**Files:** none changed.

- [ ] **Step 1: Record them where the tree already records what is owed**

Append to `docs/splash/2026-09-17-declarations-owed.md` the thirteen web beats carrying no
`interaction` block at all:

```
web-diverging-bar-eu-per-capita, web-population-pyramid-switzerland, web-streamgraph-swiss-electricity,
web-sankey-electricity-sources, web-waterfall-germany-bridge, web-gantt-top-ten-tenure,
web-beeswarm-co2-per-person, web-dot-strip-lowcarbon-spread, web-small-multiples-solar-eu-six,
web-radar-electricity-mix, web-parallel-coordinates-electricity, web-treemap-europe-capacity,
web-bullet-low-carbon-share
```

with one line: they owe an authored declaration, G3 refuses them at their next approval, and that is
the correct moment — not a migration sweep, which is how a catalogue of 160 pieces becomes 160 copies
of one piece.

- [ ] **Step 2: Commit**

```bash
git add docs/splash/2026-09-17-declarations-owed.md
git commit -m "docs(web): the thirteen beats that owe a free parameter, and when they will be asked"
```
