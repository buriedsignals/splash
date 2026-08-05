# scrolly module captions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the scrolly a self-contained embeddable module: data-tied rank-aware step captions (never article text), a persistent title header, a description intro caption, and a source — each shown once.

**Architecture:** `mapStoryToChapters` gains a richer caption derivation (intro caption = description; reveal captions add a rank descriptor from the max→min beat order; title goes to the header, not a caption) and carries `description`. `checkScrollyConformance` requires title + description + source. `Scrolly.tsx` renders a persistent title header. Reuses the existing pipeline; no new files.

**Tech Stack:** Bun, TypeScript, bun:test, React 19. Engine: `skills/scrolly`.

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages in English.
- **No attribution:** never mention Claude/Anthropic. No `Co-Authored-By`.
- **No article text in the module:** captions are derived from the DATA + the insight only. Never pull/duplicate article prose. (Grounded in `docs/splash/embeddable-module-best-practices.md`.)
- **Each furniture element once:** title (header), description (intro caption), source (footer) — no element repeated as a step caption.
- **Determinism:** `mapStoryToChapters` is pure — no `Date`/`Math.random`.
- **Key hygiene:** MapTiler key via env only for the build steps; never hard-code or log it.

## Reused interfaces

- `Beat` (`../../map-native/src/map-story`): `{ kind:"title"|"establish"|"reveal"|"takeaway", camera, highlight:string[], dim, callout:{region,name,value,text}|null, copy:string }`. `deriveMapStory` emits beats in order: title, establish, reveal(max), reveal(min), takeaway — so among reveals the FIRST is the highest, the LAST the lowest.
- `computeChoropleth` → `ChoroplethLayout` with `joined:{key,value:number|null}[]` (used to count regions with data).

---

### Task 1: Rank-aware data-tied captions + `description` — `chapters.ts`

**Files:**
- Modify: `skills/scrolly/src/chapters.ts`
- Modify: `skills/scrolly/tests/chapters.test.ts`
- Modify: `skills/scrolly/scripts/audit-scrolly.mjs` (update the call to the new signature)
- Modify: `skills/scrolly/src/Scrolly.tsx` (update ONLY the `mapStoryToChapters(...)` call args — the header UI is Task 3)

**Interfaces:**
- Produces: `ScrollyStory` gains `description?: string`. New signature:
  `mapStoryToChapters(beats: Beat[], meta: { title: string; description?: string; source?: {name:string;url:string}; regionsWithData: number }): ScrollyStory`.

- [ ] **Step 1: Write the failing tests**

Replace the body of `skills/scrolly/tests/chapters.test.ts`'s `describe` with these tests (keep the existing `beats` fixture + imports at the top; the fixture already has title, establish, one reveal(NOR), takeaway). ADD a second reveal to the fixture so max/min ranking is exercised — insert this `POL` reveal object into the `beats` array between the NOR reveal and the takeaway:

```ts
  {
    kind: "reveal",
    camera: [14, 49, 24, 55],
    highlight: ["POL"],
    dim: false,
    callout: { region: "POL", name: "Poland", value: "21%", text: "Poland — 21%" },
    copy: "Poland — 21%",
  },
```

Then the tests:

```ts
describe("mapStoryToChapters", () => {
  const meta = {
    title: "Renewables across Europe",
    description: "Share of electricity from renewables, 2024",
    source: { name: "Ember", url: "https://example.org" },
    regionsWithData: 8,
  };
  it("drops establish; intro caption is the description, not the title", () => {
    const story = mapStoryToChapters(beats, meta);
    // beats: title(0) establish(1) reveal NOR(2) reveal POL(3) takeaway(4)
    expect(story.steps.map((s) => s.ref)).toEqual([0, 2, 3, 4]);
    expect(story.steps[0].prose).toBe("Share of electricity from renewables, 2024");
    // the title never appears as a step caption
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });
  it("adds a rank descriptor: first reveal = highest (of N), last reveal = lowest", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.steps[1].prose).toBe("Norway — 99%, the highest of the 8 shown");
    expect(story.steps[2].prose).toBe("Poland — 21%, the lowest");
  });
  it("carries title/description/source on the story and centres cards", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.title).toBe("Renewables across Europe");
    expect(story.description).toBe("Share of electricity from renewables, 2024");
    expect(story.source).toEqual({ name: "Ember", url: "https://example.org" });
    expect(story.steps.every((s) => s.align === "center")).toBe(true);
  });
  it("a single reveal gets no rank descriptor", () => {
    const one: Beat[] = [beats[0], beats[1], beats[2], beats[4]]; // title, establish, NOR, takeaway
    const story = mapStoryToChapters(one, { ...meta, regionsWithData: 1 });
    expect(story.steps.find((s) => s.ref === 2)?.prose).toBe("Norway — 99%");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/scrolly && bun test tests/chapters.test.ts`
Expected: FAIL (new signature/behaviour not implemented).

- [ ] **Step 3: Implement the new `mapStoryToChapters`**

