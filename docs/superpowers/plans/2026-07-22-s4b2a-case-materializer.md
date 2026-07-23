# S4b-2a Coverage-Cell Case Materializer (recombine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 66 covering-array cell-specs (S4b-1) into runnable harness cases by recombining the 105 existing cases' fragments — zero run-spend (only a small translation call per non-same-language cell).

**Architecture:** `src/materialize/source-pick.ts` (choose a source case per cell), `src/materialize/recombine.ts` (pure assembly of the new case's files, injected translator), `scripts/materialize-cells.mjs` (CLI: real `claude -p` translator + fs writes + report). The honesty invariant: a materialized case, fed back through S4b-1's `extractAxes`, must extract to its cell's target axes.

**Tech Stack:** Bun, TypeScript, bun:test. Repo: `/Users/rmdms/Sites/Professional/splash-harness` (branch `master`).

## Global Constraints

- Runtime **Bun**. Tests `bun:test`. `cd /Users/rmdms/Sites/Professional/splash-harness` first. Commit to `master`. Do NOT push (no remote — Rémy's decision, do not create one).
- **Zero run-spend**: S4b-2a only WRITES case dirs — it never runs a case (no actor/persona/judge). The only generation cost is the translator (a short `claude -p` per non-same-language cell), wired ONLY in the CLI, injected as a stub in all tests.
- **Honesty invariant (the key test)**: `extractAxes(materializedCaseDir)` must equal the cell's target axes (family/channel/language/format/theme). A materializer that drifts is caught mechanically.
- Un-materializable cells (target family absent) are REPORTED, never faked.
- Generated `cases/gen-*/` — git-ignore them (like `coverage/`); they are reproducible from the cells JSON + corpus.
- English (code/comments/commits). Commit messages plain subject, **NO Claude/Anthropic/Co-Authored-By/Claude-Session/Generated-with**.
- Full harness suite stays 0-fail (currently 416/0; new tests add to the count).
- Interfaces reused: `extractAxes`, `CaseAxes`, `normalizeChannel` (`src/coverage-axes.ts`). The normalizer maps: "web article"→article-web, "social vertical (Instagram/TikTok)"→social-vertical, "Instagram feed (square post)"→social-feed (feed beats instagram, already fixed).

---

### Task 1: `src/materialize/source-pick.ts` — choose a source case per cell

**Files:**
- Create: `src/materialize/source-pick.ts`
- Create: `tests/materialize-source-pick.test.ts`

**Interfaces:**
- `interface Cell { family: string; channel: string; language: string; format: string; theme: string; }`
- `interface SourceCase { slug: string; dir: string; family: string; language: string; }`
- `pickSource(cell: Cell, sources: SourceCase[]): SourceCase | null`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { pickSource } from "../src/materialize/source-pick.ts";

const S = (slug: string, family: string, language: string) => ({ slug, dir: `cases/${slug}`, family, language });
const cell = (o: Partial<any> = {}) => ({ family: "trend", channel: "article-web", language: "fr", format: "static", theme: "default", ...o });

test("pickSource returns a source of the cell's family", () => {
  const got = pickSource(cell({ family: "spatial" }), [S("a","trend","fr"), S("b","spatial","fr")]);
  expect(got?.slug).toBe("b");
});

test("pickSource prefers a source already in the target language (avoids translation)", () => {
  const got = pickSource(cell({ family: "trend", language: "de" }), [S("a","trend","fr"), S("b","trend","de")]);
  expect(got?.slug).toBe("b");
});

test("pickSource is deterministic (slug order) when several equally-good sources match", () => {
  const got = pickSource(cell({ family: "trend", language: "fr" }), [S("z","trend","fr"), S("a","trend","fr")]);
  expect(got?.slug).toBe("a");
});

test("pickSource returns null when no source has the target family", () => {
  expect(pickSource(cell({ family: "flow" }), [S("a","trend","fr")])).toBeNull();
});
```

- [ ] **Step 2: Run, verify fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test tests/materialize-source-pick.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
export interface Cell { family: string; channel: string; language: string; format: string; theme: string; }
export interface SourceCase { slug: string; dir: string; family: string; language: string; }

// Choose the best source case to recombine for a cell: it MUST share the cell's family (the article+data
// must fit the content type). Among family matches, prefer one already in the cell's target language (skips
// translation), then deterministic by slug (reproducible). null → no source of that family (un-materializable).
export function pickSource(cell: Cell, sources: SourceCase[]): SourceCase | null {
  const sameFamily = sources.filter((s) => s.family === cell.family);
  if (sameFamily.length === 0) return null;
  const sorted = [...sameFamily].sort((a, b) => {
    const al = a.language === cell.language ? 0 : 1;
    const bl = b.language === cell.language ? 0 : 1;
    if (al !== bl) return al - bl;         // same-language first
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0; // then deterministic
  });
  return sorted[0];
}
```

- [ ] **Step 4: Run, verify pass; then full suite**

Run: `bun test tests/materialize-source-pick.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/materialize/source-pick.ts tests/materialize-source-pick.test.ts
git commit -m "feat(materialize): pickSource — choose a family-matching source case per cell (prefers same-language)"
```

---

### Task 2: `src/materialize/recombine.ts` — assemble the new case's files

**Files:**
- Create: `src/materialize/recombine.ts`
- Create: `tests/materialize-recombine.test.ts`

**Interfaces:**
- Consumes: `Cell`, `SourceCase` (Task 1).
- `type Translator = (text: string, fromLang: string, toLang: string) => Promise<string>;`
- `interface SourceFragments { article: string; dataCsv: string | null; persona: any; expect: any; }`
- `interface MaterializedCase { slug: string; files: Record<string, string>; }` (filename → content; includes `newsroom-profile.md` only when themed)
- `recombine(cell: Cell, source: SourceCase, frags: SourceFragments, translate: Translator): Promise<MaterializedCase>`

- [ ] **Step 1: Write the failing tests (with a STUB translator)**

```ts
import { test, expect } from "bun:test";
import { recombine } from "../src/materialize/recombine.ts";
import { normalizeChannel } from "../src/coverage-axes.ts";

const source = { slug: "src-trend-fr", dir: "cases/src-trend-fr", family: "trend", language: "fr" };
const frags = {
  article: "Les dépenses culturelles des communes ont augmenté dans la plupart des régions.",
  dataCsv: "year,value\n2020,10\n2021,14\n",
  persona: { angle: "the rise", channel: "web article", formatPreference: "a chart", redLines: ["source: OFS, https://bfs.admin.ch"] },
  expect: { expectFamily: "trend", mustReachDeliverable: true },
};
const cell = (o: any) => ({ family: "trend", channel: "article-web", language: "fr", format: "static", theme: "default", ...o });
// stub: returns a marker containing target-language stopwords so detectLanguage would see the target lang
const DE = "Die Ausgaben der Gemeinden sind in den meisten Regionen nicht gesunken und werden auch mit Daten belegt.";
const stub = async (_t: string, _f: string, to: string) => (to === "de" ? DE : _t);

test("recombine sets the target channel (round-trips via normalizeChannel) and format on the case", async () => {
  const m = await recombine(cell({ channel: "social-feed", format: "video" }), source, frags, stub);
  const persona = JSON.parse(m.files["persona.json"]);
  const exp = JSON.parse(m.files["expect.json"]);
  expect(normalizeChannel(persona.channel)).toBe("social-feed");
  expect(exp.expectFormat).toBe("video");
});

test("recombine writes newsroom-profile.md iff theme is 'themed'", async () => {
  const themed = await recombine(cell({ theme: "themed" }), source, frags, stub);
  expect(themed.files["newsroom-profile.md"]).toBeDefined();
  const def = await recombine(cell({ theme: "default" }), source, frags, stub);
  expect(def.files["newsroom-profile.md"]).toBeUndefined();
});

test("recombine invokes the translator when target language differs, carries data.csv, keeps source when same-language", async () => {
  const translated = await recombine(cell({ language: "de" }), source, frags, stub);
  expect(translated.files["article.md"]).toContain("Ausgaben"); // came from the stub DE text
  expect(translated.files["data.csv"]).toContain("year,value");
  const same = await recombine(cell({ language: "fr" }), source, frags, stub);
  expect(same.files["article.md"]).toContain("dépenses");        // untranslated (same language)
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test tests/materialize-recombine.test.ts` → FAIL.

- [ ] **Step 3: Implement `recombine`**

```ts
import type { Cell, SourceCase } from "./source-pick.ts";

export type Translator = (text: string, fromLang: string, toLang: string) => Promise<string>;
export interface SourceFragments { article: string; dataCsv: string | null; persona: any; expect: any; }
export interface MaterializedCase { slug: string; files: Record<string, string>; }

const CHANNEL_PHRASE: Record<string, string> = {
  "article-web": "web article",
  "social-vertical": "social vertical (Instagram/TikTok)",
  "social-feed": "Instagram feed (square post)",
};
const FORMAT_REQUEST: Record<string, string> = {
  static: "a single static image/chart",
  interactive: "an interactive web chart",
  video: "a short video (motion graphic)",
  scrolly: "a scrollytelling piece",
};
// A minimal themed newsroom profile (frontmatter → splash's loadNewsroomProfile reads palette+theme).
function newsroomProfile(): string {
  return `---\npalette:\n  - "#2E7D57"\n  - "#5B5B66"\naccent: "#2E7D57"\ntheme: "dark"\nlang: "fr"\n---\n\n# Profil de rédaction — Generated\n\nFond maison sombre, teinte maison verte. Cas généré (S4b-2a) pour tester le thème.\n`;
}
function sanitize(s: string): string { return s.replace(/[^a-z0-9]+/gi, "-").toLowerCase(); }

export async function recombine(cell: Cell, source: SourceCase, frags: SourceFragments, translate: Translator): Promise<MaterializedCase> {
  const slug = `gen-${sanitize(cell.family)}-${sanitize(cell.channel)}-${cell.language}-${cell.format}-${cell.theme}`;
  const article = source.language === cell.language ? frags.article : await translate(frags.article, source.language, cell.language);
  const persona = {
    ...frags.persona,
    channel: CHANNEL_PHRASE[cell.channel] ?? frags.persona.channel,
    formatPreference: FORMAT_REQUEST[cell.format] ?? frags.persona.formatPreference,
  };
  const expect = { ...frags.expect, expectFamily: cell.family, expectFormat: cell.format, mustReachDeliverable: true,
    hint: `${cell.family} rendered as ${cell.format} for ${cell.channel} (materialized cell, S4b-2a)` };
  const files: Record<string, string> = {
    "article.md": article,
    "persona.json": JSON.stringify(persona, null, 2),
    "expect.json": JSON.stringify(expect, null, 2),
  };
  if (frags.dataCsv) files["data.csv"] = frags.dataCsv;
  if (cell.theme === "themed") files["newsroom-profile.md"] = newsroomProfile();
  return { slug, files };
}
```

- [ ] **Step 4: Run, verify pass; then full suite** — `bun test tests/materialize-recombine.test.ts` → PASS; `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/materialize/recombine.ts tests/materialize-recombine.test.ts
git commit -m "feat(materialize): recombine — assemble a case targeting a cell's axes (channel/format/lang/theme)"
```

---

### Task 3: extract-axes round-trip — the honesty check

**Files:**
- Create: `tests/materialize-roundtrip.test.ts`

**Interfaces:** consumes `recombine` (Task 2) + `extractAxes` (`src/coverage-axes.ts`).

- [ ] **Step 1: Write the failing round-trip test**

A materialized case, written to a temp dir, must `extractAxes` back to the cell's target axes.

```ts
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recombine } from "../src/materialize/recombine.ts";
import { extractAxes } from "../src/coverage-axes.ts";

