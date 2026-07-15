# Vertical Slice 1 — Datawrapper chart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Validate the whole Splash loop (KB → ② suggester → skill → export) on the cheapest representative case: turn `data + intent` into a good Datawrapper chart — type fits the intent, design conforms to best-practice — published (embed) AND exported as an owned PNG.

**Architecture:** A pure `ChartSpec` contract sits between ② and the producer. ② (an LLM skill) emits a validated `ChartSpec` grounded on 2 KB references. A pure `specToMetadata` maps the spec to Datawrapper's real `metadata` fields (applying design-conformance). A thin Datawrapper REST client drives create→data→config→publish→export-PNG. Everything is validated against the **real** Datawrapper API (`vraies clés`).

**Tech Stack:** Bun + TypeScript, `bun:test`, Datawrapper REST API v3 (`https://api.datawrapper.de/v3`, Bearer auth).

## Global Constraints

- Runtime **Bun**. Tests `bun:test`. TDD: failing test first. All code/comments/commits in **English**.
- **No Claude/Anthropic mention** in any committed artifact (commits, docs).
- Token: `DATAWRAPPER_API_TOKEN` read from `/splash/.env` (gitignored). Integration tests load it via `Bun`'s auto `.env` loading; they FAIL loudly if the token is absent (no mock — real keys, real failures).
- **Owned static fallback = PNG** (free tier confirmed: `export/png` → 200; `svg`/`pdf` → 401 paid). Every produced chart yields a PNG file.
- Design-conformance is applied via DW's real fields: `describe.aria-description` (alt = the insight), `describe.intro`, `describe.source-name`/`source-url`, `describe.number-format`, `visualize.base-color` (Okabe-Ito), `visualize.value-labels.show`.
- Colors restricted to the **Okabe-Ito** colorblind-safe set; **≤2 colours** guardrail.
- All files live under `/splash`. The skill format follows Tom's canon (8-section SKILL.md + references + sample-data + output-proof).
- No tiers (everything free).

## File Structure

```
/splash/
  knowledge/references/
    chart-selection.md          # intent → DW chart type (FT 9 intents + data-to-viz caveats), credited
    design-conformance.md       # pass/fail checklist, credited
  skills/dw-chart/
    package.json                # Bun project for the skill
    SKILL.md                    # 8-section skill doc
    references/api-flow.md      # the DW API chain + field mapping
    src/
      chart-spec.ts             # ChartSpec type + validateChartSpec()  (pure)
      spec-to-metadata.ts       # ChartSpec → DW metadata patch  (pure)
      datawrapper.ts            # REST client (create/setData/patch/publish/exportPng/delete)
      produce.ts                # orchestrates spec → {chartId, embed, pngPath, publicUrl}
    tests/
      chart-spec.test.ts        # pure
      spec-to-metadata.test.ts  # pure
      datawrapper.test.ts       # integration (real API)
      produce.test.ts           # integration (real API) + conformance assertion
    assets/sample-data/
      unemployment.csv
      sample.spec.json
    output-proof/               # produced PNG + embed snippet (proof)
  skills/suggest-chart/
    SKILL.md                    # ② minimal — emits a ChartSpec grounded on the 2 KB refs
    examples/unemployment.md    # worked example: intent + data → emitted ChartSpec (validates)
```

---

### Task 1: KB references (chart-selection + design-conformance)

**Files:**
- Create: `/splash/knowledge/references/chart-selection.md`
- Create: `/splash/knowledge/references/design-conformance.md`

**Interfaces:**
- Consumes: nothing.
- Produces: two retrieval-ready references the ② skill and the conformance mapping cite. `design-conformance.md` enumerates the exact rules later encoded in `spec-to-metadata.ts` and `chart-spec.ts`.

- [ ] **Step 1: Write `chart-selection.md`**

```markdown
# Chart selection — intent → chart type

> Source: FT Visual Vocabulary (the canon) — https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> data-to-viz.com (caveats). Credited.

Pick by **intent first**, then the simplest type that serves it. DW type ids in `code`.

| Intent (FT) | Use | DW type |
|---|---|---|
| Change over time | trend over a continuous period | `d3-lines` (many points) · `column-chart` (few periods, one series) · `d3-area` (totals, use with care) |
| Magnitude | compare sizes | `column-chart` (vertical) · `d3-bars` (long labels / many items). Must start at 0. |
| Ranking | order matters | `d3-bars` sorted · `d3-dot-plot` |
| Correlation | relationship of 2 vars | `d3-scatter-plot` · `d3-scatter-plot` sized = bubble |
| Part-to-whole | components of one whole | `stacked-column-chart` · `d3-pies` (≤5 slices, else bars) |
| Distribution | spread of values | `column-chart` as histogram · `d3-range-plot` |

Caveats (data-to-viz): pie only with few slices and clear differences; area hides component change; never compare angles precisely.

When in doubt → bars/columns on a common baseline (top of the perception hierarchy).
```