Replace the function (and add `description` to `ScrollyStory`) in `src/chapters.ts`:

```ts
export interface ScrollyStory {
  title: string;
  description?: string;
  source?: { name: string; url: string };
  visual: VisualKind;
  steps: ScrollyStep[];
}

// v1: one scroll step per MEANINGFUL map beat, written as a self-contained,
// data-tied caption (NEVER article text). The title lives in the module header,
// so it is never a step caption; the intro step carries the description; reveal
// steps add a rank descriptor (deriveMapStory orders reveals max → min).
export function mapStoryToChapters(
  beats: Beat[],
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
    regionsWithData: number;
  },
): ScrollyStory {
  const revealIdx: number[] = [];
  beats.forEach((b, i) => {
    if (b.kind === "reveal") revealIdx.push(i);
  });
  const maxBeat = revealIdx[0];
  const minBeat = revealIdx[revealIdx.length - 1];
  const desc = meta.description?.trim() ? meta.description : meta.title;

  const steps: ScrollyStep[] = [];
  beats.forEach((b, i) => {
    if (b.kind === "establish") return;
    const hasCopy = !!(b.copy && b.copy.trim());
    if (b.kind === "takeaway" && !hasCopy) return;

    let prose: string;
    if (b.kind === "title") {
      prose = desc; // intro caption = the figure's description
    } else if (b.kind === "reveal" && b.callout) {
      let descriptor = "";
      if (revealIdx.length > 1) {
        if (i === maxBeat) descriptor = `the highest of the ${meta.regionsWithData} shown`;
        else if (i === minBeat) descriptor = "the lowest";
      }
      prose = `${b.callout.name} — ${b.callout.value}${descriptor ? ", " + descriptor : ""}`;
    } else {
      prose = hasCopy ? b.copy : desc;
    }

    steps.push({
      id: `step-${i}-${b.kind}`,
      visual: "map",
      action: "flyTo",
      ref: i,
      prose,
      align: "center",
    });
  });

  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "map",
    steps,
  };
}
```

- [ ] **Step 4: Update the two call sites to the new signature**

In `src/Scrolly.tsx`, the `useMemo` builds the story. Change the `mapStoryToChapters(...)` call to pass the new meta (compute `regionsWithData` from the layout already in scope):

```tsx
    const regionsWithData = layout.joined.filter((j) => j.value !== null).length;
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description ?? config.unit,
      source: config.source,
      regionsWithData,
    });
```

