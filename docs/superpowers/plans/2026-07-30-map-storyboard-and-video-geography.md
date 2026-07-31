# Map storyboard + video geography — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every map type can carry a journalist-confirmed storyboard, and a video can draw a geography other than the world.

**Architecture:** The arc seam is already generic — `applyMapArc(arcBeats, resolve)` takes a resolver from an anchor string to `{camera, highlight, name, value}`, and `mapArcErrors(arcBeats, validAnchors)` validates a string against a list without presuming what it names. Choropleth resolves a region key; symbol already resolves a **point label**. So five of the seven types are: supply the valid anchors, write a `resolve`, branch the deriver, widen the capability list. Then the video family stops fetching the shipped world file and reads the geometry produce already injects.

**Tech Stack:** Bun, TypeScript, `bun:test`, Remotion, MapLibre/MapTiler, Playwright snaps.

## Global Constraints

- Runtime is **Bun**. Never `npm`, never `node`.
- Code, comments, identifiers, commit messages, branch names: **English**. Non-negotiable.
- **No mention of any AI tool** in commits, code, docs or output.
- **Standing invariant: no `any` is introduced.** `strict: true`.
- Run `lib` tests **only** as `cd lib && bun test <path>` from inside the worktree — from the repo root the invocation is cwd-sensitive and fabricates five false failures. Map-native: `cd skills/map-native && bun test tests/<file>`.
- **Never stage anything under `output-proof/`** (337 tracked PNGs that snap scripts rewrite) and **never stage a rendered video or PNG**. Run `git status --short` before every commit.
- **Commit before any long verification.** Every real loss on this project has been an uncommitted tree.
- A full `bun run check` needs a **calm machine**; only the last task runs it. Rendered proofs run one at a time, machine calm — a map-native suite under contention fabricates a false failure (measured: 25 s work against a 30 s timeout).
- **Mutation verification is mandatory for every guard added here.** Break the fix, watch it redden, restore. Record both. A lever that does not redden is not a lever.
- **The engine never writes the journalism.** A drafted step may carry a suggestion, but the confirmed text is the journalist's, pinned verbatim.
- Design calls: `docs/superpowers/specs/2026-07-30-map-storyboard-and-video-geography-design.md`.

---

## File Structure

**Modified — the arc core**
- `skills/map-native/src/map-arc.ts` — `ARC_CAPABLE_MAP_TYPES` widens; the refusal message follows it.
- `skills/map-native/src/validate-config.ts` — each type's validator supplies its own valid-anchor list to `mapArcErrors`.

**Modified — one deriver per type** (each gains the `meta.arcBeats` branch + its `resolve`)
- `skills/map-native/src/locator-story.ts`, `cartogram-story.ts`, `dot-density-story.ts`, `route-geo.ts` / route story, `hex-grid-story.ts` (confirm the real filenames with `ls skills/map-native/src` — the deriver names differ from the component names).

**Modified — the video family reads injected geometry** (13 sites, spec §D3)
- `components/ChoroplethStory.tsx`, `ChoroplethReveal.tsx`, `CartogramStory.tsx`, `CartogramReveal.tsx`, `DotDensityStory.tsx`, `DotDensityReveal.tsx`, `RouteReveal.tsx`, `RouteScrolly.tsx`.