const source = { slug: "src", dir: "cases/src", family: "trend", language: "fr" };
const frags = {
  article: "Les dépenses des communes ont augmenté dans la plupart des régions selon les données.",
  dataCsv: "year,value\n2020,10\n2021,14\n",
  persona: { angle: "a", channel: "web article", formatPreference: "x", redLines: ["source: OFS, https://bfs.admin.ch"] },
  expect: { expectFamily: "trend", mustReachDeliverable: true },
};
// stub translator: returns a real DE paragraph (de stopwords) so detectLanguage sees 'de'
const DE = "Die Ausgaben der Gemeinden sind in den meisten Regionen mit den Daten nicht gesunken und werden auch weiter steigen.";
const stub = async (_t: string, _f: string, to: string) => (to === "de" ? DE : _t);

async function writeCase(m: any): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "gen-"));
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(m.files)) writeFileSync(join(dir, name), content as string);
  return dir;
}

test("a materialized fr-source case round-trips: extractAxes == the cell (no translation)", async () => {
  const cell = { family: "trend", channel: "social-feed", language: "fr", format: "video", theme: "themed" };
  const dir = await writeCase(await recombine(cell, source, frags, stub));
  try {
    const ax = extractAxes(dir);
    expect(ax.family).toBe("trend");
    expect(ax.channel).toBe("social-feed");
    expect(ax.language).toBe("fr");
    expect(ax.format).toBe("video");
    expect(ax.theme).toBe("themed");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a translated (fr->de) case round-trips its language to de", async () => {
  const cell = { family: "trend", channel: "article-web", language: "de", format: "static", theme: "default" };
  const dir = await writeCase(await recombine(cell, source, frags, stub));
  try {
    expect(extractAxes(dir).language).toBe("de");
    expect(extractAxes(dir).theme).toBe("default");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run, verify it fails first (or passes — if it passes immediately, confirm it's genuinely exercising recombine→extractAxes, not a no-op), then make it pass.**

Run: `bun test tests/materialize-roundtrip.test.ts`. If any axis mismatches, the bug is in `recombine`'s mapping (e.g. a channel phrase that doesn't normalize back, or the themed profile not detected) OR in the axis choice — fix `recombine`, NOT the test. The round-trip is the spec's honesty invariant; it must hold.

- [ ] **Step 3: Commit**

```bash
git add tests/materialize-roundtrip.test.ts
git commit -m "test(materialize): extract-axes round-trip — a materialized case extracts to its target cell"
```

---

### Task 4: `scripts/materialize-cells.mjs` — CLI + real translator

**Files:**
- Create: `scripts/materialize-cells.mjs`
- Create: `tests/materialize-cli.test.ts`
- Modify: `.gitignore` (add `cases/gen-*/`)

**Interfaces:** consumes Tasks 1-3 + the real translator.

- [ ] **Step 1: Write a failing smoke test for the pure report/source-loading helpers**

Export from the CLI: `loadSourceCases(casesDir)` (reads each `cases/<slug>/` → `SourceCase` via `extractAxes` for family+language) and `renderMaterializeReport(results)`. Test them without fs writes / without a real translator:

```ts
import { test, expect } from "bun:test";
import { renderMaterializeReport } from "../scripts/materialize-cells.mjs";

test("renderMaterializeReport lists materialized slugs, their source, and un-materializable cells", () => {
  const md = renderMaterializeReport({
    materialized: [{ slug: "gen-trend-article-web-de-static-default", source: "src-x", translated: true }],
    unmaterializable: [{ cell: { family: "flow", channel: "article-web", language: "fr", format: "static", theme: "default" }, reason: "no source of family 'flow'" }],
  });
  expect(md).toContain("gen-trend-article-web-de-static-default");
  expect(md).toContain("src-x");
  expect(md).toMatch(/un-?materializable/i);
  expect(md).toContain("flow");
});
```

- [ ] **Step 2: Run, verify fail** — `bun test tests/materialize-cli.test.ts` → FAIL.

- [ ] **Step 3: Implement `scripts/materialize-cells.mjs`**

Wire it: `loadSourceCases` (reads `cases/*`, builds `SourceCase[]` with family+language from `extractAxes`), read `coverage/covering-array-cells.json`, for each cell `pickSource`; if null → unmaterializable; else load the source's fragments (article.md, data.csv, persona.json, expect.json), `recombine(cell, source, frags, realTranslate)`, write `cases/<slug>/`. The real translator is a single `claude -p` call:

```js
async function realTranslate(text, fromLang, toLang) {
  const prompt = `Translate this news article from ${fromLang} to ${toLang}. Preserve all figures, names, and the journalistic register. Do NOT add or remove facts. Output only the translation:\n\n${text}`;
  const proc = Bun.spawn(["claude", "-p", prompt], { stdout: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}
```

`main()` gated behind `import.meta.main`. Support `--limit N` (materialize only the first N cells — for a cheap acceptance run). Write `materialize-report.md` under a `materialize/` dir (git-ignored). Export `loadSourceCases` + `renderMaterializeReport`.

Add `cases/gen-*/` and `materialize/` to `.gitignore`.

- [ ] **Step 4: Run tests, verify pass** — `bun test tests/materialize-cli.test.ts` → PASS; `bun test` → 0-fail.

- [ ] **Step 5: Acceptance — materialize a SMALL subset with the REAL translator (cheap, measures translation cost)**

Run: `cd /Users/rmdms/Sites/Professional/splash-harness && bun scripts/materialize-cells.mjs --limit 3`
Expected: writes 3 `cases/gen-*/` dirs + `materialize/materialize-report.md`; prints how many materialized / un-materializable / translated. Then VERIFY the honesty invariant on the real output: for each generated `cases/gen-*/`, run `extractAxes` (a tiny inline `bun -e` or a check) and confirm its axes match the intended cell. Paste into the report: the 3 slugs, whether any needed translation (and roughly how long/one call), and the extractAxes confirmation. This proves the pipeline end-to-end on real corpus data. (The full 66-cell run is the same command without `--limit` — deferred to when Rémy wants the full set materialized ahead of S4b-2b; note the per-cell translation cost you observed.)

- [ ] **Step 6: Commit**

```bash
git add scripts/materialize-cells.mjs tests/materialize-cli.test.ts .gitignore
git commit -m "feat(materialize): CLI — recombine cells into runnable cases/gen-* + report (real claude translator)"
```

---

## Notes for the executor

- After all tasks: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test` — 0-fail.
- Final whole-branch review on a capable model. Harness code — do NOT push (no remote; Rémy's decision).
- Key review lens: the round-trip honesty invariant (a materialized case extracts to its cell); the translator is stubbed in ALL tests (no test spawns a real `claude`); un-materializable cells reported not faked; `cases/gen-*/` git-ignored.
- S4b-2a produces the runnable cases; RUNNING them (S4b-2b) spawns actor+persona+judge and is the spend event — out of scope here, pilot-gated.
