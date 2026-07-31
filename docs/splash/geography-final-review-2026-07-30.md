# Final whole-branch review — feat/geography-anywhere (0f039c56..2822776c)

Run 2026-07-30, four independent reviewers, four lenses (false-blocks · mechanism correctness ·
test integrity · cross-cutting). This is the review the plan never got: the agent-spawn limit was
hit at Task 20, so Tasks 20/13 were coordinator-self-reviewed and no whole-branch pass ran.

**Verdict: DO NOT MERGE.** Seven distinct Criticals, several reproduced by executing real code.
Three were found independently by more than one reviewer. None is a false block — the two guards
stressed hardest (the geo-credit obligation and the unresolved-geo-join refusal) are sound.

The branch's own sample data is the blind spot: every shipped fixture is a large-country,
region-family, chart-track config. Every Critical below is invisible to `bun run check`.

---

## Why 21 task reviews and a green gate missed all of this

Three mechanisms, each worth its own repair task:

1. **The gate cannot see the produce paths.** The suites that would exercise them self-skip
   without `VITE_MAPTILER_KEY`, and the ones that do run cover `choropleth` only. A green
   `bun run check` is not evidence for anything in this branch.
2. **Task 21 step 2 asked for exactly the missing measurement** — run the gate once without the
   key, once with it, and report the pass-count diff — and Task 21 is the only task in the plan
   with no report in `progress.md`. The one guard designed to catch this class was briefed and
   never run.
3. **Fixtures were edited to contain what production stopped supplying.** `scrolly.json` gained a
   hand-inlined 9 304-line TopoJSON (`7532fdc7`); `git show 0f039c56:skills/scrolly/assets/sample-data/scrolly.json`
   has no `geometry` key. The skill's own smoke stays green while the real pipeline throws.
   This was checked once before the review and ruled "the plan's mechanism working". That ruling
   was wrong, and it is recorded here so it is not believed a second time.

---

## Critical

### C1 — `produce.mjs` crashes on symbol, locator and hex-grid (3 of 7 map types, every format)

`skills/map-native/scripts/produce.mjs:227-232`. The geometry block is entered for any config
carrying `basemap` (:196-200), then assumes `config.rows` for everything that is not cartogram or
route. The point family (`symbol`, `locator`, `hex-grid`) carries `markers`/`points` and no `rows`
— `assemblePointFamily` (`lib/loop/assemble/map-native.ts:316,344,378`).

Reproduced on all three shipped fixtures, and independently by the controller:

```
bun scripts/produce.mjs assets/sample-data/symbol.json <out> static
TypeError: undefined is not an object (evaluating 'parsedConfig.rows.map')
    at scripts/produce.mjs:232:24
```

These three types consume no geometry at all (`HexGridMap.tsx:189` says so). The block must skip
any type that does not join geometry, not fall through to the choropleth shape.

Missed because `produce-geometry.test.ts:233` — the one legacy-basemap test — is a choropleth.

### C2 — Over-simplification deletes 62 of 241 world features; every consumer then crashes

`skills/map-native/scripts/produce.mjs:271-279` + `lib/geo/subset.ts:36-38`. `extentMeters` is a
documented placeholder (40 075 000 m world / 1 000 000 m country); `tolerance = extent / width`
≈ 33 395 m at width 1200, and mapshaper runs `-simplify visvalingam interval=…` **without
`keep-shapes`**. Every polygon under the threshold is annihilated and decodes to `geometry: null`.

Measured on the branch's own output:

- `route.json` → 241 features, **62 null** (Luxembourg, Malta, Singapore, Bahrain, Cape Verde,
  Mauritius, Andorra, Monaco, Vatican, every small island state)
- a 10-country choropleth (MLT CYP LUX SGP BHR FRA DEU ESP ITA GRC) → **4 of 10 null**

