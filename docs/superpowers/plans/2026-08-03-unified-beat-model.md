# Le modèle de beat unifié — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One beat type serves charts and maps alike, and says what moves — so the editorial storyboard step can be built on it.

**Architecture:** `NarrativeBeatSchema` in `lib/loop/manifest.ts` widens its anchor to cover regions and places, and gains three optional fields (`movement`, `animation`, `durationMs`) drawn from the gesture vocabulary sub-project ① landed. A schema bump `6 → 7` with a total migration carries existing runs. `MapArcBeat` becomes an alias of the unified type so the map engine stops carrying its own shape.

**Tech Stack:** TypeScript (`strict: true`), zod (manifest schemas only), Bun, `bun:test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-03-unified-beat-model-design.md`

## Global Constraints

- **The suggestion/confirmation split ALREADY EXISTS** — `text` + `draftText` + `beatSource` (`manifest.ts:191-198`), and `unauthoredBeats` (`:662`) already blocks produce (`produce.ts:173`) and routes to `author-beats` (`:784`). **Do not rebuild it.** Pin it against regression; that is all.
- **This lot wires no component and builds no proposal step.** The seven `*Reveal` components still ignore beats when it lands — that is ④. If you find yourself editing a renderer, stop and report.
- **The three new fields are OPTIONAL, and no guard may require them.** Nothing writes them until ③. A lot that requires what nothing produces breaks every existing run — precisely how the `5 → 6` bump crashed a producer on 2026-08-03.
- Runtime is **Bun**, never npm/node. `cd lib && bun test <path>` — from the repo root the lib invocation is cwd-sensitive and fabricates five false failures. `cd skills/<engine> && bun test`.
- No `any`; `strict: true`. Code, comments, commit messages: **English**. Non-negotiable.
- **No mention of any AI tool** anywhere.
- **Never stage anything under `output-proof/`** — a producer run rewrites two tracked PNGs; `git checkout --` them. `git status --short` before every commit.
- **Commit before any long verification.**
- **Mutation-verify every guard.** Break it, watch the covering test redden, restore, record both — **and confirm the mutation landed (`git diff --stat`) before believing it**; three mutations on a sister branch "passed green" because the substitution never applied.
- **A fresh worktree needs `bun install` in six directories** — `lib`, `map-native`, `scrolly`, `chart-native`, `image-native`, `dw-chart` — plus `ln -s ../splash-merge/.env .env`. Without them the gate reports three false failures and blames code that is fine.
- **`git stash` never establishes that a red is pre-existing** on a multi-commit branch. Compare against the merge-base or a second worktree.

---

### Task 1: The anchor covers regions and places

**Files:**
- Modify: `lib/loop/manifest.ts:193` (`anchor` inside `NarrativeBeatSchema`)
- Test: `lib/loop/manifest.test.ts`

**Interfaces:**
- Produces: `anchor: { kind: "x" | "category" | "region" | "place"; value: string; lon?: number; lat?: number }`. Tasks 3-5 read this shape.

- [ ] **Step 1: Write the failing test**

```ts
test("a beat can anchor on a region, and on a place with coordinates", () => {
  const regionBeat = {
    id: "b1",
    anchor: { kind: "region", value: "Genève" },
    role: "establish",
    text: "Genève encaisse le choc.",
    draftText: "",
    beatSource: "journalist",
  };
  const placeBeat = {
    ...regionBeat,
    id: "b2",
    // hex-grid is the one type whose units do not exist until the data is binned,
    // so its anchor is a name PLUS coordinates.
    anchor: { kind: "place", value: "Lausanne", lon: 6.63, lat: 46.52 },
  };
  expect(() => NarrativeBeatSchema.parse(regionBeat)).not.toThrow();
  expect(() => NarrativeBeatSchema.parse(placeBeat)).not.toThrow();
});

test("the two existing anchor kinds still parse unchanged", () => {
  const xBeat = {
    id: "b3",
    anchor: { kind: "x", value: "2019" },
    role: "establish",
    text: "t",
    draftText: "",
    beatSource: "journalist",
  };
  expect(() => NarrativeBeatSchema.parse(xBeat)).not.toThrow();
  expect(() =>
    NarrativeBeatSchema.parse({ ...xBeat, anchor: { kind: "category", value: "Vaud" } }),
  ).not.toThrow();
});
```