**Modified — the camera knob**
- `skills/map-native/scripts/produce.mjs` (`storyComps`'s `guided-tour` branch), the assembler that emits the config, `skills/splash/SKILL.md`.

**Modified — the prose that is false**
- `skills/splash/SKILL.md` (three statements, spec §1 + §D6).

---

### Task 1: `locator` carries a confirmed storyboard — and establishes the pattern

The type the manual test hit, and the cheapest real one: a marker has a name, so its anchor is a string in a list, exactly like symbol's point label. **Do this one first and completely** — Tasks 2-5 repeat its shape, and a reviewer approving this one is approving the pattern.

**Files:**
- Modify: `skills/map-native/src/map-arc.ts` (add `"locator"` to `ARC_CAPABLE_MAP_TYPES`)
- Modify: `skills/map-native/src/validate-config.ts` (`validateLocatorConfig` calls `mapArcErrors` with the marker names)
- Modify: the locator story deriver (branch on `meta.arcBeats`, supply `resolve`)
- Test: `skills/map-native/src/claim-arc-map.test.ts` (the existing suite for choropleth + symbol — extend it, do not start a sibling)

**Interfaces:**
- Consumes: `MapArcBeat`, `mapArcErrors`, `unsupportedArcBeatsErrors` (`map-arc.ts`); `applyMapArc`, `MapArcAnchor`, `Beat` (`map-story.ts`).
- Produces: nothing new — this task widens existing contracts. Later tasks copy the shape.

- [ ] **Step 1: Read the two working examples before writing anything**

Read `skills/map-native/src/map-story.ts:253-275` (choropleth's `resolve`) and `skills/map-native/src/symbol-story.ts:80-95` (symbol's). Note in your report what the two have in common and where they differ — that difference is what you are about to generalise, and getting it wrong silently is how five types end up subtly inconsistent.

- [ ] **Step 2: Write the failing test**

In `claim-arc-map.test.ts`, mirroring the existing `describe("deriveSymbolStory — applyMapArc wiring")` block: a locator config with three markers and a confirmed `arcBeats` naming two of them by marker name. Assert the derived beats follow the **arc's order**, carry the **confirmed text verbatim**, and that the camera anchors on the named marker's own coordinates — not on the map's default framing.

Then a second test: an `arcBeats` naming a marker that does not exist must be **refused by name** with the valid marker names listed, not silently dropped.

- [ ] **Step 3: Run them and watch them fail**

Run: `cd skills/map-native && bun test src/claim-arc-map.test.ts`
Expected: FAIL — the refusal currently fires for `"locator"` (`unsupportedArcBeatsErrors`), so the config never reaches a deriver.

- [ ] **Step 4: Widen the capability list**

In `map-arc.ts`, add `"locator"` to `ARC_CAPABLE_MAP_TYPES`. The refusal message interpolates that list, so it stays truthful automatically — check it reads correctly with three entries and fix the wording if it does not.

- [ ] **Step 5: Validate the anchor against the real marker names**

In `validateLocatorConfig`, call `mapArcErrors(s.arcBeats, markerNames)` where `markerNames` are the markers' own name values. Follow exactly how `validateSymbolConfig` supplies its point labels — same position in the function, same error accumulation.

- [ ] **Step 6: Branch the deriver**

In the locator story deriver, add the `meta.arcBeats` branch that `deriveSymbolStory` has: when the arc is present and non-empty, the reveal beats come from `applyMapArc(meta.arcBeats, resolve)`; when absent, the existing salience walk is untouched. `resolve(markerName)` returns the marker's camera (its own lon/lat), its highlight, its name and its value.

**Byte-identical when no arc is confirmed** — a locator with no `arcBeats` must derive exactly what it derives today. Prove it in the report.

- [ ] **Step 7: Mutation-verify**

Remove `"locator"` from `ARC_CAPABLE_MAP_TYPES` → the new tests must redden with the refusal. Restore. Then break `resolve` to return the map's default camera instead of the marker's → the camera assertion must redden. Restore. Record both.

- [ ] **Step 8: Commit**

```bash
git status --short
git add skills/map-native/src/map-arc.ts skills/map-native/src/validate-config.ts skills/map-native/src/claim-arc-map.test.ts
git commit -m "feat(map-native): a locator map walks a confirmed storyboard, anchored on its own markers"
```

---

### Task 2: `cartogram` — the same shape, anchored on its region ids

`CartogramConfigShape.values` is `{id, value}[]`, so the anchor is `values[].id` — a string in a list, exactly like Task 1.

**Files:** `map-arc.ts`, `validate-config.ts` (`validateCartogramConfig`), the cartogram story deriver, `claim-arc-map.test.ts`.

- [ ] **Step 1: Repeat Task 1's shape** — tests first (arc order + verbatim text + camera on the named cell; unknown id refused by name), then `ARC_CAPABLE_MAP_TYPES`, then `mapArcErrors` with `values.map(v => v.id)`, then the deriver's `meta.arcBeats` branch with a `resolve` returning that cell's camera and highlight.
- [ ] **Step 2: Prove the no-arc path is byte-identical.**
- [ ] **Step 3: Mutation-verify** both directions as in Task 1 Step 7.
- [ ] **Step 4: Commit** — `feat(map-native): a cartogram walks a confirmed storyboard, anchored on its region ids`

---

### Task 3: `dot-density` — anchored on its region key

`DotDensityConfigShape` carries `regionKey` + `rows`, the same shape choropleth uses. The anchor is the value of `regionKey` in each row.

**Files:** `map-arc.ts`, `validate-config.ts` (`validateDotDensityConfig`), the dot-density story deriver, `claim-arc-map.test.ts`.

- [ ] **Step 1: Repeat the shape** — tests first, then the capability list, then `mapArcErrors(s.arcBeats, rows.map(r => String(r[s.regionKey])))`, then the deriver branch.
- [ ] **Step 2: Prove the no-arc path is byte-identical.**
- [ ] **Step 3: Mutation-verify.**
- [ ] **Step 4: Commit** — `feat(map-native): a dot-density map walks a confirmed storyboard, anchored on its regions`

---

### Task 4: `route` — anchored on a crossed territory

The first type whose anchors are **computed, not declared**. `computeRoute` already derives which territories the route crosses, from the geometry, at render time. Those names are the anchors: "à l'entrée en Serbie" is the language of the story; a polyline index is not.

**Files:** `map-arc.ts`, `validate-config.ts` (`validateRouteConfig`), `skills/map-native/src/route-geo.ts`, the route story deriver, `claim-arc-map.test.ts`.

- [ ] **Step 1: Establish WHERE the crossed territories become knowable**

Read `route-geo.ts`'s `computeRoute`. Report: are the crossed territories derivable at **validation** time (geometry available) or only at **produce** time? This decides the whole task and there is no point guessing.

- If they are knowable at validation: validate the anchors like Tasks 1-3.
- If they are only knowable at produce: `mapArcErrors` cannot check them, so the refusal must move to produce and be **named there** — and the report must say plainly that a route storyboard is validated later than the others, so the journalist learns of a typo later. Do not paper over that asymmetry; write it down.

- [ ] **Step 2: Write the failing test** — a route crossing three territories, an arc naming two, asserting arc order, verbatim text, and the camera framing the named territory's own segment.
- [ ] **Step 3: Run and watch it fail.**
- [ ] **Step 4: Implement** per Step 1's finding.
- [ ] **Step 5: An unknown territory is refused by name**, listing the territories the route actually crosses — that list is the journalist's way out.
- [ ] **Step 6: Mutation-verify.**
- [ ] **Step 7: Commit** — `feat(map-native): a route walks a confirmed storyboard, anchored on the territories it crosses`

---

### Task 5: `hex-grid` — anchored on a place, the cell deduced

The hardest, and the only type whose units do not exist until the data is binned. The journalist names a **place**; the engine finds the cell containing it and verifies that cell carries data.

**Files:** `map-arc.ts`, `validate-config.ts` (`validateHexGridConfig`), the hex-grid story deriver, `claim-arc-map.test.ts`.

- [ ] **Step 1: Decide, and record, what happens when the named place falls in an EMPTY cell**

The spec leaves this open deliberately. Three candidates, and you must pick one and write the reasoning into the code comment:
 (a) refuse by name — "no data at that place; the grid is empty there";
 (b) snap to the nearest non-empty cell and say so in the beat;
 (c) accept and let the beat frame an empty area.

Recommendation: **(a)**, because it matches every other anchor in this plan — an anchor names something the data has — and because (b) silently moves a journalist's camera somewhere they did not ask for. But this is your call to make with the code in front of you; state it.

- [ ] **Step 2: Write the failing test** — a hex-grid whose points cluster in two areas; an arc naming a place inside one cluster; assert the camera frames the containing cell and the confirmed text is verbatim. Plus the Step-1 case: a place in an empty area behaves as you decided.
- [ ] **Step 3: Run and watch it fail.**
- [ ] **Step 4: Implement** — the anchor is a place (a name plus its coordinates, or a coordinate pair; decide and document which the journalist supplies), resolved against the binned grid.
- [ ] **Step 5: Mutation-verify**, including the empty-cell branch.
- [ ] **Step 6: Commit** — `feat(map-native): a hex-grid walks a confirmed storyboard, anchored on a place and resolved to its cell`

---

### Task 6: The camera style becomes choosable — and route stops falling through to a choropleth

`cameraMode` is read by `produce.mjs:437` and accepted by `validate-config.ts:83`, and **written by nothing**: `grep -rn cameraMode lib skills --include="*.ts" --include="*.mjs" | grep -v test` returns only those two files. So six of the twelve built video compositions are unreachable.

**And exposing the knob makes a latent defect reachable:** in `storyComps`'s `guided-tour` branch (`produce.mjs:259-271`), `route` has no case and falls through the ternary chain to `ChoroplethStory`. Today unreachable (route defaults to `route-reveal`, nothing writes the field); reachable the moment a journalist can choose. **Both halves ship together or neither does.**

**Files:** `skills/map-native/scripts/produce.mjs`, the assembler that emits the map config, `skills/splash/SKILL.md`.

- [ ] **Step 1: Write the failing test** — `storyComps({type:"route"}, "guided-tour")` must not return a Choropleth composition. Assert on the returned composition names.
- [ ] **Step 2: Run it and watch it fail** — expected: it returns `ChoroplethStory`.
- [ ] **Step 3: Give route its case** in the `guided-tour` branch. Decide with the code in front of you whether a route's guided tour is `RouteReveal` or a distinct composition, and say which and why.
- [ ] **Step 4: Thread the knob** — the journalist's choice ("survol guidé" / "caméra fixe, la donnée s'anime") reaches `config.cameraMode`. Follow how `revealMode` is already threaded rather than inventing a second route for the same kind of decision.
- [ ] **Step 5: Prove both styles produce** — render one map twice, once per style, and confirm the two differ. Watch them.
- [ ] **Step 6: Commit** — `feat(map-native): the camera style is the journalist's choice, and a route no longer falls through to a choropleth`

---

### Task 7: The video family reads the injected geometry — choropleth

The first of three video tasks, split by family so a reviewer can reject one without the others. This is where the integration defects live: 13 sites across 8 files, all doing the same wrong thing.

**Files:** `components/ChoroplethStory.tsx` (six sites: `:215,238,279,313,362,494`), `components/ChoroplethReveal.tsx` (`:119`).

- [ ] **Step 1: Read the proven pattern first** — `skills/map-native/src/components/ChoroplethMap.tsx` reads `config.geometry` and prefers `config.geography.joinKey` over the module constant. That is the shape; copy it rather than inventing one.
- [ ] **Step 2: Write the failing test** — a choropleth video config carrying an injected non-world geometry (Swiss cantons) and a `joinKey` that is not `iso_a3`; assert the composition resolves its features from the injected geometry, not from the shipped world file.
- [ ] **Step 3: Run and watch it fail.**
- [ ] **Step 4: Replace the `staticFile("geo/world.geojson")` fetch and the hardcoded `iso_a3`** at all seven sites.
- [ ] **Step 5: Prove the world path is unchanged** — a world choropleth video must render as it does today. Compare feature counts and watch the output.
- [ ] **Step 6: Mutation-verify** — restore one hardcoded `iso_a3`, confirm the non-world test reddens.
- [ ] **Step 7: Commit** — `fix(map-native): the choropleth video reads the geometry produce injected, not the shipped world file`

---

### Task 8: The video family reads the injected geometry — cartogram and dot-density

**Files:** `components/CartogramStory.tsx:163`, `CartogramReveal.tsx:114`, `DotDensityStory.tsx:184`, `DotDensityReveal.tsx:119`.

- [ ] **Step 1-7: Repeat Task 7's shape** for these four sites — pattern from `ChoroplethMap.tsx`, failing test with a non-world geometry, world path proven unchanged, mutation-verified, watched.
- [ ] **Commit** — `fix(map-native): cartogram and dot-density videos read the injected geometry`

---

### Task 9: The video family reads the injected geometry — route and route-scrolly

`RouteReveal.tsx:22` and `RouteScrolly.tsx:22` use the **non-`?raw` static import** form (`import worldGeoJsonImport from "../../assets/geo/world.geojson"`), which is why the earlier `?raw` guard never saw them.

**Files:** `components/RouteReveal.tsx`, `components/RouteScrolly.tsx`.

- [ ] **Step 1-7: Repeat the shape.** Additionally, confirm `lib/geo/static-geojson-imports.test.ts`'s exemption list is updated: these two files were exempted because the video path was deliberately unwired. Once wired, **the exemption must go** — an exemption that outlives its reason is how a guard rots.
- [ ] **Commit** — `fix(map-native): the route video reads the injected geometry, and drops its guard exemption`

---

### Task 10: The temporary refusal comes down, and a canton video proves it

`lib/geo/resolve-for-produce.ts` refuses a non-world geography in the video format. It exists because the video family rendered an empty world map under a credit naming another file. Tasks 7-9 remove that cause.

**This task is last on purpose.** Removing the refusal before the video actually reads injected geometry reinstates a silent wrong artefact — the exact defect it was written to close.

**Files:** `lib/geo/resolve-for-produce.ts`, `lib/geo/resolve-for-produce.test.ts`.

- [ ] **Step 1: Confirm Tasks 7-9 all landed** and their proofs were watched. If any did not, **stop and report** — this task must not run ahead of them.
- [ ] **Step 2: Render a Swiss-canton choropleth video BEFORE touching the refusal**, by temporarily bypassing it locally (do not commit the bypass). Watch it. If the territories are wrong, that is the finding — report it and stop.
- [ ] **Step 3: Remove the refusal** and the test that pins it; keep the `declared`-origin half if the declared path is still unwired (check `geography.sourcePath` — it was set by no production code as of `fba11075`).
- [ ] **Step 4: Re-render and watch.** Report what you saw: the territories, the colours against the legend, the furniture, the credit.
- [ ] **Step 5: Commit** — `feat(geo): a non-world geography can be rendered as video, and the refusal that stood in for it is gone`

---

### Task 11: The prose stops contradicting the engine

Three statements the orchestrator made to a journalist, each contradicted by the code, and together the reason a journalist abandoned a capability that exists.

**Files:** `skills/splash/SKILL.md`.

- [ ] **Step 1:** the marker map **has** a per-place guided camera tour (`LocatorStory.tsx:1-3`), and it is the default for everything but a route (`produce.mjs:437`).
- [ ] **Step 2:** it **has** per-place text — a caption ramp per beat plus a central place label.
- [ ] **Step 3:** `revealMode` is **camera choreography on the locator** (`LocatorConfigShape.revealMode`, "context | sequential"), not a choropleth fill setting.
- [ ] **Step 4:** the storyboard section now names **all seven types** and their anchors, and the "do NOT accept a confirmed arc yet" list is emptied — or reduced to whatever Tasks 4-5 genuinely left out, with its reason.
- [ ] **Step 5:** run `cd skills/splash && bun test tests/skill-doc-parity.test.ts` — 135 pinned literals live there. If you break a pin, preserve the pinned wording and add beside it; do not edit the test.
- [ ] **Step 6: Commit** — `docs(splash): the flow stops denying three capabilities the engine has`

---

### Task 12: The gate, on a calm machine

- [ ] **Step 1:** confirm nothing else is running (`pgrep -fl "bun test"` empty). Run `bun run check` from the repo root and paste the actual `<passed>/<total> checks passed.` line.
- [ ] **Step 2:** the known-ambient failures at `fba11075` are `readiness.ts:54`'s empty-reason check and the `capture` suite's contention flake (passes 20/20 in ~8 s isolated). Anything else is a finding — report it with its output.
- [ ] **Step 3:** `git log main..HEAD --format='%s%n%b' | grep -in "claude\|anthropic\|co-authored"` → expect no match. Confirm nothing under `output-proof/` and no rendered video is committed.
- [ ] **Step 4:** if the worktree is fresh, `bun install` in `skills/map-native` and `skills/scrolly` before believing a `tsc` failure — a stale worktree cost four false gate points on 2026-07-30.

---

## After the plan

A **fresh whole-branch review** before merge, on the most capable model. Task 7-9 touch 13 sites doing the same thing in three separate tasks — that is precisely the shape that produced four cross-task Criticals during the geography repair, and per-task reviews cannot see between branches.