Downstream, executed against the real subset: `choropleth-geo.ts:11` (`mainlandFeature`) throws
`TypeError: null is not an object (evaluating 'g.type')`; `route-geo.ts:118`
(`turf.booleanIntersects`) throws the same class. Route keeps every source id (`produce.mjs:263`),
so **route is dead unconditionally**. What the journalist sees is not the error — it is an opaque
`TimeoutError: waitForFunction: Timeout 30000ms exceeded` from `snap-static.mjs`.

The in-code comment claims the placeholder errs "never LESS conservative, the safe direction".
That is backwards: tolerance is m/px, so a placeholder *larger* than the real extent simplifies
*harder*. Measured over-simplification: ~10× for an 8-country European choropleth, ~80× for a
few small countries, ~2.9× for declared cantons, ~12× for declared communes.

**This re-diagnoses the deferred "RouteMap vendor WebGL crash" follow-up.** It is not a vendor
bug and not RouteMap-specific — it is this defect, shared by every region-family type. Do not
carry that follow-up forward as written.

Fix, control-run and verified: add `keep-shapes` to the mapshaper invocation (0 nulls). Then
measure the real bbox of the filtered features instead of the placeholder, and assert
post-condition `null-geometry === 0` **and** that every requested `featureId` came back — a
silently-dropped region the data has a value for must be a loud named refusal, not a `TypeError`
three layers later. (Note: mapshaper also reported "35 intersections could not be repaired" at
this tolerance.)

### C3 — Every map-scrolly fails: no producer injects geometry into a scrolly config

Found independently by three reviewers. `ScrollyMap.tsx:192`, `ScrollyCartogramMap.tsx:110`,
`ScrollyDotDensityMap.tsx:111`, `Scrolly.tsx:61` all now throw when `config.geometry` is absent
(the `?raw` imports were removed in `7532fdc7`), but:

- `skills/scrolly/scripts/produce.mjs` is **unchanged on this branch** — zero occurrences of
  `geometry` / `geography` / `subsetGeometry`.
- `lib/loop/assemble/scrolly.ts` is unchanged and never emits `geometry`.
- `lib/core/registry.ts:102` routes `scrolly` to the **scrolly** producer; `map-native`'s
  producer — the only one that resolves geometry — explicitly does not build this format.

Isolated positive/negative control, same fixture: geometry present → `PRODUCE_RESULT` OK;
geometry stripped → `snap-reduced-motion` timeout. The named throw happens inside the browser and
never reaches the operator.

map-scrolly is a public promise on `splash.buriedsignals.com`. No plan task covered
`skills/scrolly/scripts/produce.mjs`.

Fix: hoist the resolution block into a shared module both producers call, and add a loop-level
map-scrolly e2e (`lib/loop/scrolly-e2e.test.ts:95` builds `nativeType: "line"` — the chart track
only, which is why the map track is untested at the loop level).

### C4 — `schemaVersion` 5 strands every existing run directory; the named remedy is not a command

`lib/host/state.ts:78` refuses anything `!== CURRENT_SCHEMA_VERSION` (= 5,
`lib/loop/manifest.ts:388`) and tells the user to "run the migration explicitly". `loadRun` gates
the entire host façade, not just read-only verbs: `state`/`next` (`state.ts:162,207`), `advanceRun`
(`drive.ts:240`), `phraseOfferIn` (`:390`), `authorBeatsIn` (`:457`), `decide` (`:645`).

The only migrating code is `readManifest` (`manifest.ts:672`), whose sole non-test caller is
`lib/loop/resume.ts:257` — a report printer that never calls `writeManifest`. There is no
`migrate` verb in `lib/host/cli.ts` and no host path calls `readManifest`.

A `run.json` written yesterday (v4) is permanently unreachable: every command returns
`stale-schema`. On `main` the shape existed but only stranded v3-and-older; the bump is what makes
it bite. Fix: add a `migrate <runDir>` verb, or let `loadRun` migrate in memory for versions whose
migration writes nothing (`migrateV4toV5`, `lib/loop/migrate.ts:113-131`, is a pure transform).