Export `NarrativeBeatSchema` from `manifest.ts` if it is not already exported; if exporting it is undesirable, test through `parseManifest` with a run carrying such a beat and say which you chose.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test loop/manifest.test.ts`
Expected: FAIL — `kind` rejects `"region"`.

- [ ] **Step 3: Widen the anchor**

```ts
  // The anchor is what the beat is ABOUT, in the journalist's own words. Four kinds because
  // the engines disagree about what a subject is: a chart anchors on an axis value or a
  // category, a map on a region — and a hex-grid on a PLACE, because its cells do not exist
  // until the data is binned, so there is no name to anchor on (skills/map-native's
  // resolveHexGridArc). This is a WIDENING: "x" and "category" keep their exact meaning, so
  // no existing beat changes sense. (The scrolly→stepped migration is the cautionary tale —
  // when two values are both valid, a half-done reattribution lies silently.)
  anchor: z.object({
    kind: z.enum(["x", "category", "region", "place"]),
    value: z.string(),
    lon: z.number().optional(),
    lat: z.number().optional(),
  }),
```

- [ ] **Step 4: Run and watch it pass**

Run: `cd lib && bun test loop/manifest.test.ts loop/beats.test.ts brain/beats.test.ts`
Expected: PASS, and every pre-existing beat test still passes.

- [ ] **Step 5: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/manifest.test.ts
git commit -m "feat(loop): a beat can anchor on a region or a place, not only a chart axis"
```

---

### Task 2: The beat says what moves

**Files:**
- Modify: `lib/loop/manifest.ts` (`NarrativeBeatSchema`)
- Test: `lib/loop/manifest.test.ts`

**Interfaces:**
- Consumes: `Gesture` and `NarrativeKind` from `lib/core/gestures.ts` (sub-project ①).
- Produces: `movement?: Gesture`, `animation?: Gesture`, `durationMs?: number` on every beat. Task 4 validates them; Task 5's map consumers read them.

- [ ] **Step 1: Write the failing test**

```ts
test("a beat may carry a movement, an animation and a duration — all optional", () => {
  const base = {
    id: "b1",
    anchor: { kind: "region", value: "Genève" },
    role: "establish",
    text: "t",
    draftText: "",
    beatSource: "journalist",
  };
  // Optional: nothing writes these until sub-project ③, and a v6 manifest has none.
  expect(() => NarrativeBeatSchema.parse(base)).not.toThrow();
  expect(() =>
    NarrativeBeatSchema.parse({ ...base, movement: "fly", animation: "grow", durationMs: 2500 }),
  ).not.toThrow();
});

test("a movement outside the closed vocabulary is refused at the schema", () => {
  const bad = {
    id: "b1",
    anchor: { kind: "region", value: "Genève" },
    role: "establish",
    text: "t",
    draftText: "",
    beatSource: "journalist",
    movement: "zoom",
  };
  expect(() => NarrativeBeatSchema.parse(bad)).toThrow();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test loop/manifest.test.ts`
Expected: FAIL — the schema ignores unknown keys, so `"zoom"` parses.

- [ ] **Step 3: Add the three fields**

```ts
  // What MOVES at this beat. Drawn from the closed vocabulary sub-project ① landed
  // (lib/core/gestures.ts) so a beat can never name motion no engine performs.
  //   movement  — how the frame arrives here from the previous beat
  //   animation — what changes once the frame is held
  //   durationMs — VIDEO only; a scrolly is advanced by the reader, not by time
  // All three OPTIONAL: nothing writes them until the proposal step (③), and a v6 manifest
  // carries none. A guard that required them would break every existing run.
  movement: z.enum(GESTURES).optional(),
  animation: z.enum(GESTURES).optional(),
  durationMs: z.number().positive().optional(),
```

Import `GESTURES` from `../core/gestures`. `z.enum` needs a non-empty tuple — if `GESTURES` is typed `readonly string[]`, adapt with `z.enum(GESTURES as unknown as [string, ...string[]])` **only if** the direct form does not compile, and say in the report which you used.

- [ ] **Step 4: Run and watch it pass**

Run: `cd lib && bun test loop/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation-verify**

Replace `z.enum(GESTURES)` with `z.string()`, confirm the "refused at the schema" test reddens, restore. Record both outputs, with `git diff --stat` proving each landed.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/manifest.test.ts
git commit -m "feat(loop): a beat declares its movement, its animation and its duration"
```

---

### Task 3: The schema bump and a total migration

**This is the task that can break every existing run.** The `5 → 6` bump on 2026-08-03 crashed a producer because a new field was `.optional()` in the schema and mandatory in a guard.

**Files:**
- Modify: `lib/loop/manifest.ts` (`CURRENT_SCHEMA_VERSION`)
- Modify: `lib/loop/migrate.ts` (add `migrateV6toV7`, compose it)
- Test: `lib/loop/migrate.test.ts`
- Modify: every fixture pinned at `schemaVersion: 6`