- [ ] **Step 2: Write `design-conformance.md`**

```markdown
# Design conformance — the per-chart checklist

> Source: corpus `design-principles.md` (Okabe-Ito, ONS type, WCAG, Datawrapper defaults, Tufte). Credited.

A produced chart MUST satisfy:

1. **Title = the insight**, sentence case ("Unemployment is at a five-year low", not "Unemployment 2018-2023").
2. **Colour**: only the Okabe-Ito colorblind-safe set —
   `#0072B2 #E69F00 #009E73 #D55E00 #CC79A7 #56B4E9 #F0E442 #000000`. **≤2 colours.** Blue `#0072B2` is the default single-series colour.
3. **Direct labels** over legends where the chart supports value labels.
4. **Number formatting**: strip noise, abbreviate (`12.8k`, not `12,831`).
5. **Source cited**: name + url.
6. **Alt text = the insight, not the structure** (WCAG 1.1.1) → goes to DW `aria-description`.
7. **Contrast** WCAG ≥ 4.5:1 for text (DW defaults satisfy this; don't override to low-contrast).

DW field mapping (used by `spec-to-metadata.ts`): title→`title`; insight→`describe.intro`;
alt→`describe.aria-description`; source→`describe.source-name`/`source-url`; number format→`describe.number-format`;
single colour→`visualize.base-color`; direct labels→`visualize.value-labels.show`.
```

- [ ] **Step 3: Verify the references are well-formed**

Run:
```bash
cd /splash && for f in knowledge/references/chart-selection.md knowledge/references/design-conformance.md; do
  echo "$f: $(wc -l < $f) lines"; grep -q "Source" "$f" && echo "  has credit ✅" || echo "  MISSING credit ❌"; done
```
Expected: both files < 500 lines, both print "has credit ✅".

- [ ] **Step 4: Commit**

```bash
cd /splash && git add knowledge/references
git commit -m "feat(kb): chart-selection + design-conformance references (credited)"
```

---

### Task 2: ChartSpec contract + validator

**Files:**
- Create: `/splash/skills/dw-chart/package.json`
- Create: `/splash/skills/dw-chart/src/chart-spec.ts`
- Test: `/splash/skills/dw-chart/tests/chart-spec.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ChartType` (string union of supported DW type ids).
  - `interface ChartSpec { type: ChartType; title: string; intro?: string; data: string; baseColor?: string; valueLabels?: boolean; numberFormat?: string; source?: { name: string; url?: string }; altInsight: string }`
  - `validateChartSpec(spec: unknown): { ok: true; spec: ChartSpec } | { ok: false; errors: string[] }`
  - `const OKABE_ITO: readonly string[]`

- [ ] **Step 1: Create the Bun project**

`/splash/skills/dw-chart/package.json`:
```json
{
  "name": "dw-chart",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
```

Run: `cd /splash/skills/dw-chart && bun install`
Expected: completes (no deps yet), creates `bun.lock`.

- [ ] **Step 2: Write the failing test**

`/splash/skills/dw-chart/tests/chart-spec.test.ts`:
```ts
import { describe, it, expect } from 'bun:test';
import { validateChartSpec, OKABE_ITO } from '../src/chart-spec';

const base = {
  type: 'd3-lines', title: 'Unemployment is at a five-year low',
  data: 'year,value\n2018,5.1\n2023,3.7', altInsight: 'Unemployment fell from 5.1% in 2018 to 3.7% in 2023'
};

describe('validateChartSpec', () => {
  it('accepts a well-formed spec', () => {
    const r = validateChartSpec({ ...base, baseColor: '#0072B2' });
    expect(r.ok).toBe(true);
  });
  it('rejects a missing insight title', () => {
    const r = validateChartSpec({ ...base, title: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/title/);
  });
  it('rejects a non Okabe-Ito colour', () => {
    const r = validateChartSpec({ ...base, baseColor: '#ff00ff' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/Okabe-Ito/);
  });
  it('rejects a missing altInsight (WCAG)', () => {
    const { altInsight, ...noAlt } = base;
    const r = validateChartSpec(noAlt);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/altInsight/);
  });
  it('exposes the Okabe-Ito palette', () => {
    expect(OKABE_ITO).toContain('#0072B2');
    expect(OKABE_ITO.length).toBe(8);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /splash/skills/dw-chart && bun test tests/chart-spec.test.ts`
Expected: FAIL — cannot find module `../src/chart-spec`.

- [ ] **Step 4: Implement `chart-spec.ts`**

`/splash/skills/dw-chart/src/chart-spec.ts`:
```ts
export const OKABE_ITO = [
  '#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9', '#F0E442', '#000000'
] as const;

export const CHART_TYPES = [
  'd3-lines', 'd3-area', 'column-chart', 'd3-bars', 'd3-dot-plot', 'd3-range-plot',
  'd3-scatter-plot', 'stacked-column-chart', 'd3-pies'
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export interface ChartSpec {
  type: ChartType;
  title: string;            // the insight, sentence case
  intro?: string;           // subtitle / insight elaboration
  data: string;             // CSV text
  baseColor?: string;       // single-series colour (Okabe-Ito)
  valueLabels?: boolean;    // direct labelling
  numberFormat?: string;    // DW number-format token (e.g. '0,0.[0]')
  source?: { name: string; url?: string };
  altInsight: string;       // WCAG: alt = the insight, not the structure
}

export function validateChartSpec(
  input: unknown
): { ok: true; spec: ChartSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['spec must be an object'] };
  const s = input as Record<string, unknown>;
  if (!CHART_TYPES.includes(s.type as ChartType)) errors.push(`type must be one of: ${CHART_TYPES.join(', ')}`);
  if (typeof s.title !== 'string' || !s.title.trim()) errors.push('title (the insight) is required');
  if (typeof s.data !== 'string' || !s.data.includes(',')) errors.push('data must be CSV text');
  if (typeof s.altInsight !== 'string' || !s.altInsight.trim()) errors.push('altInsight is required (WCAG: alt = the insight)');
  if (s.baseColor !== undefined && !(OKABE_ITO as readonly string[]).includes(s.baseColor as string))
    errors.push('baseColor must be an Okabe-Ito colour (colorblind-safe)');
  return errors.length ? { ok: false, errors } : { ok: true, spec: s as unknown as ChartSpec };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /splash/skills/dw-chart && bun test tests/chart-spec.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 6: Commit**

```bash
cd /splash && printf 'node_modules/\n' > skills/dw-chart/.gitignore
git add skills/dw-chart/package.json skills/dw-chart/bun.lock skills/dw-chart/.gitignore skills/dw-chart/src/chart-spec.ts skills/dw-chart/tests/chart-spec.test.ts
git commit -m "feat(dw-chart): ChartSpec contract + validator (Okabe-Ito, WCAG alt)"
```

---

### Task 3: spec → Datawrapper metadata mapping

**Files:**
- Create: `/splash/skills/dw-chart/src/spec-to-metadata.ts`
- Test: `/splash/skills/dw-chart/tests/spec-to-metadata.test.ts`

**Interfaces:**
- Consumes: `ChartSpec` (Task 2).
- Produces: `specToMetadata(spec: ChartSpec): { title: string; type: string; metadata: { describe: Record<string, unknown>; visualize: Record<string, unknown> } }`

- [ ] **Step 1: Write the failing test**

`/splash/skills/dw-chart/tests/spec-to-metadata.test.ts`:
```ts
import { describe, it, expect } from 'bun:test';
import { specToMetadata } from '../src/spec-to-metadata';
import type { ChartSpec } from '../src/chart-spec';

const spec: ChartSpec = {
  type: 'd3-lines',
  title: 'Unemployment is at a five-year low',
  intro: 'Rate fell steadily after 2021',
  data: 'year,value\n2018,5.1\n2023,3.7',
  baseColor: '#0072B2',
  valueLabels: true,
  numberFormat: '0,0.[0]',
  source: { name: 'ONS', url: 'https://ons.gov.uk' },
  altInsight: 'Unemployment fell from 5.1% in 2018 to 3.7% in 2023'
};

describe('specToMetadata', () => {
  it('maps title and type at the top level', () => {
    const p = specToMetadata(spec);
    expect(p.title).toBe(spec.title);
    expect(p.type).toBe('d3-lines');
  });
  it('puts the insight in describe.intro and alt in aria-description (WCAG)', () => {
    const p = specToMetadata(spec);
    expect(p.metadata.describe['intro']).toBe('Rate fell steadily after 2021');
    expect(p.metadata.describe['aria-description']).toBe(spec.altInsight);
  });
  it('cites the source and the number format', () => {
    const p = specToMetadata(spec);
    expect(p.metadata.describe['source-name']).toBe('ONS');
    expect(p.metadata.describe['source-url']).toBe('https://ons.gov.uk');
    expect(p.metadata.describe['number-format']).toBe('0,0.[0]');
  });
  it('applies the base colour and direct labels', () => {
    const p = specToMetadata(spec);
    expect(p.metadata.visualize['base-color']).toBe('#0072B2');
    expect(p.metadata.visualize['value-labels']).toEqual({ show: true });
  });
  it('omits optional fields when absent', () => {
    const p = specToMetadata({ type: 'column-chart', title: 'T', data: 'a,b\n1,2', altInsight: 'x' });
    expect(p.metadata.visualize['base-color']).toBeUndefined();
    expect(p.metadata.describe['number-format']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /splash/skills/dw-chart && bun test tests/spec-to-metadata.test.ts`
Expected: FAIL — cannot find module `../src/spec-to-metadata`.

- [ ] **Step 3: Implement `spec-to-metadata.ts`**

`/splash/skills/dw-chart/src/spec-to-metadata.ts`:
```ts
import type { ChartSpec } from './chart-spec';

export interface DwPatch {
  title: string;
  type: string;
  metadata: { describe: Record<string, unknown>; visualize: Record<string, unknown> };
}

export function specToMetadata(spec: ChartSpec): DwPatch {
  const describe: Record<string, unknown> = {
    intro: spec.intro ?? '',
    'source-name': spec.source?.name ?? '',
    'source-url': spec.source?.url ?? '',
    'aria-description': spec.altInsight
  };
  if (spec.numberFormat) describe['number-format'] = spec.numberFormat;

  const visualize: Record<string, unknown> = {};
  if (spec.baseColor) visualize['base-color'] = spec.baseColor;
  if (spec.valueLabels !== undefined) visualize['value-labels'] = { show: spec.valueLabels };

  return { title: spec.title, type: spec.type, metadata: { describe, visualize } };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /splash/skills/dw-chart && bun test tests/spec-to-metadata.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
cd /splash && git add skills/dw-chart/src/spec-to-metadata.ts skills/dw-chart/tests/spec-to-metadata.test.ts
git commit -m "feat(dw-chart): map ChartSpec to Datawrapper metadata (conformance fields)"
```

---

### Task 4: Datawrapper REST client

**Files:**
- Create: `/splash/skills/dw-chart/src/datawrapper.ts`
- Test: `/splash/skills/dw-chart/tests/datawrapper.test.ts`

**Interfaces:**
- Consumes: `DATAWRAPPER_API_TOKEN` from env.
- Produces:
  - `createChart(title: string, type: string): Promise<string>` (returns chart id)
  - `setData(id: string, csv: string): Promise<void>`
  - `patchChart(id: string, patch: object): Promise<void>`
  - `publishChart(id: string): Promise<string>` (returns publicUrl)
  - `exportPng(id: string, outPath: string, width?: number): Promise<number>` (returns bytes written)
  - `deleteChart(id: string): Promise<void>`

- [ ] **Step 1: Write the failing integration test (real API)**

`/splash/skills/dw-chart/tests/datawrapper.test.ts`:
```ts
import { describe, it, expect, afterAll } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { createChart, setData, patchChart, publishChart, exportPng, deleteChart } from '../src/datawrapper';

const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
let createdId = '';

describe('datawrapper client (real API)', () => {
  it('requires the token', () => {
    expect(hasToken).toBe(true); // FAIL LOUD if .env missing — no mock
  });

  it('runs the full create→data→patch→publish→export-png chain', async () => {
    const id = await createChart('splash client test', 'column-chart');
    createdId = id;
    expect(id).toMatch(/^[A-Za-z0-9]{5}$/);
    await setData(id, 'year,value\n2021,3\n2022,5\n2023,4\n');
    await patchChart(id, { metadata: { visualize: { 'base-color': '#0072B2' } } });
    const url = await publishChart(id);
    expect(url).toContain('datawrapper');
    const out = join(tmpdir(), `splash-${id}.png`);
    const bytes = await exportPng(id, out);
    expect(existsSync(out)).toBe(true);
    expect(bytes).toBeGreaterThan(1000);
    rmSync(out, { force: true });
  }, 60000);
});

afterAll(async () => { if (createdId) await deleteChart(createdId); });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /splash/skills/dw-chart && bun test tests/datawrapper.test.ts`
Expected: FAIL — cannot find module `../src/datawrapper`.

- [ ] **Step 3: Implement `datawrapper.ts`**

`/splash/skills/dw-chart/src/datawrapper.ts`:
```ts
const API = 'https://api.datawrapper.de/v3';

function token(): string {
  const t = process.env.DATAWRAPPER_API_TOKEN;
  if (!t) throw new Error('DATAWRAPPER_API_TOKEN is not set (see /splash/.env)');
  return t;
}
function auth(extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: `Bearer ${token()}`, ...extra };
}

export async function createChart(title: string, type: string): Promise<string> {
  const r = await fetch(`${API}/charts`, {
    method: 'POST', headers: auth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title, type })
  });
  if (!r.ok) throw new Error(`createChart ${r.status}: ${await r.text()}`);
  return (await r.json()).id as string;
}

export async function setData(id: string, csv: string): Promise<void> {
  const r = await fetch(`${API}/charts/${id}/data`, {
    method: 'PUT', headers: auth({ 'Content-Type': 'text/csv' }), body: csv
  });
  if (!r.ok) throw new Error(`setData ${r.status}: ${await r.text()}`);
}

export async function patchChart(id: string, patch: object): Promise<void> {
  const r = await fetch(`${API}/charts/${id}`, {
    method: 'PATCH', headers: auth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`patchChart ${r.status}: ${await r.text()}`);
}

export async function publishChart(id: string): Promise<string> {
  const r = await fetch(`${API}/charts/${id}/publish`, { method: 'POST', headers: auth() });
  if (!r.ok) throw new Error(`publishChart ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j?.data?.publicUrl as string) ?? `https://www.datawrapper.de/_/${id}/`;
}

export async function exportPng(id: string, outPath: string, width = 600): Promise<number> {
  const r = await fetch(`${API}/charts/${id}/export/png?unit=px&mode=rgb&width=${width}&plain=false`, {
    headers: auth()
  });
  if (!r.ok) throw new Error(`exportPng ${r.status}: ${await r.text()}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  await Bun.write(outPath, buf);
  return buf.byteLength;
}

export async function deleteChart(id: string): Promise<void> {
  await fetch(`${API}/charts/${id}`, { method: 'DELETE', headers: auth() });
}
```

- [ ] **Step 4: Run the test to verify it passes (real token)**

Run: `cd /splash/skills/dw-chart && bun test tests/datawrapper.test.ts`
Expected: PASS — token present, full chain green, PNG > 1000 bytes. (Bun auto-loads `/splash/.env`; if running from the skill dir, ensure the token is exported: `set -a; source /splash/.env; set +a` before `bun test`.)

- [ ] **Step 5: Commit**

```bash
cd /splash && git add skills/dw-chart/src/datawrapper.ts skills/dw-chart/tests/datawrapper.test.ts
git commit -m "feat(dw-chart): Datawrapper REST client (create/data/patch/publish/export-png)"
```

---

### Task 5: produce orchestrator (+ conformance assertion)

**Files:**
- Create: `/splash/skills/dw-chart/src/produce.ts`
- Create: `/splash/skills/dw-chart/assets/sample-data/unemployment.csv`
- Create: `/splash/skills/dw-chart/assets/sample-data/sample.spec.json`
- Test: `/splash/skills/dw-chart/tests/produce.test.ts`

**Interfaces:**
- Consumes: `validateChartSpec`, `ChartSpec` (Task 2); `specToMetadata` (Task 3); the client (Task 4).
- Produces: `produceChart(spec: ChartSpec, pngPath: string): Promise<{ chartId: string; embed: string; pngPath: string; publicUrl: string }>`

- [ ] **Step 1: Create the sample data**

`/splash/skills/dw-chart/assets/sample-data/unemployment.csv`:
```csv
year,value
2018,5.1
2019,4.8
2020,5.4
2021,5.6
2022,4.2
2023,3.7
```

`/splash/skills/dw-chart/assets/sample-data/sample.spec.json`:
```json
{
  "type": "d3-lines",
  "title": "Unemployment is at a five-year low",
  "intro": "After peaking in 2021, the rate fell sharply",
  "data": "year,value\n2018,5.1\n2019,4.8\n2020,5.4\n2021,5.6\n2022,4.2\n2023,3.7",
  "baseColor": "#0072B2",
  "valueLabels": true,
  "numberFormat": "0.[0]",
  "source": { "name": "Sample data", "url": "https://example.org" },
  "altInsight": "Unemployment rose to 5.6% in 2021 then fell to a five-year low of 3.7% in 2023"
}
```

- [ ] **Step 2: Write the failing integration test**

`/splash/skills/dw-chart/tests/produce.test.ts`:
```ts
import { describe, it, expect, afterAll } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { produceChart } from '../src/produce';
import { deleteChart } from '../src/datawrapper';
import type { ChartSpec } from '../src/chart-spec';

const spec = JSON.parse(
  readFileSync(join(import.meta.dir, '..', 'assets', 'sample-data', 'sample.spec.json'), 'utf8')
) as ChartSpec;
let id = '';

describe('produceChart (real API)', () => {
  it('produces a published chart, an embed, and an owned PNG with conformance applied', async () => {
    expect(!!process.env.DATAWRAPPER_API_TOKEN).toBe(true);
    const out = join(tmpdir(), 'splash-produce.png');
    const res = await produceChart(spec, out);
    id = res.chartId;
    expect(res.publicUrl).toContain('datawrapper');
    expect(res.embed).toContain(res.publicUrl);
    expect(existsSync(out)).toBe(true);
    // conformance applied: fetch the chart, assert aria-description == altInsight + base-color set
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${id}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` }
    });
    const chart = await r.json();
    expect(chart.metadata.describe['aria-description']).toBe(spec.altInsight);
    expect(chart.metadata.visualize['base-color']).toBe('#0072B2');
    rmSync(out, { force: true });
  }, 60000);
});

afterAll(async () => { if (id) await deleteChart(id); });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /splash/skills/dw-chart && bun test tests/produce.test.ts`
Expected: FAIL — cannot find module `../src/produce`.

- [ ] **Step 4: Implement `produce.ts`**

`/splash/skills/dw-chart/src/produce.ts`:
```ts
import { validateChartSpec, type ChartSpec } from './chart-spec';
import { specToMetadata } from './spec-to-metadata';
import { createChart, setData, patchChart, publishChart, exportPng } from './datawrapper';

export interface ProduceResult {
  chartId: string;
  embed: string;
  pngPath: string;
  publicUrl: string;
}

export async function produceChart(spec: ChartSpec, pngPath: string): Promise<ProduceResult> {
  const v = validateChartSpec(spec);
  if (!v.ok) throw new Error(`invalid chart spec: ${v.errors.join('; ')}`);

  const patch = specToMetadata(spec);
  const id = await createChart(spec.title, spec.type);
  await setData(id, spec.data);
  await patchChart(id, { type: patch.type, metadata: patch.metadata });
  const publicUrl = await publishChart(id);
  await exportPng(id, pngPath);

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
```

- [ ] **Step 5: Run the test to verify it passes (real token)**

Run: `cd /splash/skills/dw-chart && set -a; source /splash/.env; set +a; bun test tests/produce.test.ts`
Expected: PASS — chart published, embed contains the url, PNG written, `aria-description` and `base-color` confirmed on the live chart.

- [ ] **Step 6: Run the full suite**

Run: `cd /splash/skills/dw-chart && set -a; source /splash/.env; set +a; bun test`
Expected: PASS — `chart-spec`, `spec-to-metadata`, `datawrapper`, `produce` all green.

- [ ] **Step 7: Commit**

```bash
cd /splash && git add skills/dw-chart/src/produce.ts skills/dw-chart/assets/sample-data skills/dw-chart/tests/produce.test.ts
git commit -m "feat(dw-chart): produce orchestrator — spec to published chart + owned PNG, conformance verified"
```

---

### Task 6: dw-chart SKILL.md + references + output-proof

**Files:**
- Create: `/splash/skills/dw-chart/SKILL.md`
- Create: `/splash/skills/dw-chart/references/api-flow.md`
- Create: `/splash/skills/dw-chart/output-proof/` (PNG + embed snippet)

**Interfaces:**
- Consumes: everything from Tasks 2-5 (the skill is functionally complete; this makes it conform to the skill contract + produces the proof).
- Produces: a contract-complete skill.

- [ ] **Step 1: Generate the proof from the sample spec**

`/splash/skills/dw-chart/scripts/make-proof.ts`:
```ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { produceChart } from '../src/produce';
import type { ChartSpec } from '../src/chart-spec';

const dir = join(import.meta.dir, '..', 'output-proof');
mkdirSync(dir, { recursive: true });
const spec = JSON.parse(
  readFileSync(join(import.meta.dir, '..', 'assets', 'sample-data', 'sample.spec.json'), 'utf8')
) as ChartSpec;
const res = await produceChart(spec, join(dir, 'chart.png'));
writeFileSync(join(dir, 'embed.html'), res.embed + '\n');
writeFileSync(join(dir, 'result.json'), JSON.stringify({ chartId: res.chartId, publicUrl: res.publicUrl }, null, 2) + '\n');
console.log('proof written:', res.publicUrl);
```

Run: `cd /splash/skills/dw-chart && set -a; source /splash/.env; set +a; bun scripts/make-proof.ts`
Expected: prints `proof written: https://…datawrapper…`; `output-proof/chart.png`, `embed.html`, `result.json` exist.

- [ ] **Step 2: Write `SKILL.md` (8 sections)**

`/splash/skills/dw-chart/SKILL.md`:
```markdown
---
name: dw-chart
description: Use when you need a standard chart (line, bar, column, scatter, pie, dot, range) published as a Datawrapper embed AND an owned static PNG, with best-practice design applied. Keywords chart, datawrapper, embed, line, bar, column, scatter, pie, png, journalism, dataviz.
output_mode: interactive+static
---

# dw-chart — standard charts via Datawrapper, with an owned PNG fallback

## Overview

Turns a validated `ChartSpec` into a published Datawrapper chart (embed) **and** an owned PNG. Datawrapper renders; we apply best-practice via its real config fields. The PNG means the visual survives even if Datawrapper changes — no archive rot.

For video charts use the chart-video skills; for maps use the map skills; for rich custom interactivity use the native D3 chart skill.

## When to use

- A standard chart in an article: trend, magnitude, ranking, correlation, part-to-whole, distribution.
- You want it embeddable now AND archived as a file the newsroom owns.
- **Not** for: animated/video charts, bespoke interaction, or non-chart visuals.

## The one gotcha that will waste your day (read first)

SVG/PDF export is **paid** on Datawrapper (`export/svg` → 401). The owned fallback is **PNG** (`export/png` → 200, free). Don't build the fallback on SVG. The token lives in `/splash/.env` as `DATAWRAPPER_API_TOKEN`; `bun test` from the skill dir needs it exported (`set -a; source /splash/.env; set +a`).

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Contract | `src/chart-spec.ts` | `ChartSpec` + validator (Okabe-Ito, WCAG alt) |
| Mapping | `src/spec-to-metadata.ts` | ChartSpec → DW metadata (applies design-conformance) |
| Client | `src/datawrapper.ts` | REST: create/data/patch/publish/export-png |
| Orchestrator | `src/produce.ts` | spec → `{chartId, embed, pngPath, publicUrl}` |

## How it works (the shape)

1. **Validate** the `ChartSpec` (fail loud on bad colour / missing insight / missing alt).
2. **Map** spec → DW `metadata` (`describe.intro`, `aria-description`, `source-*`, `number-format`; `visualize.base-color`, `value-labels`).
3. **Drive** the API: create → setData (CSV) → patch → publish → export PNG.
4. **Return** the embed iframe + the owned PNG path.

Full field mapping + endpoints → `references/api-flow.md`.

## Quick start

1. Build a `ChartSpec` (see `assets/sample-data/sample.spec.json`).
2. `set -a; source /splash/.env; set +a` (token).
3. `bun -e "import {produceChart} from './src/produce'; ..."` or call `produceChart(spec, 'out.png')`.

## Tuning knobs (each is one value)

| Want | Knob | Where |
| --- | --- | --- |
| Chart type | `spec.type` | ChartSpec |
| Single-series colour | `spec.baseColor` (Okabe-Ito) | ChartSpec |
| Direct labels on/off | `spec.valueLabels` | ChartSpec |
| Number format | `spec.numberFormat` | ChartSpec |
| PNG width | `exportPng(id, path, width)` | `datawrapper.ts` |

## Files

- `src/{chart-spec,spec-to-metadata,datawrapper,produce}.ts` — the four layers.
- `assets/sample-data/` — runnable sample CSV + spec.
- `output-proof/` — the proven published chart (PNG + embed + result).
- `references/api-flow.md` — endpoints + field mapping.
```

- [ ] **Step 3: Write `references/api-flow.md`**

`/splash/skills/dw-chart/references/api-flow.md`:
```markdown
# Datawrapper API flow + field mapping

Auth: `Authorization: Bearer $DATAWRAPPER_API_TOKEN`. Base: `https://api.datawrapper.de/v3`.

## Chain
1. `POST /charts` `{title, type}` → `{id}`
2. `PUT /charts/{id}/data` (Content-Type text/csv) ← CSV body → 201
3. `PATCH /charts/{id}` `{type, metadata}` → 200
4. `POST /charts/{id}/publish` → 200, `data.publicUrl`
5. `GET /charts/{id}/export/png?unit=px&mode=rgb&width=600&plain=false` → 200 PNG (free)
   - `svg` / `pdf` → 401 (paid). Use PNG for the owned fallback.

## ChartSpec → metadata
| Conformance rule | DW field |
| --- | --- |
| Insight title | `title` (top level) |
| Insight subtitle | `metadata.describe.intro` |
| Alt = insight (WCAG 1.1.1) | `metadata.describe.aria-description` |
| Source citation | `metadata.describe.source-name` / `source-url` |
| Number format | `metadata.describe.number-format` |
| Single colour (Okabe-Ito) | `metadata.visualize.base-color` |
| Direct labels | `metadata.visualize.value-labels.show` |
```

- [ ] **Step 4: Commit**

```bash
cd /splash && printf 'output-proof/\n' >> skills/dw-chart/.gitignore  # PNG is a generated proof; keep embed+result
git add skills/dw-chart/SKILL.md skills/dw-chart/references skills/dw-chart/scripts skills/dw-chart/.gitignore
git add -f skills/dw-chart/output-proof/embed.html skills/dw-chart/output-proof/result.json
git commit -m "docs(dw-chart): SKILL.md (8-section contract) + api-flow + output-proof"
```

---

### Task 7: suggest-chart skill (② minimal) + worked example

**Files:**
- Create: `/splash/skills/suggest-chart/SKILL.md`
- Create: `/splash/skills/suggest-chart/examples/unemployment.md`

**Interfaces:**
- Consumes: `knowledge/references/chart-selection.md` + `design-conformance.md` (Task 1); emits a `ChartSpec` (Task 2 shape) consumed by `dw-chart`.
- Produces: the decision skill — given data + intent, a validated `ChartSpec`.

- [ ] **Step 1: Write `SKILL.md`**

`/splash/skills/suggest-chart/SKILL.md`:
```markdown
---
name: suggest-chart
description: Use to decide which chart (if any) serves an article's intent and emit a ChartSpec for dw-chart. Reads the data profile + the editorial intent, grounded on the KB references. Keywords suggest, choose chart, intent, dataviz, orchestration.
---

# suggest-chart — decide the chart, emit a ChartSpec

## Overview

The minimal ② for the Datawrapper slice. Given a **data profile** (columns, types, cardinality) and an
**editorial intent**, it picks the chart type that serves the intent and emits a `ChartSpec` that `dw-chart`
produces. It never invents data; if no chart serves the story, it says so.

## Inputs

- Data (CSV or a profile of it) + a one-line **intent** ("show the unemployment trend 2018-2023").

## How it decides

1. Read `knowledge/references/chart-selection.md` → map **intent → DW type** (intent first, simplest type that serves it).
2. Read `knowledge/references/design-conformance.md` → fill the conformance fields.
3. Emit a **ChartSpec** (the exact shape `dw-chart/src/chart-spec.ts` validates):
   `{ type, title (the insight, sentence case), intro?, data (CSV), baseColor (Okabe-Ito, default #0072B2),
   valueLabels?, numberFormat?, source?, altInsight (WCAG: the insight, not the structure) }`.
4. Guardrails: **≤2 colours**; default single series to `#0072B2`; if the data is too complex for a clean
   chart, return `{ "decision": "no-chart", "reason": "..." }` instead of forcing one.

## Self-check

The emitted spec MUST pass `validateChartSpec` (run it via the dw-chart skill). Title and altInsight must
state the **insight**, not the column names.

## Output

A single `ChartSpec` JSON (or a `no-chart` decision). Hand it to `dw-chart`.
```

- [ ] **Step 2: Write the worked example**

`/splash/skills/suggest-chart/examples/unemployment.md`:
```markdown
# Worked example — unemployment trend

**Intent:** "Show how unemployment changed 2018-2023."
**Data profile:** columns `year` (ordinal time, 6 rows), `value` (numeric %). One series.

**Decision:** intent = *change over time*, one series, few points → `d3-lines` (per chart-selection).

**Emitted ChartSpec:**
```json
{
  "type": "d3-lines",
  "title": "Unemployment is at a five-year low",
  "intro": "After peaking in 2021, the rate fell sharply",
  "data": "year,value\n2018,5.1\n2019,4.8\n2020,5.4\n2021,5.6\n2022,4.2\n2023,3.7",
  "baseColor": "#0072B2",
  "valueLabels": true,
  "numberFormat": "0.[0]",
  "source": { "name": "Sample data", "url": "https://example.org" },
  "altInsight": "Unemployment rose to 5.6% in 2021 then fell to a five-year low of 3.7% in 2023"
}
```
This is the same spec as `dw-chart/assets/sample-data/sample.spec.json` — it validates and produces.
```

- [ ] **Step 3: Verify the example's spec validates**

Run:
```bash
cd /splash/skills/dw-chart && bun -e '
import { validateChartSpec } from "./src/chart-spec";
import { readFileSync } from "node:fs";
const spec = JSON.parse(readFileSync("assets/sample-data/sample.spec.json","utf8"));
const r = validateChartSpec(spec);
if (!r.ok) { console.error("INVALID", r.errors); process.exit(1); }
console.log("example spec valid ✅");'
```
Expected: prints `example spec valid ✅`.

- [ ] **Step 4: Commit**

```bash
cd /splash && git add skills/suggest-chart
git commit -m "feat(suggest-chart): minimal suggester emitting a validated ChartSpec, grounded on KB"
```

---

### Task 8: End-to-end slice verification

**Files:**
- Read: the whole slice.

- [ ] **Step 1: Confirm the loop on the sample (② spec → dw-chart → owned PNG + embed)**

Run:
```bash
cd /splash/skills/dw-chart && set -a; source /splash/.env; set +a
bun -e '
import { produceChart } from "./src/produce";
import { readFileSync } from "node:fs";
const spec = JSON.parse(readFileSync("assets/sample-data/sample.spec.json","utf8"));
const res = await produceChart(spec, "/tmp/splash-e2e.png");
console.log("publicUrl:", res.publicUrl);
console.log("embed starts:", res.embed.slice(0,40));
import { statSync } from "node:fs"; console.log("png bytes:", statSync("/tmp/splash-e2e.png").size);
import { deleteChart } from "./src/datawrapper"; await deleteChart(res.chartId);'
```
Expected: prints a datawrapper `publicUrl`, an `<iframe` embed, and `png bytes:` > 1000.

- [ ] **Step 2: Full suite green**

Run: `cd /splash/skills/dw-chart && set -a; source /splash/.env; set +a; bun test`
Expected: all 4 test files PASS.

- [ ] **Step 3: Confirm the contract files exist**

Run:
```bash
cd /splash && ls knowledge/references/chart-selection.md knowledge/references/design-conformance.md \
  skills/dw-chart/SKILL.md skills/dw-chart/output-proof/embed.html skills/suggest-chart/SKILL.md
```
Expected: all listed, no "No such file".

- [ ] **Step 4: Final commit (only if fixes were needed)**

```bash
cd /splash && git add -A && git commit -m "test(slice-1): end-to-end loop verified — intent to owned PNG + embed"
```
</content>