### C5 — The mandatory geo credit is never rendered into any artefact

Found independently by three reviewers. `geoCredit` is declared and rendered by `MapFrame`
(`skills/map-native/src/core/MapFrame.tsx:26,63,209-234`), but **no component passes the prop** —
`grep -rn geoCredit skills/map-native/src skills/scrolly/src` returns only `MapFrame.tsx` itself
(controller-verified). `ChoroplethMap.tsx:593-601` passes title/description/source and nothing
else; Cartogram/DotDensity/Route are the same. Task 15 says the prop is consumed by Task 17;
Task 17 (`5e4e9f71`) did not thread it.

Net behaviour: `assertGeoCreditPresent` (`produce.mjs:206-209`) refuses to build without a credit,
then throws the credit away. That is the Global Constraint the plan calls non-negotiable.

`map-frame-locale.test.tsx:41-58` "proves" the rendering by passing the prop itself — a component
test can never see a missing call site.

### C6 — The ADM1 path (the branch's headline capability) is dead at two independent points

`matchAdm1Index` (`skills/map-native/src/geo-match.ts:158-167`) emits
`set: "natural-earth-admin-1"`, `origin: "shipped"`. `basemapKeyFor` (`lib/geo/ref.ts:80-84`)
finds no shipped ref and falls back to returning `ref.set`, so produce derives
`assets/geo/natural-earth-admin-1.**geojson**` — the committed asset is
`natural-earth-admin-1.**topojson**` (controller-verified: `ls assets/geo/`). Result:
`subsetGeometry: bunx mapshaper failed (exit 1): File not found`.

Independently, `validate-config.ts:105-111` still throws `unknown basemap` for it — `BASEMAPS` was
never widened — **except for cartogram**, the one validator that never calls `validateBasemap`
(`:875`), whose assembler branch emits `geography` with no `basemap` at all
(`lib/loop/assemble/map-native.ts:186-195`). So cartogram sails past validation into the mapshaper
ENOENT.

Not a regression (ADM1 matching is new), but two things matter: the headline capability is
unreachable end-to-end, and data that previously got the clean "no geography Splash can place"
refusal at orient now gets a cryptic registry error or a deep mapshaper failure. If ADM1 rendering
is out of scope, the honest move is to refuse at orient with a named "not renderable yet".

Consequence for the deferred Task 7 item: the 15.4 MB asset (vs the spec's stated ~6.7 MB target)
has **no consumer path at all** today.

### C7 — `keepProperties: [joinKey]` strips `name` from every injected geometry

`skills/map-native/scripts/produce.mjs:289` (controller-verified). Measured on the real shipped
world basemap: surviving features carry `{ iso_a3 }` only. Seven live consumers read
`properties.name`: `ChoroplethMap.tsx:404` (hover popup → shows `FRA`), `map-story.ts:217`
(video/scrolly callouts), `cartogram-geo.ts:100`, `dot-density-story.ts:65`,
`DotDensityMap.tsx:238`, `route-geo.ts:158,256` + `RouteMap.tsx:466` (territory labels),
`ScrollyMap.tsx:373`. Only maps with an explicit `labelField` escape.

Task 17's review flagged this as a contract Task 20 must state (`progress.md:155`); Task 20 shipped
the opposite, and its self-review's static PNG could not see it (no popup, no callout in a fill
render).

**Why no test caught it:** both geometry fixtures declare `joinKey: "name"`
(`produce-geometry.test.ts:106,183`) — the one value that preserves `name` by coincidence.

Second consequence at the same call site: for a choropleth the subset keeps only the rows' own
features, so every no-data context region is deleted and `computeChoropleth`'s `noData` is
structurally always empty. Nothing pins that either way.

---

## Important

