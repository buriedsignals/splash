# C6 — Claim-Grounding Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** GUARD 4 (claim-grounding: numeric/temporal claims in `title`/`confirmedTakeaway`
checked against the data domain) covers the map-native path, map-dw coverage is PROVEN by test,
and every scripted anti-hallucination guard is documented for Tom (his #6).

**Architecture:** `claimGroundingErrors` (`skills/splash/src/validate-gate.ts:328-378`) bails on
non-CSV `data` (`csvDomain` returns null for JSON) — map-native configs carry
`rows: Record<string, string|number>[]` + `valueField` instead. Add a rows-domain reader beside
`csvDomain` and branch on which shape the spec carries. map-dw's `MapSpec.data` IS CSV text (the
adapters contract) — write the proving test before assuming anything. Then one documentation
file listing every scripted guard.

**Tech Stack:** TypeScript, Bun, bun:test.

## Global Constraints

- Code, comments, commits: English. No vendor mention. Bun, bun:test, TDD.
- GUARD 4's existing bias stands: flag only value EXCEEDS max (over-claim direction);
  below-min stays human-review. Years-vs-time-axis stays CSV/chart-only (a map has no time
  x-axis) — do NOT invent a year check for maps.
- Never weaken the CSV path — chart behavior byte-identical (existing tests must not change).

---

### Task 1: Prove (or disprove) map-dw coverage as it stands

**Files:**
- Test: `skills/splash/tests/validate-gate.test.ts` (extend — the file exists; follow its
  local helpers for building an `AcceptedProposal`)

**Interfaces:**
- Consumes: `validateAccepted` (or the exported `claimGroundingErrors` if already exported —
  check the file's exports; if `claimGroundingErrors` is module-private, test through
  `validateAccepted` with a minimal valid map-dw spec).

- [ ] **Step 1: Write the proving test**

```ts
it("should ground a map-dw takeaway claim against its CSV value domain (GUARD 4 covers map-dw)", () => {
  // MapSpec.data is CSV text (adapters contract) — region,value rows. The takeaway
  // over-claims 90 while the data tops out at 42: GUARD 4 must bite.
  const proposal = {
    id: "mapdw-claim",
    producer: "map-dw" as const,
    format: "static" as const,
    channel: "article-web" as const,
    confirmedTakeaway: "Unemployment peaks at 90% in the north",
    spec: {
      // build the MINIMAL spec that clears validateMapSpec — copy the smallest passing
      // map-dw spec from this test file's existing cases and swap in this data:
      data: "region,value\nNord,42\nSud,12\n",
      title: "Unemployment by region",
    },
  };
  const outcome = validateAccepted(proposal, [proposal]);
  expect(outcome.ok).toBe(false);
  if (!outcome.ok)
    expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(true);
});
```

- [ ] **Step 2: Run it**

Run: `cd skills/splash && bun test tests/validate-gate.test.ts`
Two legitimate outcomes:
- PASS → map-dw was already covered; keep the test as the pin, note it in the commit message.
- FAIL because `validateMapSpec` rejects the minimal spec → fix the spec fixture (not the
  guard) until it isolates GUARD 4. FAIL because GUARD 4 never fired on valid input → map-dw
  is NOT covered; find why (likely `s.data` is not where MapSpec carries CSV — read
  `skills/map-dw/src/map-spec.ts`) and extend `claimGroundingErrors`'s data lookup, mirroring
  Task 2's pattern.

- [ ] **Step 3: Commit**

```bash
git add skills/splash/tests/validate-gate.test.ts
git commit -m "test(splash): GUARD 4 claim-grounding coverage proven for map-dw CSV specs"
```

---

### Task 2: Extend GUARD 4 to map-native rows/valueField

**Files:**
- Modify: `skills/splash/src/validate-gate.ts` (beside `csvDomain`, ~line 286; and inside
  `claimGroundingErrors`, ~lines 328-340)
- Test: `skills/splash/tests/validate-gate.test.ts` (extend)

**Interfaces:**
- Consumes: map-native config shape `{ rows: Record<string, string|number>[]; valueField: string }`
  (`skills/map-native/src/choropleth-geo.ts` `ChoroplethData`).
- Produces: `rowsDomain(rows, valueField): { yMax?: number } | null` (module-private).

- [ ] **Step 1: Write the failing tests**

```ts
it("should ground a map-native takeaway claim against rows[valueField] (GUARD 4 map-native)", () => {
  const proposal = {
    id: "mapnative-claim",
    producer: "map-native" as const,
    format: "static" as const,
    channel: "article-web" as const,
    confirmedTakeaway: "The rate reaches 75% in Geneva",
    spec: {
      // copy the smallest passing choropleth config from this file's existing map-native
      // cases; the grounding-relevant parts:
      rows: [
        { iso: "CHE-GE", rate: 42 },
        { iso: "CHE-VD", rate: 31 },
      ],
      valueField: "rate",
      title: "Rate by canton",
    },
  };
  const outcome = validateAccepted(proposal, [proposal]);
  expect(outcome.ok).toBe(false);
  if (!outcome.ok)
    expect(outcome.errors.some((e) => e.includes("claim-grounding"))).toBe(true);
});

it("should stay silent on a map-native claim inside the rows domain", () => {
  // Same config, takeaway cites 42 (the actual max) → no claim-grounding error.
  // Build it, expect outcome.ok === true (or errors without "claim-grounding").
});

it("should stay a strict no-op for a map-native config without rows/valueField", () => {
  // e.g. a locator config (markers, no value) → no claim-grounding error even with a
  // number in the takeaway ("the 3 sites…").
});
```