(Add `description?: string` to the `ScrollyMapConfig` type if it isn't already there — it lives in `ScrollyMap.tsx`; if you cannot import-modify it cleanly, widen the local `config` access with `(config as { description?: string }).description`. Prefer adding `description?: string` to `ScrollyMapConfig`.)

In `scripts/audit-scrolly.mjs`, update the `mapStoryToChapters` call the same way:

```js
const regionsWithData = layout.joined.filter((j) => j.value !== null).length;
const story = mapStoryToChapters(beats, {
  title: config.title,
  description: config.description ?? config.unit,
  source: config.source,
  regionsWithData,
});
```

- [ ] **Step 5: Run the gates**

Run: `cd skills/scrolly && bun test tests/chapters.test.ts` → PASS (4/4).
Run: `cd skills/scrolly && bunx tsc --noEmit 2>&1 | grep -iE "chapters|Scrolly|audit" || echo "no new type errors"` → no new errors (ignore pre-existing react-dom TS2688).

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/chapters.ts skills/scrolly/tests/chapters.test.ts skills/scrolly/src/Scrolly.tsx skills/scrolly/scripts/audit-scrolly.mjs
git commit -m "feat(scrolly): data-tied rank captions + description; title moves to the header"
```

---

### Task 2: Self-contained conformance — `conformance.ts`

**Files:**
- Modify: `skills/scrolly/src/conformance.ts`
- Modify: `skills/scrolly/tests/conformance.test.ts`

**Interfaces:**
- `checkScrollyConformance(story, beatCount)` now also requires `story.description` and a complete `story.source` (name + url).

- [ ] **Step 1: Write the failing tests**

In `tests/conformance.test.ts`, the existing `ok` story lacks `description`/`source` — update it and add cases. Change the `ok` fixture to include them, and add two flagging tests:

```ts
const ok: ScrollyStory = {
  title: "Renewables across Europe",
  description: "Share of electricity from renewables, 2024",
  source: { name: "Ember", url: "https://example.org" },
  visual: "map",
  steps: [
    { id: "a", visual: "map", action: "flyTo", ref: 0, prose: "Intro" },
    { id: "b", visual: "map", action: "flyTo", ref: 1, prose: "Norway" },
    { id: "c", visual: "map", action: "flyTo", ref: 2, prose: "Poland" },
  ],
};
// ... keep the existing passing + step-count + empty-prose + ref-range tests ...
it("flags a missing description (a module must state what/when/where)", () => {
  const r = checkScrollyConformance({ ...ok, description: undefined }, 3);
  expect(r.some((v) => /description/i.test(v))).toBe(true);
});
it("flags a missing source (an embedded module must carry its own source)", () => {
  const r = checkScrollyConformance({ ...ok, source: undefined }, 3);
  expect(r.some((v) => /source/i.test(v))).toBe(true);
});
```

(Update the existing "passes a well-formed story" test to expect `[]` with the new `ok` that now has description + source.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/scrolly && bun test tests/conformance.test.ts`
Expected: FAIL (description/source not checked).

- [ ] **Step 3: Implement**

In `src/conformance.ts`, add after the title check:

```ts
  if (!story.description?.trim())
    v.push("missing description — a module must state what/when/where");
  if (!story.source?.name?.trim() || !story.source?.url?.trim())
    v.push("missing source (name + url) — an embedded module must carry its own source");
```

- [ ] **Step 4: Run the gates**

Run: `cd skills/scrolly && bun test` → whole suite passes (chapters + conformance).
Run: `cd skills/scrolly && bun run audit:scrolly` → GREEN (the sample passes — Scrolly/audit pass description = config.unit + the source).

- [ ] **Step 5: Commit**

```bash
git add skills/scrolly/src/conformance.ts skills/scrolly/tests/conformance.test.ts
git commit -m "feat(scrolly): conformance requires self-contained module furniture (description + source)"
```

---

### Task 3: Persistent title header + sample description + verify + SKILL.md

**Files:**
- Modify: `skills/scrolly/src/Scrolly.tsx` (add the header)
- Modify: `skills/scrolly/src/ScrollyMap.tsx` (add `description?: string` to `ScrollyMapConfig` if not done in Task 1)
- Modify: `skills/scrolly/assets/sample-data/scrolly.json` (add an explicit `description`)
- Modify: `skills/scrolly/SKILL.md`
- Output: `skills/scrolly/output-proof/scrolly.html`

**Interfaces:** consumes the Task 1/2 pipeline.

- [ ] **Step 1: Add the persistent module header**

In `src/Scrolly.tsx`, add a header element (always visible, top-left, above the steps) showing the insight title. Add a style and render it inside the returned fragment, before the scroll wrapper:

```tsx
  const headerStyle: React.CSSProperties = {
    position: "fixed",
    top: 14,
    left: 16,
    zIndex: 50,
    maxWidth: 420,
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(4px)",
    borderRadius: 8,
    padding: "10px 14px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
    pointerEvents: "none",
  };
```

```tsx
      {story.title && (
        <div style={headerStyle}>
          <div style={{ font: "700 15px/1.3 sans-serif", color: "#111" }}>
            {story.title}
          </div>
        </div>
      )}
```

(Place it as a sibling of the scroll wrapper and the credit, inside the top-level fragment.)

- [ ] **Step 2: Add `description` to `ScrollyMapConfig` (if not already)**

In `src/ScrollyMap.tsx`, ensure the config interface has `description?: string`:
`export interface ScrollyMapConfig extends ChoroplethData { title?: string; unit?: string; valueUnit?: string; insight?: string; description?: string; source?: { name: string; url: string } }`.

- [ ] **Step 3: Add an explicit description to the sample config**

In `assets/sample-data/scrolly.json`, add a top-level field:
`"description": "Share of electricity from renewables, 2024 (%)",`

- [ ] **Step 4: Typecheck + produce + scroll smoke**

Run (key sourced from `/splash/.env`, never logged):
```bash
cd skills/scrolly && bunx tsc --noEmit 2>&1 | grep -iE "Scrolly|ScrollyMap" || echo "no new type errors"
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/scrolly.json output-proof
bun run smoke
```
Expected: produce writes `output-proof/scrolly.html`; smoke is GREEN (scrollable + camera moves on scroll).

- [ ] **Step 5: Update SKILL.md**

Add a short "Embeddable module" section to `skills/scrolly/SKILL.md`: the scrolly is a self-contained module embedded into an article — its captions are data-tied (rank-aware), NEVER article excerpts; it carries title (header) + description (intro caption) + source (footer), each once; 3–6 steps. Point at `docs/splash/embeddable-module-best-practices.md`.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/Scrolly.tsx skills/scrolly/src/ScrollyMap.tsx skills/scrolly/assets/sample-data/scrolly.json skills/scrolly/SKILL.md skills/scrolly/output-proof/scrolly.html
git commit -m "feat(scrolly): persistent title header + sample description + SKILL.md embeddable-module section"
```

## Notes for the executor

- The reveal rank descriptor relies on `deriveMapStory` emitting reveals in max→min order. That is its current contract (reveal max, then reveal min). If a single region has data there is one reveal and no descriptor.
- `bun test` does not run the `.mjs` audit scripts; Task 1's `audit-scrolly.mjs` edit is verified by Task 2's `bun run audit:scrolly`.
- The controller will visually verify the final render (header shows the title once; intro caption = description; reveal captions carry the rank; no title/value duplication).
- Never run the browser smoke more than needed (MapTiler tile limits). Never commit or log the key.