- **I1 — The video family ignores `config.geometry` entirely.** `grep -rn "config.geometry"
  skills/map-native/src/components/` → zero hits. All Remotion compositions still
  `fetch(staticFile("geo/world.geojson"))` and key on a hardcoded `iso_a3`
  (`ChoroplethStory.tsx:276,359`; `RouteReveal.tsx:22`, `RouteScrolly.tsx:22` import the raw
  asset). `lib/geo/policy.ts:11-14` states the design as "a declared geometry file feeds EVERY
  format" and `geometryMayBeInlined` returns true for video. Video is not *regressed* (untouched
  by the de-inlining), but a declared geography silently renders Natural Earth instead — with the
  credit assertion passing on an artefact that shows the uncredited file. No refusal, no test.
- **I2 — `joinKey` is interpolated raw into an evaluated mapshaper expression.**
  `lib/geo/subset.ts:28`: `` `${idList}.includes(${input.idProperty})` ``. `featureIds` is
  correctly `JSON.stringify`d; `idProperty` is not. It comes from `GeographyInputSchema.joinKey`,
  free `z.string().min(1)` typed by a journalist. `code insee`, `NUTS-2 code`, `nom-région` are
  ordinary shapefile field names and all break: `SyntaxError in expression
  [["74"].includes(code insee)]`. Not shell injection (`spawnSync` with an args array) but a real
  expression injection and a hard functional limit — and the project's own `shell-safety` rule 1.
  Use `this.properties[<JSON.stringify(key)>]`, or validate against `/^[A-Za-z_$][\w$]*$/`.
- **I3 — Stringly id comparison silently yields an empty map.** `featureIds` are always
  `String(...)` but the mapshaper-side property may be numeric → `["01","02"].includes(1)` is
  false → zero features retained. `subsetGeometry` never asserts the output is non-empty and
  `produce.mjs` does not check, so a well-formed config renders a blank map.
- **I4 — ADM1 normalises on match, compares exactly on subset.** `geo-match.ts:81-88` matches
  `"Geneve"` → `"GENEVE"`; `subset.ts:28` then filters on the raw CSV value against `"Genève"` →
  0 features. A column that measured as a match produces an empty subset. The two layers must
  share one normalisation, or the subset must filter on the index's `featureId` (recorded in the
  ledger, used by nothing).
- **I5 — The CRS guard is a no-op for `encoding: "topojson"`.** `declaration.ts:14` accepts it;
  `crs.ts:31-51` returns `[topology]` for `{type:"Topology"}` then walks `topology.coordinates`,
  which is `undefined` → always `{ok:true}`. Half the accepted encodings never get the D4 check
  the design rests on. Walking `.arcs` naively would also be wrong (quantised integers — apply
  `transform` first, or refuse to certify topojson).
- **I6 — A zero-match subset fails with a misleading error.** Measured: both `featureIds: []` and
  a no-match id produce `[filter-fields] Table is missing one or more fields: nom` — which blames
  field pruning, not the join.
- **I7 — The `?raw` guards are word lists over a hardcoded file list.**
  `choropleth-map-imports.test.ts:22,28,32,36` and `no-static-geojson-imports.test.ts:16` ban one
  *spelling* on a *closed list* of seven files. They cannot see the non-`?raw` form already in the
  tree (`RouteReveal.tsx:22`, `RouteScrolly.tsx:22`), the runtime form in eight files
  (`fetch(staticFile("geo/world.geojson"))`), or a new file. The correct shape is already in this
  repo: `lib/loop/schema-version-drift.test.ts` walks the tree, exempts by explicit class, and
  asserts the scan was non-empty (`>500` files) so it cannot pass on an empty scan. Port that.

---

## Minor

- `lib/geo/policy.test.ts:44` — the known `/credit/i` weakness is still open (matches a
  coincidental JSC `TypeError` on the variable *named* `geoCredit`). Its sibling at
  `produce-geometry.test.ts:228` was empirically cleared: the downstream failure's stderr contains
  zero occurrences of "credit", so that one passes for the right reason.
- `lib/geo/policy.test.ts:5-35` — `geometryMayBeInlined` is `return true` and the test asserts
  `true` four times. A decision-record change-detector, not coverage of the licence axis.