**Interfaces:**
- Consumes: Tasks 1-2's widened schema.
- Produces: `CURRENT_SCHEMA_VERSION = 7`, `migrateV6toV7(raw: unknown): unknown`.

- [ ] **Step 1: Write the failing tests — five manifest shapes**

```ts
test("migrateV6toV7 is total: it alters no run that carries no beats", () => {
  const noOrient = { schemaVersion: 6, elements: [] };
  expect(migrateV6toV7(noOrient)).toEqual({ ...noOrient, schemaVersion: 7 });
});

test("a v6 run WITH beats keeps every beat byte-identical", () => {
  const withBeats = {
    schemaVersion: 6,
    elements: [
      {
        id: "e1",
        narrative: {
          beats: [
            {
              id: "b1",
              anchor: { kind: "x", value: "2019" },
              role: "establish",
              text: "t",
              draftText: "d",
              beatSource: "journalist",
            },
          ],
        },
      },
    ],
  };
  // The three new fields are OPTIONAL — migration adds nothing, it only stamps the version.
  expect(migrateV6toV7(withBeats)).toEqual({ ...withBeats, schemaVersion: 7 });
});

test("a chart-only run, a map run and an image run all pass through unaltered", () => {
  for (const el of [
    { id: "c", producer: "chart-native" },
    { id: "m", producer: "map-native" },
    { id: "i", producer: "image-native" },
  ]) {
    const run = { schemaVersion: 6, elements: [el] };
    expect(migrateV6toV7(run)).toEqual({ ...run, schemaVersion: 7 });
  }
});

test("the chain v4 → v5 → v6 → v7 composes", () => {
  const v4 = { schemaVersion: 4, elements: [] };
  const out = migrate(v4) as { schemaVersion: number };
  expect(out.schemaVersion).toBe(7);
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `cd lib && bun test loop/migrate.test.ts`
Expected: FAIL — `migrateV6toV7` is not defined.

- [ ] **Step 3: Implement**

```ts
/** v6 → v7: the beat gained a wider anchor and three optional motion fields (movement,
 *  animation, durationMs). NOTHING in a v6 manifest becomes invalid — every new field is
 *  optional and the anchor is a widening, so this migration only stamps the version.
 *  It is written as a pure passthrough on purpose: a migration that rewrites data it does
 *  not have to rewrite is a migration that can corrupt it. */
export function migrateV6toV7(raw: unknown): unknown {
  return { ...(raw as object), schemaVersion: 7 };
}
```

Compose it where `migrateV5toV6` is composed, and bump `CURRENT_SCHEMA_VERSION` to `7`.

- [ ] **Step 4: Run and watch them pass**

Run: `cd lib && bun test loop/migrate.test.ts loop/manifest.test.ts loop/state.test.ts loop/resume.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the fixtures, mechanically**

Every fixture pinned at `schemaVersion: 6` becomes `7`. **Then verify the churn hid no real edit**: `git diff` filtered to lines NOT containing `schemaVersion` must be empty for the fixture files. Record that check's output — on 2026-08-03 a 50-file bump was audited exactly this way and proved clean.

- [ ] **Step 6: Prove an older run still resumes**

Build a v6 manifest on disk, run it through `readManifest` → the loop's next-action routing, and confirm it migrates and reports an ordinary next action rather than throwing. **This is the check the `5 → 6` bump did not have**, and it is why a producer crashed.

- [ ] **Step 7: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/migrate.ts lib/loop/migrate.test.ts
git commit -m "feat(loop): schema 7 carries the widened beat, and a v6 run migrates untouched"
```

---

### Task 4: A movement must exist on the engine that will render it

**Files:**
- Create: `lib/core/beat-motion.ts`
- Test: `lib/core/beat-motion.test.ts`

**Interfaces:**
- Consumes: `allProducers` (`lib/core/registry.ts`), `Gesture`/`NarrativeKind`/`isCameraGesture` (`lib/core/gestures.ts`), the beat shape from Tasks 1-2.
- Produces: `beatMotionErrors(beat, opts: { producer: string; type: string; kind: NarrativeKind }): string[]` — errors only, empty when valid. Sub-project ③ calls this before proposing.

- [ ] **Step 1: Write the failing test**

```ts
test("a movement the target engine does not declare is refused, naming the alternative", () => {
  const errs = beatMotionErrors(
    { movement: "fly" },
    { producer: "chart-native", type: "pie", kind: "reveal" },
  );
  expect(errs.length).toBe(1);
  // The refusal must tell the journalist what they CAN have — a bare "invalid" leaves them guessing.
  expect(errs[0]).toContain("fly");
  expect(errs[0]).toContain("pie");
});

