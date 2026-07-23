# S4b-1 Coverage Analyzer + Covering-Array Cell Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone, zero-spend CLI that measures the 105-case corpus's pairwise coverage of the (family × channel × language × format × theme) space and generates the minimal covering-array cell-specs to fill the holes.

**Architecture:** Three focused `src/coverage-*.ts` modules (axis extraction + constraint table; coverage computation; covering-array generator) wired by `scripts/coverage.mjs`, which writes a human `coverage-report.md` + a machine `covering-array-cells.json`. No actor/judge — pure analysis over `cases/`.

**Tech Stack:** Bun, TypeScript, bun:test. Repo: `/Users/rmdms/Sites/Professional/splash-harness` (branch `master`). The harness `src/` is FLAT — use `coverage-` prefixed filenames (no subdir).

## Global Constraints

- Runtime **Bun**. Tests `bun:test`. `cd /Users/rmdms/Sites/Professional/splash-harness` first. Commit to `master`. Do NOT push (Rémy's decision).
- **Zero-spend, read-only on the corpus**: S4b-1 only READS `cases/` and reports. No actor/judge spawn, no case mutation, no splash-tool change.
- **Honesty**: where an axis is neither structured nor reliably inferrable, use the sentinel (`"unknown"`/`"unpinned"`) and COUNT it separately — never fabricate an axis value.
- **Constraint = the tool's rule, re-encoded**: `CHANNEL_FORMAT_ALLOWED` must equal `channel.ts`'s `CHANNELS[c].allowedFormats` EXACTLY — `social-vertical`: `["static","video"]`, `social-feed`: `["static","video"]`, `article-web`: `["static","interactive","video","scrolly"]`. A test locks it; a comment names `splash-merge/skills/splash/src/channel.ts` as the source of truth.
- No new npm dependency (the language detector is a hand-rolled stopword heuristic).
- English only. Commit messages plain subject, **NO Claude/Anthropic/Co-Authored-By/Claude-Session/Generated-with**.
- The full harness suite is currently **397 pass / 0 fail** — it must stay 0-fail (new tests add to the count).

---

### Task 1: `src/coverage-axes.ts` — axis extraction + constraint table

**Files:**
- Create: `src/coverage-axes.ts`
- Create: `tests/coverage-axes.test.ts`

**Interfaces (Produces):**
- `type Channel = "social-vertical" | "social-feed" | "article-web";`
- `type VisualFormat = "static" | "interactive" | "video" | "scrolly";`
- `interface CaseAxes { slug: string; family: string; channel: Channel | "unknown"; language: "fr"|"de"|"it"|"en"|"unknown"; format: VisualFormat | "unpinned"; theme: "default" | "themed"; }`
- `normalizeChannel(freeText: string): Channel | "unknown"`
- `detectLanguage(articleText: string): "fr"|"de"|"it"|"en"|"unknown"`
- `extractAxes(caseDir: string): CaseAxes` (reads `expect.json`, `persona.json`, `article.md`)
- `CHANNEL_FORMAT_ALLOWED: Record<Channel, VisualFormat[]>`
- `isPairValid(a: {axis: string; val: string}, b: {axis: string; val: string}): boolean`

- [ ] **Step 1: Write the failing tests**

`tests/coverage-axes.test.ts`:

```ts
import { test, expect } from "bun:test";
import {
  normalizeChannel, detectLanguage, CHANNEL_FORMAT_ALLOWED, isPairValid,
} from "../src/coverage-axes.ts";

test("normalizeChannel maps the real corpus phrasings", () => {
  expect(normalizeChannel("web article")).toBe("article-web");
  expect(normalizeChannel("Website (Artikel-Embed)")).toBe("article-web");
  expect(normalizeChannel("web long-form scrollytelling")).toBe("article-web");
  expect(normalizeChannel("social vertical (Instagram/TikTok)")).toBe("social-vertical");
  expect(normalizeChannel("story Instagram")).toBe("social-vertical");
  expect(normalizeChannel("social video")).toBe("social-vertical");
  expect(normalizeChannel("web article + horizontal social")).toBe("article-web"); // web wins (has 'web'/'article')
  expect(normalizeChannel("carrier pigeon")).toBe("unknown");
});

test("detectLanguage discriminates fr/de/it/en, unknown on gibberish", () => {
  expect(detectLanguage("Les dépenses des communes ont augmenté dans la plupart des régions.")).toBe("fr");
  expect(detectLanguage("Die Ausgaben der Gemeinden sind in den meisten Regionen nicht gesunken.")).toBe("de");
  expect(detectLanguage("Le spese dei comuni sono aumentate che non in tutte le regioni.")).toBe("it");
  expect(detectLanguage("The spending of the towns increased in most of the regions with data.")).toBe("en");
  expect(detectLanguage("xy zq bk")).toBe("unknown");
});

test("CHANNEL_FORMAT_ALLOWED mirrors channel.ts exactly (source of truth: skills/splash/src/channel.ts)", () => {
  expect(CHANNEL_FORMAT_ALLOWED["article-web"].sort()).toEqual(["interactive","scrolly","static","video"]);
  expect(CHANNEL_FORMAT_ALLOWED["social-vertical"].sort()).toEqual(["static","video"]);
  expect(CHANNEL_FORMAT_ALLOWED["social-feed"].sort()).toEqual(["static","video"]);
});

test("isPairValid: social channels forbid interactive/scrolly; article-web allows all; non channel×format pairs unconstrained", () => {
  expect(isPairValid({axis:"channel",val:"social-vertical"},{axis:"format",val:"interactive"})).toBe(false);
  expect(isPairValid({axis:"channel",val:"social-vertical"},{axis:"format",val:"static"})).toBe(true);
  expect(isPairValid({axis:"channel",val:"article-web"},{axis:"format",val:"scrolly"})).toBe(true);
  expect(isPairValid({axis:"family",val:"trend"},{axis:"language",val:"de"})).toBe(true); // unconstrained
  // sentinels count as valid (flagged un-pinnable elsewhere, not blocked here)
  expect(isPairValid({axis:"channel",val:"unknown"},{axis:"format",val:"interactive"})).toBe(true);
});
```

- [ ] **Step 2: Run, verify fail**

Run: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test tests/coverage-axes.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/coverage-axes.ts`**

```ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type Channel = "social-vertical" | "social-feed" | "article-web";
export type VisualFormat = "static" | "interactive" | "video" | "scrolly";

export interface CaseAxes {
  slug: string;
  family: string;                                  // expectFamily or "unknown"
  channel: Channel | "unknown";
  language: "fr" | "de" | "it" | "en" | "unknown";
  format: VisualFormat | "unpinned";
  theme: "default" | "themed";
}

// Mirrors skills/splash/src/channel.ts CHANNELS[c].allowedFormats EXACTLY (source of truth).
// If the tool's rules change, the lock test in coverage-axes.test.ts fails — re-sync manually.
export const CHANNEL_FORMAT_ALLOWED: Record<Channel, VisualFormat[]> = {
  "social-vertical": ["static", "video"],
  "social-feed": ["static", "video"],
  "article-web": ["static", "interactive", "video", "scrolly"],
};

export function normalizeChannel(freeText: string): Channel | "unknown" {
  const t = freeText.toLowerCase();
  const social = t.includes("social") || t.includes("instagram") || t.includes("tiktok") || t.includes("story");
  const web = /web|article|embed|website|artikel|long-form|scrolly/.test(t);
  if (web) return "article-web"; // web/article phrasing wins even when "social" also appears (e.g. "web article + horizontal social")
  if (social && (t.includes("vertical") || t.includes("instagram") || t.includes("tiktok") || t.includes("story") || t.includes("full-screen"))) return "social-vertical";
  if (social && (t.includes("feed") || t.includes("horizontal"))) return "social-feed";
  if (social && t.includes("video")) return "social-vertical"; // bare "social video" defaults vertical
  if (social) return "social-vertical";
  return "unknown";
}

const STOPWORDS: Record<"fr"|"de"|"it"|"en", string[]> = {
  fr: ["le","la","les","des","une","est","que","dans","pour","aux"],
  de: ["der","die","das","und","nicht","mit","ist","auch","werden","den"],
  it: ["il","la","di","che","non","per","con","sono","anche","gli"],
  en: ["the","and","of","to","in","that","with","for","is","are"],
};

export function detectLanguage(articleText: string): "fr"|"de"|"it"|"en"|"unknown" {
  const words = articleText.slice(0, 2000).toLowerCase().split(/[^a-zàâäéèêëïîôöùûüç]+/).filter(Boolean);
  const set = new Set(words);
  const score = (langs: string[]) => langs.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
  const scores = (Object.keys(STOPWORDS) as Array<keyof typeof STOPWORDS>)
    .map((l) => ({ l, s: score(STOPWORDS[l]) }))
    .sort((a, b) => b.s - a.s);
  if (scores[0].s < 3 || scores[0].s === scores[1].s) return "unknown"; // low confidence / tie
  return scores[0].l;
}

export function extractAxes(caseDir: string): CaseAxes {
  const slug = caseDir.split("/").filter(Boolean).pop() ?? caseDir;
  const readJson = (f: string): any => {
    const p = join(caseDir, f);
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  };
  const expect = readJson("expect.json");
  const persona = readJson("persona.json");
  const articlePath = join(caseDir, "article.md");
  const article = existsSync(articlePath) ? readFileSync(articlePath, "utf8") : "";

  const family = typeof expect.expectFamily === "string" ? expect.expectFamily : "unknown";
  const channel = typeof persona.channel === "string" ? normalizeChannel(persona.channel) : "unknown";
  const language = article ? detectLanguage(article) : "unknown";
  const fmt = expect.expectFormat;
  const format: VisualFormat | "unpinned" =
    fmt === "static" || fmt === "interactive" || fmt === "video" || fmt === "scrolly" ? fmt : "unpinned";
  const blob = (JSON.stringify(persona) + JSON.stringify(expect)).toLowerCase();
  const theme: "default" | "themed" =
    /"theme"|brandhue|themebg|"palette"|newsroom/.test(blob) ? "themed" : "default";

  return { slug, family, channel, language, format, theme };
}

const CHANNEL_FORMAT = new Set(["channel", "format"]);
export function isPairValid(a: {axis: string; val: string}, b: {axis: string; val: string}): boolean {
  // Only channel×format is constrained today. Sentinels are always "valid" here (flagged un-pinnable in coverage).
  const isCF = CHANNEL_FORMAT.has(a.axis) && CHANNEL_FORMAT.has(b.axis) && a.axis !== b.axis;
  if (!isCF) return true;
  const ch = (a.axis === "channel" ? a.val : b.val);
  const fmt = (a.axis === "format" ? a.val : b.val);
  if (ch === "unknown" || fmt === "unpinned") return true;
  const allowed = CHANNEL_FORMAT_ALLOWED[ch as Channel];
  return allowed ? allowed.includes(fmt as VisualFormat) : true;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `bun test tests/coverage-axes.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/coverage-axes.ts tests/coverage-axes.test.ts
git commit -m "feat(coverage): axis extraction (channel/lang/format/theme) + channel×format constraint table"
```

---

### Task 2: `src/coverage.ts` — pairwise coverage computation

**Files:**
- Create: `src/coverage.ts`
- Create: `tests/coverage.test.ts`

**Interfaces:**
- Consumes: `CaseAxes`, `isPairValid` (Task 1).
- Produces:
  - `const AXES = ["family","channel","language","format","theme"] as const;`
  - `axisDomains(cases: CaseAxes[]): Record<string, string[]>` — observed values per axis (incl. sentinels).
  - `interface Hole { axisA: string; valA: string; axisB: string; valB: string; }`
  - `interface CoverageResult { pairsTotal: number; pairsCovered: number; pct: number; holes: Hole[]; unpinnable: Record<string, number>; distribution: Record<string, Record<string, number>>; }`
  - `pairwiseCoverage(cases: CaseAxes[]): CoverageResult`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { pairwiseCoverage, axisDomains } from "../src/coverage.ts";
import type { CaseAxes } from "../src/coverage-axes.ts";

const c = (o: Partial<CaseAxes>): CaseAxes => ({
  slug: o.slug ?? "s", family: o.family ?? "trend", channel: o.channel ?? "article-web",
  language: o.language ?? "fr", format: o.format ?? "static", theme: o.theme ?? "default",
});

test("a valid in-domain pair no case covers is a hole; a covered pair is not", () => {
  // domain family={trend,ranking}, language={fr,de}. Cases cover (trend,fr),(trend,de),(ranking,fr)
  // but NEVER (ranking,de) — an in-domain valid pair with zero cases → must be a hole.
  const cases = [
    c({slug:"a", family:"trend",   language:"fr"}),
    c({slug:"b", family:"trend",   language:"de"}),
    c({slug:"d", family:"ranking", language:"fr"}),
  ];
  const r = pairwiseCoverage(cases);
  const hasHole = (aA:string,vA:string,aB:string,vB:string) =>
    r.holes.some(h => (h.axisA===aA&&h.valA===vA&&h.axisB===aB&&h.valB===vB) || (h.axisA===aB&&h.valA===vB&&h.axisB===aA&&h.valB===vA));
  expect(hasHole("family","ranking","language","de")).toBe(true);   // valid, uncovered → hole
  expect(hasHole("family","trend","language","fr")).toBe(false);    // covered by case a → not a hole
});

test("an invalid pair (social-vertical × interactive) is never counted as a hole", () => {
  const cases = [c({channel:"social-vertical", format:"static"}), c({channel:"article-web", format:"interactive"})];
  const r = pairwiseCoverage(cases);
  const invalidCounted = r.holes.some(h =>
    (h.valA==="social-vertical"&&h.valB==="interactive") || (h.valA==="interactive"&&h.valB==="social-vertical"));
  expect(invalidCounted).toBe(false);
});

test("axisDomains lists observed values incl. sentinels", () => {
  const d = axisDomains([c({format:"unpinned", channel:"unknown"})]);
  expect(d.format).toContain("unpinned");
  expect(d.channel).toContain("unknown");
});

test("unpinnable tally counts sentinel occurrences per axis", () => {
  const r = pairwiseCoverage([c({family:"unknown"}), c({format:"unpinned"}), c({})]);
  expect(r.unpinnable.family).toBe(1);
  expect(r.unpinnable.format).toBe(1);
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test tests/coverage.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/coverage.ts`**

```ts
import type { CaseAxes } from "./coverage-axes.ts";
import { isPairValid } from "./coverage-axes.ts";

export const AXES = ["family", "channel", "language", "format", "theme"] as const;
export type Axis = (typeof AXES)[number];
const SENTINELS = new Set(["unknown", "unpinned"]);

export interface Hole { axisA: string; valA: string; axisB: string; valB: string; }
export interface CoverageResult {
  pairsTotal: number; pairsCovered: number; pct: number;
  holes: Hole[];
  unpinnable: Record<string, number>;
  distribution: Record<string, Record<string, number>>;
}

export function axisDomains(cases: CaseAxes[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const ax of AXES) out[ax] = new Set();
  for (const cse of cases) for (const ax of AXES) out[ax].add(String((cse as any)[ax]));
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

export function pairwiseCoverage(cases: CaseAxes[]): CoverageResult {
  const domains = axisDomains(cases);
  const distribution: Record<string, Record<string, number>> = {};
  const unpinnable: Record<string, number> = {};
  for (const ax of AXES) {
    distribution[ax] = {};
    unpinnable[ax] = 0;
    for (const cse of cases) {
      const v = String((cse as any)[ax]);
      distribution[ax][v] = (distribution[ax][v] ?? 0) + 1;
      if (SENTINELS.has(v)) unpinnable[ax] += 1;
    }
  }
  // covered pair set
  const covered = new Set<string>();
  const key = (aA: string, vA: string, aB: string, vB: string) =>
    aA < aB ? `${aA}=${vA}|${aB}=${vB}` : `${aB}=${vB}|${aA}=${vA}`;
  for (const cse of cases) {
    for (let i = 0; i < AXES.length; i++)
      for (let j = i + 1; j < AXES.length; j++) {
        const aA = AXES[i], aB = AXES[j];
        covered.add(key(aA, String((cse as any)[aA]), aB, String((cse as any)[aB])));
      }
  }
  // enumerate all VALID in-domain pairs; a valid pair not in `covered` is a hole
  const holes: Hole[] = [];
  let pairsTotal = 0;
  for (let i = 0; i < AXES.length; i++)
    for (let j = i + 1; j < AXES.length; j++) {
      const aA = AXES[i], aB = AXES[j];
      for (const vA of domains[aA])
        for (const vB of domains[aB]) {
          if (!isPairValid({ axis: aA, val: vA }, { axis: aB, val: vB })) continue;
          pairsTotal += 1;
          if (!covered.has(key(aA, vA, aB, vB))) holes.push({ axisA: aA, valA: vA, axisB: aB, valB: vB });
        }
    }
  const pairsCovered = pairsTotal - holes.length;
  const pct = pairsTotal === 0 ? 100 : Math.round((pairsCovered / pairsTotal) * 1000) / 10;
  return { pairsTotal, pairsCovered, pct, holes, unpinnable, distribution };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `bun test tests/coverage.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/coverage.ts tests/coverage.test.ts
git commit -m "feat(coverage): pairwise coverage over 5 axes (constraint-aware holes + unpinnable tally)"
```

---

### Task 3: `src/covering-array.ts` — pairwise generator + hole-fill diff

**Files:**
- Create: `src/covering-array.ts`
- Create: `tests/covering-array.test.ts`

**Interfaces:**
- Consumes: `AXES`, `isPairValid` (Tasks 1-2), `CaseAxes`.
- Produces:
  - `type Cell = Record<string, string>;` (every axis pinned to a concrete non-sentinel value)
  - `generatePairwiseArray(domains: Record<string, string[]>): Cell[]`
  - `cellsToFillHoles(existing: CaseAxes[], array: Cell[]): Cell[]`

- [ ] **Step 1: Write the failing test (the correctness property)**

```ts
import { test, expect } from "bun:test";
import { generatePairwiseArray, cellsToFillHoles } from "../src/covering-array.ts";
import { AXES } from "../src/coverage.ts";
import { isPairValid } from "../src/coverage-axes.ts";

const DOMAINS = {
  family: ["trend", "ranking"],
  channel: ["article-web", "social-vertical"],
  language: ["fr", "de"],
  format: ["static", "interactive"],
  theme: ["default", "themed"],
};

test("the generated array covers EVERY valid pair", () => {
  const array = generatePairwiseArray(DOMAINS);
  // build the set of valid pairs the array covers
  const covered = new Set<string>();
  const key = (aA:string,vA:string,aB:string,vB:string)=> aA<aB?`${aA}=${vA}|${aB}=${vB}`:`${aB}=${vB}|${aA}=${vA}`;
  for (const cell of array)
    for (let i=0;i<AXES.length;i++) for (let j=i+1;j<AXES.length;j++)
      covered.add(key(AXES[i],cell[AXES[i]],AXES[j],cell[AXES[j]]));
  // every valid pair must be covered
  const missing: string[] = [];
  for (let i=0;i<AXES.length;i++) for (let j=i+1;j<AXES.length;j++) {
    const aA=AXES[i],aB=AXES[j];
    for (const vA of (DOMAINS as any)[aA]) for (const vB of (DOMAINS as any)[aB]) {
      if (!isPairValid({axis:aA,val:vA},{axis:aB,val:vB})) continue;
      if (!covered.has(key(aA,vA,aB,vB))) missing.push(`${aA}=${vA} × ${aB}=${vB}`);
    }
  }
  expect(missing).toEqual([]);
});

test("no generated cell violates the constraint (social-vertical never with interactive)", () => {
  const array = generatePairwiseArray(DOMAINS);
  for (const cell of array)
    expect(isPairValid({axis:"channel",val:cell.channel},{axis:"format",val:cell.format})).toBe(true);
});

test("cellsToFillHoles returns only cells covering pairs not already in the corpus", () => {
  const array = generatePairwiseArray(DOMAINS);
  // a corpus already covering everything → no cells needed
  const full = array.map((cell, i) => ({ slug: `e${i}`, ...cell } as any));
  expect(cellsToFillHoles(full, array).length).toBe(0);
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test tests/covering-array.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/covering-array.ts`**

An IPOG-style greedy generator. Build the target valid-pair set, then greedily emit rows (each row = a full axis assignment) that cover the most still-uncovered valid pairs, respecting `isPairValid`. Repeat until all valid pairs are covered.

```ts
import { AXES } from "./coverage.ts";
import { isPairValid } from "./coverage-axes.ts";
import type { CaseAxes } from "./coverage-axes.ts";

export type Cell = Record<string, string>;
const pkey = (aA:string,vA:string,aB:string,vB:string)=> aA<aB?`${aA}=${vA}|${aB}=${vB}`:`${aB}=${vB}|${aA}=${vA}`;

function allValidPairs(domains: Record<string,string[]>): Set<string> {
  const out = new Set<string>();
  for (let i=0;i<AXES.length;i++) for (let j=i+1;j<AXES.length;j++) {
    const aA=AXES[i],aB=AXES[j];
    for (const vA of domains[aA]??[]) for (const vB of domains[aB]??[]) {
      if (isPairValid({axis:aA,val:vA},{axis:aB,val:vB})) out.add(pkey(aA,vA,aB,vB));
    }
  }
  return out;
}

// Greedy full-row builder: for the given already-fixed partial row, pick each remaining axis's value to
// maximize newly-covered valid pairs while never violating the constraint against already-chosen axes.
function buildRow(domains: Record<string,string[]>, uncovered: Set<string>): Cell | null {
  const cell: Cell = {};
  for (const ax of AXES) {
    let best: string | null = null, bestGain = -1;
    for (const v of domains[ax] ?? []) {
      // reject if v conflicts with any already-set axis
      let ok = true;
      for (const a2 of Object.keys(cell)) if (!isPairValid({axis:ax,val:v},{axis:a2,val:cell[a2]})) { ok=false; break; }
      if (!ok) continue;
      let gain = 0;
      for (const a2 of Object.keys(cell)) if (uncovered.has(pkey(ax,v,a2,cell[a2]))) gain++;
      if (gain > bestGain) { bestGain = gain; best = v; }
    }
    if (best === null) return null; // no constraint-valid value (shouldn't happen with a non-empty domain)
    cell[ax] = best;
  }
  return cell;
}

export function generatePairwiseArray(domains: Record<string,string[]>): Cell[] {
  const uncovered = allValidPairs(domains);
  const rows: Cell[] = [];
  let guard = 0;
  while (uncovered.size > 0 && guard++ < 10000) {
    const row = buildRow(domains, uncovered);
    if (!row) break;
    // mark all valid pairs this row covers
    let progressed = false;
    for (let i=0;i<AXES.length;i++) for (let j=i+1;j<AXES.length;j++) {
      const k = pkey(AXES[i],row[AXES[i]],AXES[j],row[AXES[j]]);
      if (uncovered.delete(k)) progressed = true;
    }
    rows.push(row);
    if (!progressed) break; // safety: a row that covers nothing new → stop (avoids infinite loop)
  }
  return rows;
}

export function cellsToFillHoles(existing: CaseAxes[], array: Cell[]): Cell[] {
  const covered = new Set<string>();
  for (const cse of existing)
    for (let i=0;i<AXES.length;i++) for (let j=i+1;j<AXES.length;j++)
      covered.add(pkey(AXES[i], String((cse as any)[AXES[i]]), AXES[j], String((cse as any)[AXES[j]])));
  // keep a generated cell iff it covers at least one valid pair not already in the corpus
  return array.filter((cell) => {
    for (let i=0;i<AXES.length;i++) for (let j=i+1;j<AXES.length;j++) {
      const k = pkey(AXES[i],cell[AXES[i]],AXES[j],cell[AXES[j]]);
      if (!covered.has(k)) return true;
    }
    return false;
  });
}
```

Note: the `generatePairwiseArray` domains must be the CANONICAL non-sentinel domains (the CLI passes real axis
values, not `unknown`/`unpinned` — a generated target cell pins real values). The CLI (Task 4) constructs these.

- [ ] **Step 4: Run, verify pass**

Run: `bun test tests/covering-array.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Commit**

```bash
git add src/covering-array.ts tests/covering-array.test.ts
git commit -m "feat(coverage): IPOG-greedy pairwise covering-array generator + hole-fill diff"
```

---

### Task 4: `scripts/coverage.mjs` — the CLI + real-corpus acceptance

**Files:**
- Create: `scripts/coverage.mjs`
- Create: `tests/coverage-cli.test.ts` (a small smoke test of the report builders, no filesystem writes)

**Interfaces:**
- Consumes: everything from Tasks 1-3.

- [ ] **Step 1: Write a failing smoke test for the report builder**

Factor the report text out of the CLI so it's testable without writing files. In `scripts/coverage.mjs`, export a pure `renderCoverageMarkdown(result, cells)` and `buildCanonicalDomains(cases)`; the CLI's `main()` does the fs I/O.

```ts
import { test, expect } from "bun:test";
import { renderCoverageMarkdown, buildCanonicalDomains } from "../scripts/coverage.mjs";
import type { CaseAxes } from "../src/coverage-axes.ts";

const cases: CaseAxes[] = [
  { slug:"a", family:"trend", channel:"article-web", language:"fr", format:"static", theme:"default" },
  { slug:"b", family:"unknown", channel:"unknown", language:"unknown", format:"unpinned", theme:"themed" },
];

test("buildCanonicalDomains drops sentinels (target cells pin real values only)", () => {
  const d = buildCanonicalDomains(cases);
  expect(d.family).not.toContain("unknown");
  expect(d.format).not.toContain("unpinned");
  expect(d.family).toContain("trend");
});

test("renderCoverageMarkdown includes the pct, the un-pinnable tally, and a holes section", () => {
  const md = renderCoverageMarkdown(
    { pairsTotal: 10, pairsCovered: 7, pct: 70, holes: [{axisA:"family",valA:"trend",axisB:"language",valB:"de"}], unpinnable: { family:1, channel:1 }, distribution: { channel: { "article-web":1, "unknown":1 } } },
    [{ family:"ranking", channel:"article-web", language:"de", format:"static", theme:"themed" }],
  );
  expect(md).toContain("70");
  expect(md).toMatch(/un-?pinnable/i);
  expect(md).toMatch(/hole/i);
  expect(md).toContain("family");
});
```

- [ ] **Step 2: Run, verify fail**

Run: `bun test tests/coverage-cli.test.ts` → FAIL.

- [ ] **Step 3: Implement `scripts/coverage.mjs`**

```js
#!/usr/bin/env bun
import { readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractAxes } from "../src/coverage-axes.ts";
import { pairwiseCoverage, AXES } from "../src/coverage.ts";
import { generatePairwiseArray, cellsToFillHoles } from "../src/covering-array.ts";

const HARNESS_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SENTINELS = new Set(["unknown", "unpinned"]);

export function buildCanonicalDomains(cases) {
  const out = {};
  for (const ax of AXES) out[ax] = new Set();
  for (const c of cases) for (const ax of AXES) { const v = String(c[ax]); if (!SENTINELS.has(v)) out[ax].add(v); }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

export function renderCoverageMarkdown(result, cells) {
  const lines = [];
  lines.push(`# Corpus coverage — pairwise\n`);
  lines.push(`**Pairwise coverage: ${result.pct}%** (${result.pairsCovered}/${result.pairsTotal} valid pairs covered)\n`);
  lines.push(`## Un-pinnable (axes with no structured/inferrable value)`);
  for (const [ax, n] of Object.entries(result.unpinnable)) if (n > 0) lines.push(`- ${ax}: ${n} case(s) sentinel`);
  lines.push(`\n## Per-axis distribution (clustering)`);
  for (const [ax, dist] of Object.entries(result.distribution)) {
    const top = Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([v,n])=>`${v}:${n}`).join(", ");
    lines.push(`- **${ax}**: ${top}`);
  }
  lines.push(`\n## Holes (valid pairs no case covers) — ${result.holes.length}`);
  for (const h of result.holes.slice(0, 200)) lines.push(`- ${h.axisA}=${h.valA} × ${h.axisB}=${h.valB}`);
  if (result.holes.length > 200) lines.push(`- …and ${result.holes.length - 200} more`);
  lines.push(`\n## Covering-array cells to add (fill the holes) — ${cells.length}`);
  lines.push(`_Materializing + running these cells is deferred (S4b-2, spend-gated)._`);
  for (const c of cells.slice(0, 200)) lines.push(`- ${AXES.map((a)=>`${a}=${c[a]}`).join(", ")}`);
  return lines.join("\n");
}

function main() {
  const casesDir = join(HARNESS_ROOT, "cases");
  const slugs = readdirSync(casesDir).filter((d) => existsSync(join(casesDir, d, "persona.json")));
  const cases = slugs.map((s) => extractAxes(join(casesDir, s)));
  const result = pairwiseCoverage(cases);
  const domains = buildCanonicalDomains(cases);
  const array = generatePairwiseArray(domains);
  const cells = cellsToFillHoles(cases, array);

  const outDir = join(HARNESS_ROOT, "coverage");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "coverage-report.md"), renderCoverageMarkdown(result, cells));
  writeFileSync(join(outDir, "covering-array-cells.json"), JSON.stringify({ generatedFrom: cases.length + " cases", cells }, null, 2));
  console.log(`coverage: ${result.pct}% pairwise (${result.pairsCovered}/${result.pairsTotal}); ${result.holes.length} holes; ${cells.length} cells to add`);
  console.log(`wrote ${join(outDir, "coverage-report.md")} + covering-array-cells.json`);
}

if (import.meta.main) main();
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun test tests/coverage-cli.test.ts` → PASS. Then `bun test` → 0-fail.

- [ ] **Step 5: Run the CLI on the real 105 cases (the deliverable / acceptance)**

Run: `cd /Users/rmdms/Sites/Professional/splash-harness && bun scripts/coverage.mjs`
Expected: prints the pairwise %, holes count, cells-to-add count; writes `coverage/coverage-report.md` + `coverage/covering-array-cells.json`. Sanity-check the report: the `channel` distribution should show the heavy `article-web` clustering (from §0), and the un-pinnable tally should show ~22 `family=unknown`. Paste the console summary + the first ~15 lines of `coverage-report.md` into the task report — this is the audit's answer with numbers.

- [ ] **Step 6: Commit**

```bash
git add scripts/coverage.mjs tests/coverage-cli.test.ts
git commit -m "feat(coverage): CLI — pairwise report + covering-array cell-specs over the 105-case corpus"
```

(Decide whether to git-ignore the generated `coverage/` output dir or commit the report as a checked-in
artifact — if the repo git-ignores `reports/` and similar generated dirs, mirror that for `coverage/`; note the
choice in the report.)

---

## Notes for the executor

- After all tasks: `cd /Users/rmdms/Sites/Professional/splash-harness && bun test` — full suite 0-fail (397 + new tests).
- Final whole-branch review on a capable model. Harness code (private QA repo) — do NOT push (Rémy's decision).
- Key review lens: the constraint table matches `channel.ts` exactly; sentinels are never counted as a real covered pair; the covering-array's covers-every-valid-pair property holds; the CLI's canonical domains exclude sentinels.