- `lib/geo/crs.test.ts` — still no exact ±180/±90 fixture. Low risk, and the mutation direction is
  benign (`>` → `>=` false-blocks a valid antimeridian point, it does not miss a bad one).
- `lib/geo/subset.test.ts:110` — asserts `geoms.length === 2`, never *which* two.
- `lib/geo/ref.test.ts:41-44` — `us-states` checks only `.set`/`.scope`; a typo in `joinKey`
  passes, and `joinKey` is now load-bearing (`produce.mjs:289` derives `keepProperties` from it).
- `produce.mjs:271-275` — `extentMeters` is chosen by `set.startsWith("natural-earth-admin-0")`,
  so every non-world geography silently gets the country-scale fallback, `us-states` included.
- `lib/geo/ref.ts:80-84` — `basemapKeyFor`'s never-throw fallback (return `ref.set`) is what lets
  C6's bad key travel. Returning `undefined` would force callers to handle it.
- `lib/geo/ref.ts:62-69` — `resolveGeographyRef` returns the module-level `SHIPPED_REFS`
  singleton, which `produce.mjs:306` then mutates (`delete geography.sourcePath`). Harmless today;
  return a copy.
- `lib/geo/subset.ts:26-45` — `featureIds` becomes one argv string. ~35 000 French communes ≈
  350 KB in a single argument against a 1 MB macOS `ARG_MAX`. Fine now, fragile at the scale this
  feature targets.
- `assets/geo/natural-earth-admin-1.topojson` is 15 378 474 B vs the spec's ~6 745 276 B target
  (`design.md:541`). `fetch-natural-earth-admin1.mjs:83-98` simplifies but never prunes fields
  (Natural Earth admin-1 carries 60+ per feature); `-filter-fields` would roughly halve it. Its
  `-o` also lacks `force`, so a re-run fails on the existing file.
- `skills/map-native/tsconfig.json` and `skills/scrolly/tsconfig.json` both exclude `**/*.test.ts*`,
  so none of the new test files are typechecked — pre-existing convention, worth noting because
  `geometry-guard.test.tsx` does real SSR.

---

## What the review CLEARED (do not re-litigate)

- **The geo-credit obligation cannot false-block.** `produce.mjs:203-212` is the only runtime call
  site; it is gated on `geography.origin === "declared"`, and `origin: "declared"` is set by no
  non-test code in the tree. `lib/geo/policy.ts:33` also short-circuits on `!geography`.
- **The unresolved-geo-join refusal is inert.** `run.orient.geoJoin` is written by nothing; a
  config that never declared geography cannot trip it.
- **`resolvedConfigPath` genuinely closes the fixture-corruption footgun.** Every write in
  `produce.mjs` lands in `outDir`; the interactive-branch `copyFileSync` is guarded against the
  self-copy that would have restored the pre-resolution config.
- **`provenanceHash` is stable.** What is hashed is `run.input.geography` (scalars only) and
  `run.orient.geoJoin` (column, sha256, arrays of scalars), key-ordered by zod's shape and
  round-tripped through `writeManifest`/`readManifest`. The resolved `config.geometry` never
  enters the hash.
- **A run that declares no geography is untouched** (`lib/loop/init.ts:73-76,224-251,265-280` —
  `input.geography` is optional throughout).
- **Task 13's `it.skip`** (`lib/loop/assemble/map-native.test.ts:434`) is the honest disposition:
  it asserted a state false today, so skipping removes zero live coverage, and its load-bearing
  sibling at `:355` really does pin the guard (delete the guard and it reddens; it does not rest
  on the message strings). One inaccuracy in the comment: the guard is `basemapKey !== "world"`,
  so an ADM1 dot-density is refused too, which the sibling test does not cover.