test("a movement the engine declares is accepted", () => {
  expect(
    beatMotionErrors({ movement: "jump" }, { producer: "map-native", type: "choropleth", kind: "story" }),
  ).toEqual([]);
});

test("a duration on a scrolly is refused — the reader advances it, not time", () => {
  const errs = beatMotionErrors(
    { durationMs: 2000 },
    { producer: "scrolly", type: "choropleth", kind: "scrolly" },
  );
  expect(errs.length).toBe(1);
  expect(errs[0]).toContain("reader");
});

test("a beat with no motion at all is valid — the fields are optional", () => {
  expect(beatMotionErrors({}, { producer: "map-native", type: "choropleth", kind: "story" })).toEqual([]);
});
```

- [ ] **Step 2: Run and watch them fail.** Expected: the module does not exist.

- [ ] **Step 3: Implement** — read the target type's declared `gestures[kind]` from the registry and refuse anything outside it; refuse `durationMs` when `kind === "scrolly"`. Errors name the offending value, the type, and what the engine does declare.

- [ ] **Step 4: Run and watch them pass.**

- [ ] **Step 5: Mutation-verify** — make the lookup return the whole vocabulary instead of the type's own, confirm the first test reddens; restore. Confirm each mutation landed.

- [ ] **Step 6: Commit**

```bash
git add lib/core/beat-motion.ts lib/core/beat-motion.test.ts
git commit -m "feat(core): a beat's motion is checked against the engine that will render it"
```

---

### Task 5: The map engine stops carrying its own beat shape

**Files:**
- Modify: `skills/map-native/src/map-arc.ts:29-35` (`MapArcBeat`)
- Modify: every consumer the compiler names
- Test: `skills/map-native/src/claim-arc-map.test.ts`

**Interfaces:**
- Consumes: the unified beat from Tasks 1-2.
- Produces: `MapArcBeat` as an alias of the unified beat (or removed, with consumers reading the unified type directly — decide and say which).

- [ ] **Step 1: Establish what actually differs**

`MapArcBeat` is `{ region: string; role?: ArcRole; text?: string; lon?: number; lat?: number }`. The unified beat is `{ id, anchor: {kind, value, lon?, lat?}, role, text, draftText, beatSource, movement?, animation?, durationMs? }`.

**Report the mapping before changing anything**: `region` → `anchor.value` with `kind: "region"` (or `"place"` when `lon`/`lat` are set); `role`/`text` become required. **The map engine's callers currently pass beats with no `id`, no `draftText`, no `beatSource`** — establish how many call sites that is, and whether they can supply those fields or whether an adapter is needed at the engine boundary. **If an adapter is the honest answer, say so and stop** rather than forcing every call site to fabricate a `beatSource` it does not know.

- [ ] **Step 2: Write the failing test** — a map arc built from unified beats resolves the same walk it does today, for one region-anchored type and one place-anchored type (hex-grid).

- [ ] **Step 3: Run and watch it fail.**

- [ ] **Step 4: Implement per Step 1's finding.**

- [ ] **Step 5: Prove the no-arc path is byte-identical** — a map config with no beats must produce exactly what it produces today. Capture the derived walk before and after and diff them.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src
git commit -m "feat(map-native): the map reads the unified beat instead of its own shape"
```

---

### Task 6: The gate, on a calm machine

- [ ] **Step 1:** `pgrep -fl "bun test"` empty. Run `bun run check` from the repo root and paste the actual `<passed>/<total> checks passed.` line.
- [ ] **Step 2:** Known ambient: `lib/brain/eligibility.test.ts` ("a mark can never carry an empty reason", `readiness.ts:54`) fails in isolation in ~120 ms and predates all of this. `lib/verify/capture-html.test.ts` passes 20/20 alone under no contention. **A local untracked `NEWSROOM-PROFILE.md` / `brand.json` declaring `lang: "fr"` makes `lib`'s init and host tests fail against an expected `"en"`** — that is the developer's own file, not a regression. Anything else is a finding; report it with its output.
- [ ] **Step 3:** `git log main..HEAD --format='%s%n%b' | grep -in "claude\|anthropic\|co-authored"` → expect no match. Confirm nothing under `output-proof/` and no rendered artefact is committed.

---

## After the plan

A **fresh whole-branch review** before merge, on the most capable model. On this project that step has found a Critical on **every** plan that ran it — including two that per-task reviews could not see because the defect lived *between* tasks.

Then **sub-project ③** (the proposal step) per the umbrella spec § 7. Do not start ④ before ③ lands.