(Fill the second and third bodies concretely from the first — same builder, different
takeaway/config.)

- [ ] **Step 2: Run to verify the first fails** (the no-op ones may already pass)

Run: `cd skills/splash && bun test tests/validate-gate.test.ts`

- [ ] **Step 3: Implement**

In `validate-gate.ts`, add beside `csvDomain`:

```ts
// map-native configs carry no CSV: their joined values live in rows[valueField]
// (ChoroplethData, choropleth-geo.ts — shared by choropleth/hex/cartogram/symbol configs).
// Domain = the numeric values of that one field; no time axis exists on this path, so the
// year check never applies (value-exceeds-max only).
function rowsDomain(spec: Record<string, unknown>): { yMax?: number } | null {
  const rows = spec.rows;
  const valueField = spec.valueField;
  if (!Array.isArray(rows) || typeof valueField !== "string") return null;
  const values: number[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const v = (row as Record<string, unknown>)[valueField];
    const n = typeof v === "number" ? v : parseLocaleNumber(String(v ?? ""));
    if (Number.isFinite(n)) values.push(n);
  }
  if (!values.length) return null;
  return { yMax: Math.max(...values) };
}
```

In `claimGroundingErrors` (lines 331-335), replace the CSV-only bail:

```ts
  const s = spec as Record<string, unknown>;
  const csv = typeof s.data === "string" ? s.data : undefined;
  if (!csv) return [];
  const domain = csvDomain(csv);
  if (!domain) return [];
```

with:

```ts
  const s = spec as Record<string, unknown>;
  const csv = typeof s.data === "string" ? s.data : undefined;
  const domain = csv ? csvDomain(csv) : rowsDomain(s);
  if (!domain) return [];
```

and guard the year branch for the rows path (its domain has no x fields — the existing
`!domain.xIsTime || domain.xMin === undefined` check already skips it when the fields are
absent; verify `xIsTime` is typed optional or defaulted `false` in `rowsDomain`'s return —
simplest: return `{ xIsTime: false, yMax }` so the shape matches `csvDomain`'s exactly).

- [ ] **Step 4: Run the full splash suite — green, chart path untouched**

Run: `cd skills/splash && bun test`
Expected: PASS, including every pre-existing claim-grounding test byte-identically.

- [ ] **Step 5: Commit**

```bash
git add skills/splash/src/validate-gate.ts skills/splash/tests/validate-gate.test.ts
git commit -m "feat(splash): GUARD 4 claim-grounding covers map-native rows/valueField domains"
```

---

### Task 3: `docs/splash/guardrails.md` — the scripted-guard inventory

**Files:**
- Create: `docs/splash/guardrails.md`

**Interfaces:**
- Consumes: the guards as they exist in code — VERIFY each entry against its file before
  writing (grounding rule: never document a guard from memory).

- [ ] **Step 1: Write the inventory**

One table + a paragraph per guard family. Entries to verify-and-include (anchor each to its
file):

```markdown
# Scripted guardrails — what the machine catches before and after production

Every guard below is CODE on the produce spine (not prose): a violation fails loud, before
the journalist sees a broken visual. This page exists so a newsroom (and Tom) can see what
is mechanically guaranteed vs what stays on the human render-review (Gate 3a).

| Guard | Catches | Where |
|---|---|---|
| Claim-grounding (GUARD 4) | title/takeaway citing a year outside the time axis, or a value above the plotted/joined max | `skills/splash/src/validate-gate.ts` |
| Annotation y-domain tripwire | a dw-chart annotation anchored outside the data's y-domain | `skills/dw-chart/src/spec-to-metadata.ts` |
| Narrative-beat anchors | a scrolly beat anchored on an x/category that is not in the data | `skills/splash/src/validate-gate.ts` (narrativeBeatErrors) |
| Comparative/rank captions | a beat caption asserting an order the sorted data contradicts | `skills/splash/SKILL.md` PROPOSITION + validate gate |
| Guardrail parity | suggest-chart's deterministic guards re-applied at the spine (hand-authored bypass impossible) | `skills/splash/src/guardrail-parity.ts` |
| Channel/format gates | a format outside the channel's allowed set; off-embed interactive; wrong render size | `skills/splash/src/channel.ts`, producers |
| Producer match (GUARD 1) | a silent producer swap between accept and produce | `skills/splash/src/produce-all.ts` |
| Source guards | a named org dropped for a generic fallback; a URL silently deepened; placeholder TLDs | `skills/splash/src/source-guard.ts` |
| Preflight | missing engine keys/deps announced before production (C2) | `skills/splash/src/preflight.ts` |
| Contrast/label-fit snaps | WCAG contrast on the real render; clipped/truncated labels at 900/360/1100px | producer snap scripts |
| Video snaps + watchdog | mp4 container/reveal/progression + final still; bounded hangs | native producers |
```

Verify every row: open the named file, confirm the guard still lives there and does what the
row says; drop or correct any row that does not verify. Add rows for guards found during
verification that the list misses (the sweep IS the deliverable).

- [ ] **Step 2: Cross-link**

Add one line to `skills/splash/SKILL.md`'s overview (near the gate table at the bottom):
`The full scripted-guard inventory lives in docs/splash/guardrails.md.`

- [ ] **Step 3: Commit**

```bash
git add docs/splash/guardrails.md skills/splash/SKILL.md
git commit -m "docs(splash): scripted-guardrail inventory — what the machine catches, with anchors"
```

---

### Task 4: Gate

- [ ] **Step 1: Full gate**

Run: `bun run check`
Expected: green.