- **Licence enforcement is an intentional trust boundary, not a gap.** An allowlist over
  `GeographyInputSchema.licence` would be theatre — the field is free text, so anyone willing to
  type `"GADM 4.1 non-commercial"` is equally free to type `"Licence Ouverte 2.0"`. The
  disqualification is enforced by what Splash ships (`assets/geo/` holds Natural Earth and US
  Census only) plus editorial responsibility. The mechanizable half of the obligation is C5 — the
  credit must appear on the artefact. Fix C5; do not build a licence enum.
- `lib/brain/eligibility.test.ts` (the ambient gate failure) is untouched by this branch — last
  changed by pre-branch merge `dd388574`.
- Gate scope: `TSC_DIRS` (9) + `TEST_DIRS` (13) = 22 checks. `lib/geo`, `skills/map-native/tests`,
  `skills/scrolly/tests`, `skills/scrolly/src/geometry-guard.test.tsx` and
  `skills/splash/scripts/bundle-source-geometry.test.ts` are all inside a gate entry. Nothing new
  rots outside the gate — the gate simply cannot see the produce paths.

---

## Documentation, licensing and merge (fourth lens)

### C8 — The "three pieces of furniture" count broke, on this very branch

`skills/map-native/SKILL.md:131` states verbatim: *"Every map module carries **three pieces of
furniture** — insight title, description, and source — each appearing exactly once."* Commit
`5b2bf09e` added a **fourth** (`geoCredit`, `MapFrame.tsx:20-26`), deliberately not merged into
`source`, with its own element and testid. `grep -rn "geoCredit" --include="*.md" .` (excluding
`docs/superpowers`) returns **zero** — undocumented everywhere.

This is the "Four rules survived a fifth" class, reproduced live: **the heading pins a number, the
parity check pins strings, so the number rots silently.** The branch invented the correct antidote
for *code* (`schema-version-drift.test.ts` forbids bare `schemaVersion` literals because
"exporting a constant does not, by itself, stop a future call site from writing a bare literal")
and never applied that instinct to prose.

Why the parity checks were structurally blind, not accidentally so:

- `skills/splash/tests/skill-doc-parity.test.ts` — 48 pass / 131 assertions, run live — is 100 %
  `expect(md).toContain("<literal>")`. It reads five `SKILL.md` files and **never `map-native` or
  `scrolly`**, the two skills this branch rewrote. Zero geography/basemap/credit pins. It *cannot*
  fail on this branch.
- `lib/core/guardrails-doc-parity.test.ts:17-23` asserts doc → code (every path named in
  `guardrails.md` exists), never code → doc. The branch adds three guards and deletes nothing, so
  it stays green by construction.

### C9 — `docs/splash/guardrails.md` is three guards short of the code

The page opens by promising "Every row was verified against its named file — no guard is
documented from memory." `grep -ncE "geo|geometry|crs|credit"` returns 1 (a pre-existing map-dw
row). Missing: `assertGeoCreditPresent`, the unresolved-geo-join refusal (`lib/loop/produce.ts:186`),
the missing-geometry guard (8 components). Same shape at `skills/splash/SKILL.md:667`, whose closed
list of `initRun` refusals omits all four new geography refusals — including the CRS
coordinate-range one (`lib/loop/init.ts:248`), the most journalist-visible refusal the branch adds.

### Licensing — `SKILL.md` advertises MIT-incompatible data with a "just drop it in" recipe

`skills/map-native/SKILL.md:328-329` lists `fr-departments` / `fr-regions` sourced from **Eurostat
NUTS**, then `:332-333` tells the reader to add them "by dropping their simplified GeoJSON into
`assets/geo/` … no engine change." The plan's own settled constraint (`:37-38`): *"GADM and
Eurostat GISCO are disqualified — non-commercial terms, MIT-incompatible."* For a branch whose
deliverable is an MIT release to newsrooms, the skill doc is a standing invitation to ship data
the project has ruled out. Pre-existing prose, but this is the branch that made geography its
subject and touched no docs.

### The plan forbade C5 in advance

Plan `:38-40`: *"the OSM credit is carried IN the produced file — never a README, never optional.
A task that drops or defaults the credit is wrong regardless of how clean the diff."* `geoCredit`
is optional, defaults to absent, and is passed by no production caller. The plan named the failure
mode and it landed anyway.

### Task 21 was never executed

The plan carries **0 of 131** checkboxes ticked and no gate commit exists. The stray-`?raw` sweep
it specified never ran — consistent with I1 (the video path's static imports going unnoticed).

### Other prose defects that will rot fastest

- `skills/map-native/SKILL.md:206-207` keeps a correct rule with a now-false justification ("drags
  a Vite `?raw` import into the Remotion/webpack bundle and crashes the render"). An orchestrator
  will verify the hazard is gone and "fix" the rule away — the rule still matters for other
  reasons.
- `skills/scrolly/SKILL.md:141` still lists `assets/geo/world.geojson` as reused, while
  `skills/scrolly/tests/no-static-geojson-imports.test.ts` now pins its absence and
  `ls skills/scrolly/assets/` shows only `sample-data`. The doc names an import the suite forbids.
- `geo-match.ts:127` and `geo-match.test.ts:142` attribute `geoRefusal` to "Task 13"; it is Task 12
  (`a94a18c5`). `geo-match.ts:162` says "Task 13 refines this" about a field the adjacent line
  admits is currently wrong ("a coincidence, not a real level lookup") — pointing at a task now
  ruled out of scope. A knowingly-wrong shipped field whose named fix will never come.
- The `it.skip` at `lib/loop/assemble/map-native.test.ts:434-466` asserts future behaviour and sits
  55 lines from `:355-379`, which asserts its literal negation. `31 pass, 1 skip, 0 fail` — CI will
  never surface the open work.

### Merge collision with main — mechanically easy

Four contended files, all textually auto-mergeable; the schema migration is clean. The gap on this
branch is between substrate and delivery, not in the merge.

---

## Not verified

`interactive` and `video` were not rendered (slow, and the machine was shared). They use the same
components and the same injected config, so C1/C2 apply identically by construction — but that is
reasoning, not measurement. No full gate was run during this review.

## What the gate sees — measured 2026-07-30

The repair ran `bun run check` three times on a calm machine. This is the measurement the original
plan's Task 21 briefed and never ran.

| run | state | result |
|---|---|---|
| A | `VITE_MAPTILER_KEY` unset | **19/22** |
| B | keys exported from `.env` | **18/22** |
| head | after the four gate-fix commits + the final fix wave | **21/22** |

**The finding:** `skills/map-dw/src`'s live suite does not appear *at all* in run A. It does not pass
without a key — it never runs. A contributor on a clean checkout sees a number that says nothing about
that path. That is the mechanism which let the seven Criticals ship behind a green gate.

**A correction to the above, which matters if anyone cites it.** Run A was labelled "the clean-checkout
state". It was not, for every suite: `/Users/rmdms/Sites/Professional/splash-geography/.env` exists
(gitignored), and `skills/scrolly/scripts/produce.mjs:21-35` self-sources `VITE_MAPTILER_KEY` from the
repo-root `.env` whenever the environment variable is unset. Unsetting the variable therefore does not
unset the key for either native producer. The conclusion holds for suites that gate on the environment
**variable** — which is where the observed A-vs-B difference and the `map-dw` finding come from — and is
overstated for suites that gate on the **key**.

Related, and still open: `lib/loop/map-scrolly-e2e.test.ts` and
`skills/scrolly/src/produce-geometry-smoke.test.ts` carry no skip condition at all, so on a genuinely
clean clone they go **red**, not skipped — against this branch's own convention at
`skills/map-native/tests/produce-single-format.test.ts:45-51`.

At head, the only failing check is `test lib`, carrying the two items triaged as not this work's: the
ambient `readiness.ts:54` empty-reason check (last touched 2026-07-27), and a `capture` suite that times
out at 120s on a different test each run and passes in ~905ms in isolation.
