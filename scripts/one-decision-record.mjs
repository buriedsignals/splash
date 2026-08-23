/**
 * EVERY PLACE IN THIS TREE WHERE ONE DECISION IS NO LONGER ONE DECISION, RECORDED — AND THE FIVE
 * DEFECTS THIS RECORD WAS MEASURED AGAINST.
 *
 * ── THE RATCHET, AND WHY IT IS THIS SHAPE ─────────────────────────────────────────────────────
 *
 * `chart-web` and `map-web` landed a ratchet on 2026-08-23 over a population that MAY ONLY GROW: a
 * page may join a walk freely, none may leave it unnamed. This is the same shape over a population
 * that should SHRINK, so the two halves are mirrored:
 *
 *   A divergence may LEAVE freely — a decision becoming one decision again is the point, and
 *   nothing here has to be edited for that to happen; `divergencesThatLeft` prints it.
 *
 *   No divergence may JOIN unnamed. A decision that has just stopped being one decision is a red
 *   that names the file and the decision.
 *
 * THE HOLE THAT SHAPE HAS, AND HOW IT IS CLOSED HERE. `chart-web` found by mutation that a recorded
 * list can be made green by DELETING a line, and closed it with a length floor. The mirror hole is
 * the opposite move: making a red green by ADDING a line — which is exactly "a list somebody bumps",
 * the thing this task was told not to build. Two things stop it:
 *
 *   · deleting a line cannot help. The line comes straight back as a JOIN, named, on the next run.
 *   · `CEILING` may only be LOWERED. Adding a line takes the record past it and the test says so,
 *     naming the line that was added. Raising the ceiling is one visible edit somebody reviews, not
 *     a number nudged in a diff of forty other changes.
 *
 * ── THE FIVE DEFECTS, AND WHICH OF THEM THIS RECORD'S OWN READINGS SEE ────────────────────────
 *
 * Each was reconstructed in a scratch tree at the commit before its fix and the readings were run
 * over it. All five states go red. FOUR of the five families are named by their own defect; one is
 * not, and the measurement is here rather than an omission.
 *
 *   1. THE CREDENTIAL ALIAS — CAUGHT, at every stage of its travel.
 *      · at `03cef221` (before `f57f5dae`, the GATE): R1 names
 *        `skills/map-web/test/live-map.test.ts  MAPTILER_KEY` — the gate that decided whether the
 *        live probe ran at all, reading a canonical name while the root's `.env` held the key under
 *        `REMOTION_MAPTILER_KEY`.
 *      · at `527f910c` (before `7e6f1b3c`/`674ce19c`, the OPERATION): R1 names
 *        `skills/deliver/scripts/deliver.mjs`, `skills/deliver/scripts/sealed-operation.mjs`,
 *        `skills/deliver/scripts/deploy-embed.mjs` and `skills/splash/scripts/run-operation.mjs`.
 *      · at `9ab1fdff` (before `0d40202c`, the FOUR SCROLLY INSTRUMENTS): R1 names all four —
 *        `proof/mapscrolly-quakes-three-ways/drive.mjs`, and `verify-live-tiles.mjs` in
 *        `mapscrolly-quakes-three-ways`, `mapscrolly-one-map-europe-carbon` and
 *        `mapmore-scrolly-danube`.
 *      89 divergences at `03cef221`, 88 at `527f910c` and 203 at `9ab1fdff` against 135 today;
 *      16, 15 and 68 of them are not in this record, so the ratchet goes red on all three.
 *
 *   2. THE DERIVED SEA — CAUGHT WHERE IT IS STILL OPEN, NOT WHERE IT WAS CLOSED, and both halves
 *      of that are the measurement.
 *      · NOT at `2bebe261` (before `7d04218d`). There the sea derivation lived in
 *        `geo-choropleth.ts` and was absent from `geo-symbol.ts`, `geo-hex.ts`, `geo-dot.ts` and
 *        `map-beat/assets/geo.ts` — pure absence between VENDORED GEOMETRY HELPERS, the one
 *        population where absence cannot be read. The general lineage-hole detector fires 889 times
 *        on this tree because a hexgrid's `geo-hex.ts` legitimately does not carry a choropleth's
 *        `waterFor`. Of the 128 divergences at `2bebe261`, 9 are not in this record, so the ratchet
 *        does go red there — for OTHER drifts. Not one of the 9 is the sea, and a red for the wrong
 *        reason is not a catch.
 *      · BUT R4 names the same fix's own unfinished half on TODAY's tree, unprompted:
 *        `waterFillOf` — the reader that refuses a plate whose `geometry.json` records no derived
 *        water — is declared by `skills/map-web/scripts/render-web.mjs`, carried by ONE of the ten
 *        files that assemble a map-web page
 *        (`stories/r8-map-web-japan-bear-casualties/.../render-web.mjs`), and absent from the other
 *        eight. That is the same fix, in the same week, having reached two places of ten. It is
 *        recorded below as DEBT, not as an exemption.
 *
 *   3. THE BASEMAP THEME — CAUGHT, on today's tree, because it has never been fixed. R2 names 32
 *      files carrying `dataviz-dark` or `dataviz-light` as a literal while
 *      `skills/scrolly/scripts/bake-plate.mjs`'s `basemapStyleFor` DERIVES the same choice from the
 *      story's own ground. Two more derivations exist and disagree with each other on the
 *      threshold — `stories/stress-f-housing-pressure/.../bake-plate.mjs` splits at 0.179,
 *      `stories/r8-scrolly-swiss-avalanche-deaths/.../bake-plate.mjs` at 0.25 under the name
 *      `styleForGround` — so this decision is made three ways and written down thirty-two times.
 *      All 34 R2 lines are recorded below as DEBT, not as an exemption.
 *
 *   4. THE WORLD WRAP — CAUGHT. At `bc133d1e` (before `a1e79ad4`) R4 names `repeatWorlds`,
 *      `requireBoxAspects` and `worldTilingCss` as absent from seven of the ten files that assemble
 *      a map-web page, including `stories/r9-map-web-reported-rabies-deaths/...`, the story written
 *      hours later that shipped the old behaviour. 198 divergences there against 135 today,
 *      63 of them not in this record and 21 of those 63 the wrap itself.
 *
 *   5. THE SPACE-GROUPED NUMERAL — NOT CAUGHT, and it is not a travel defect. `THOUSANDS_RE` is
 *      declared in twenty files in this tree and every one of them is byte-identical:
 *      `/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/`. There is no divergence to find, because the reading
 *      never learned the SI space group at all. It is shape 3 of this repository's four — a missing
 *      lexicon producing a false confirmation — and a check that asks whether copies AGREE is
 *      structurally blind to a decision every copy gets wrong together. What this tree does carry
 *      is the other half of that asymmetry: `proof/RankBars.tsx` and
 *      `proof/webx-wind-vs-solar/grouped-bar-geometry.ts` FORMAT numbers with
 *      `Intl.NumberFormat("fr-FR")`, which groups thousands with U+202F, and no reader in this tree
 *      accepts what those two writers emit. Reported, not closed: the files are
 *      `skills/intake/scripts/profile.mjs` and `skills/storyboard/scripts/ground-claim.mjs`, both
 *      owned by other agents at the time of writing.
 *
 * ── WHAT THE 135 ARE ──────────────────────────────────────────────────────────────────────────
 *
 * R1 (15) · a credential named in a file that never names its alias list. Twelve are `test/` files
 *   feeding a synthetic credential to watch a refusal fire, which is legitimate and which no static
 *   reading can tell from a live gate — the exact confusion that let the live gate at `03cef221`
 *   sit unnamed. They are recorded rather than excluded so that a NEW one is a red.
 *   Three are shipped code and are DEBT: `proof/scrolly-mixed-grinnell-ice/verify-live-tiles.mjs`
 *   is a FIFTH scrolly instrument of exactly the four `0d40202c` fixed and did not reach;
 *   `skills/dw-beat/scripts/prove-co2.mjs` and `skills/dw-beat/scripts/verify-range-annotation.mjs`
 *   read `DATAWRAPPER_TOKEN` and delegate the resolution to an imported resolver, which is the
 *   false positive `credentialReadsWithoutAlias`'s own doc comment predicts.
 *
 * R2 (34) · 32 basemap-theme literals (defect 3, DEBT, above) plus two files that name one member
 *   of a three-word and a two-word vocabulary the tree derives elsewhere.
 *
 * R3 (61) · copies of one function that no longer agree with their own majority. Not triaged one by
 *   one here: they are the population this reading is meant to hold still, and a triage typed today
 *   is the hand-typed population this whole file exists to replace.
 *
 * R4 (28) · a capability the `map-web` skill declares, carried by some assemblers of its page and
 *   not others. The wrap is not among them any more — it travelled on `a1e79ad4`. Eight of the 28
 *   are `waterFillOf`, which is defect 2 still open (above); the other twenty are
 *   `assertRecordedLanguage` (7), `separationHeadroom` (6), `assertDistinctSlugs` (6) and
 *   `renderMapWeb` (1), none of which has been ruled on.
 *
 * ── HOW TO RE-RECORD ──────────────────────────────────────────────────────────────────────────
 *
 *     bun scripts/one-decision.mjs
 *
 * prints the current answer. Fix the code, then DELETE the lines that no longer appear. Never add
 * one to make a test pass; that is what `CEILING` is for.
 */

/** THE CEILING. MAY ONLY BE LOWERED. Measured 2026-08-23 over 1 230 source files.
 *
 *  IT IS 138 WHILE THE RECORD HOLDS 138 LINES, AND THREE OF THOSE LINES ARE NOT FOUND BY EVERY RUN.
 *  Three other agents were committing to this tree while this was written, and `renderMapWeb`'s
 *  three drifted copies appear or disappear depending on which of their in-flight edits is on disk.
 *  A recorded line the walk does not find only PRINTS; a line the walk finds and the record lacks
 *  is a RED. So the record deliberately holds the union of both states rather than a snapshot of
 *  one, and the next author with a still tree should re-record and lower the ceiling. */
export const CEILING = 138;

/** Every divergence this tree carries today, as `<reading> <what>` lines, sorted. */
export const RECORDED_DIVERGENCES = [
  "R1 installer/test/legacy-env.test.ts  DATAWRAPPER_TOKEN,MAPTILER_KEY",
  "R1 installer/test/setup-security.test.ts  MAPTILER_API_KEY",
  "R1 installer/test/the-setup-page.test.ts  CMS_TOKEN",
  "R1 proof/scrolly-mixed-grinnell-ice/verify-live-tiles.mjs  MAPTILER_KEY",
  "R1 skills/deliver/test/credentials-go-through-the-alias-table.test.ts  CLOUDFLARE_API_TOKEN,MAPTILER_DELIVERY_KEY,MAPTILER_KEY",
  "R1 skills/deliver/test/sealed-operation.test.ts  CLOUDFLARE_API_TOKEN",
  "R1 skills/dw-beat/scripts/prove-co2.mjs  DATAWRAPPER_TOKEN",
  "R1 skills/dw-beat/scripts/verify-range-annotation.mjs  DATAWRAPPER_TOKEN",
  "R1 skills/dw-beat/test/sealed-produce.test.ts  DATAWRAPPER_API_TOKEN,DATAWRAPPER_TOKEN",
  "R1 skills/map-beat/test/verify-map.test.ts  DATAWRAPPER_TOKEN",
  "R1 skills/map-web/test/verify-guards.test.ts  DATAWRAPPER_TOKEN",
  "R1 skills/scrolly/test/verify-guards.test.ts  DATAWRAPPER_TOKEN",
  "R1 skills/splash/test/credentials-go-through-the-alias-table.test.ts  MAPTILER_KEY",
  "R1 skills/splash/test/keys.test.ts  DATAWRAPPER_TOKEN,MAPTILER_KEY",
  "R1 skills/splash/test/run-operation.test.ts  CLOUDFLARE_API_TOKEN,DATAWRAPPER_API_TOKEN,DATAWRAPPER_TOKEN,MAPTILER_DELIVERY_KEY,MAPTILER_KEY,REMOTION_MAPTILER_KEY,VITE_MAPTILER_KEY",
  "R2 proof/map-geneva-locator/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/map-quake-density/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/map-quake-symbol/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-choropleth-video/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-choropleth-web/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-dot-web/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-flowmap-video/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-hexgrid-web/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-locator-web/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapgen-symbol-web/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapmore-dot-population/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapmore-flow-danube/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapmore-scrolly-danube/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapmore-scrolly-route-access/bake.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 proof/mapscrolly-one-map-europe-carbon/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapvid-dot-population/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapvid-hexgrid-quakes/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 proof/mapvid-locator-geneva/bake.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 skills/deliver/test/delivery-replacement.test.ts  discarded-orphaned-staging of [cleaned-orphaned-backup,discarded-orphaned-staging,restored-orphaned-backup]",
  "R2 skills/map-beat/scripts/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 skills/map-beat/scripts/extent-range.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 skills/map-web/scripts/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 skills/splash/test/map-bake.test.ts  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/r8-map-web-japan-bear-casualties/beats/1-bear-casualties-by-prefecture/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/test/facts.test.ts  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/real-ember-renewables-share/beats/1-where-your-country-sits/strip-interaction.mjs  data-country of [data-country,data-index]",
  "R2 stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/stress-ac-alcanede-kilns/beats/1-one-kiln-left/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R2 stories/stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 stories/stress-m-forest-loss/beats/forest-loss/bake-plate.mjs  dataviz-light of [dataviz-dark,dataviz-light]",
  "R2 stories/stress-t-europe-recycling/beats/europe-recycling-map/bake-plate.mjs  dataviz-dark of [dataviz-dark,dataviz-light]",
  "R3 RegionTable  stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/ChoroplethWeb.tsx",
  "R3 assertDistinctSlugs  proof/mapgen-symbol-web/render-web.mjs",
  "R3 breakLongTokens  stories/r8-chart-static-german-road-deaths-by-mode/beats/1-pedelec-catches-the-bicycle/PedelecCatchesTheBicycle.tsx",
  "R3 changesBetween  proof/vidz-diverging-bar-eu-per-capita/render.mjs",
  "R3 escapeHtml  shared/chart-web/scripts/render-web.mjs",
  "R3 escapeHtml  skills/chart-web/scripts/render-web.mjs",
  "R3 escapeHtml  skills/scrolly/scripts/render-scrolly.mjs",
  "R3 escapeHtml  skills/splash/assets/root-template/shared/chart-web/scripts/render-web.mjs",
  "R3 histogramGeometry  proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx",
  "R3 inkBox  proof/static-carbon-footprint-spread/probe/probe.mjs",
  "R3 keepRing  proof/mapgen-flowmap-video/geo-flow.ts",
  "R3 keepRing  proof/mapmore-flow-danube/geo-flow.ts",
  "R3 keepRing  proof/mapmore-scrolly-danube/geo-flow.ts",
  "R3 measureText  proof/map-quake-symbol/QuakeSymbolVideo.tsx",
  "R3 measureText  proof/mapgen-flowmap-video/FlowMapVideo.tsx",
  "R3 mercY  proof/mapgen-choropleth-web/delivery-frame.mjs",
  "R3 mercY  proof/mapgen-dot-web/delivery-frame.mjs",
  "R3 mercY  proof/mapgen-hexgrid-web/delivery-frame.mjs",
  "R3 mercY  proof/mapgen-locator-web/delivery-frame.mjs",
  "R3 mercY  proof/mapgen-symbol-web/delivery-frame.mjs",
  "R3 mercY  skills/map-web/scripts/delivery-frame.mjs",
  "R3 mercY  stories/r8-map-web-japan-bear-casualties/beats/1-bear-casualties-by-prefecture/delivery-frame.mjs",
  "R3 mercY  stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/delivery-frame.mjs",
  "R3 mercY  stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/delivery-frame.mjs",
  "R3 mercY  stories/stress-ab-emigration-flows/beats/1-where-the-routes-lead/delivery-frame.mjs",
  "R3 mercY  stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/delivery-frame.mjs",
  "R3 mix  skills/scrolly/scripts/render-still.mjs",
  "R3 mixHex  proof/map-quake-density/geo-hex.ts",
  "R3 mixHex  proof/mapgen-hexgrid-web/geo-hex.ts",
  "R3 mixHex  proof/mapscrolly-quakes-three-ways/geo-hex.ts",
  "R3 mixHex  proof/mapvid-hexgrid-quakes/geo-hex.ts",
  "R3 mp4Size  proof/vidy-histogram-life-expectancy/render.mjs",
  "R3 mp4Size  proof/vidy-lollipop-renewables-share-europe/render.mjs",
  "R3 mp4Size  proof/vidy-pyramid-niger-population/render.mjs",
  "R3 mp4Size  proof/vidy-waterfall-germany-electricity-mix/render.mjs",
  "R3 mp4Size  proof/vidz-bump-emitter-rank/render.mjs",
  "R3 parseCsvRows  skills/map-beat/assets/geo.ts",
  "R3 parseCsvRows  stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/geo-honey.ts",
  "R3 parseCsvRows  stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/geo-choropleth.ts",
  "R3 parseCsvRows  stories/stress-t-europe-recycling/beats/europe-recycling-map/geo-recycling.ts",
  "R3 parseEnvFile  skills/map-web/scripts/verify-live-map.mjs",
  "R3 renderMapWeb  proof/mapgen-dot-web/render-web.mjs",
  "R3 renderMapWeb  stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/render-web.mjs",
  "R3 renderMapWeb  stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/render-web.mjs",
  "R3 renderStill  skills/scrolly/scripts/render-still.mjs",
  "R3 resolveChrome  skills/map-web/scripts/verify-interaction.mjs",
  "R3 resolveChrome  skills/map-web/scripts/verify-live-map.mjs",
  "R3 resolveChrome  stories/stress-m-forest-loss/beats/forest-loss/bake-plate.mjs",
  "R3 stable  skills/storyboard/scripts/propose.mjs",
  "R3 staggerLacksAnOrder  stories/stress-ae-rail-punctuality/beats/1-passengers-up-punctuality-down/render.mjs",
  "R3 unmatchedValues  proof/mapgen-choropleth-video/geo-choropleth.ts",
  "R3 unmatchedValues  proof/mapgen-choropleth-web/geo-choropleth.ts",
  "R3 unmatchedValues  proof/mapscrolly-one-map-europe-carbon/geo-choropleth.ts",
  "R3 unmatchedValues  stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/geo-choropleth.ts",
  "R3 unmatchedValues  stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/geo-choropleth.ts",
  "R3 wcagContrast  proof/mapmore-dot-population/geo-dot.ts",
  "R3 wrap  proof/map-quake-symbol/QuakeSymbolVideo.tsx",
  "R3 wrap  proof/mapgen-flowmap-video/FlowMapVideo.tsx",
  "R3 wrap  proof/more-line-swiss-life-expectancy/LifeExpectancyLine.tsx",
  "R3 wrap  stories/real-gwis-wildfire-counts/beats/1-africa-carries-the-fall/WildfiresByContinent.tsx",
  "R3 xTickValues  skills/chart-beat/assets/ChartSeed.tsx",
  "R4 assertDistinctSlugs  absent from proof/mapgen-choropleth-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertDistinctSlugs  absent from proof/mapgen-dot-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertDistinctSlugs  absent from proof/mapgen-hexgrid-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertDistinctSlugs  absent from stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertDistinctSlugs  absent from stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertDistinctSlugs  absent from stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from proof/mapgen-choropleth-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from proof/mapgen-dot-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from proof/mapgen-hexgrid-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from proof/mapgen-locator-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from proof/mapgen-symbol-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 assertRecordedLanguage  absent from stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 renderMapWeb  absent from proof/mapgen-hexgrid-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 separationHeadroom  absent from proof/mapgen-choropleth-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 separationHeadroom  absent from proof/mapgen-dot-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 separationHeadroom  absent from proof/mapgen-hexgrid-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 separationHeadroom  absent from stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 separationHeadroom  absent from stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 separationHeadroom  absent from stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from proof/mapgen-choropleth-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from proof/mapgen-dot-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from proof/mapgen-hexgrid-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from proof/mapgen-locator-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from proof/mapgen-symbol-web/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from stories/r9-map-web-reported-rabies-deaths/beats/1-what-the-world-wrote-down/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/render-web.mjs  of <details class=\"mw-table-disclosure\">",
  "R4 waterFillOf  absent from stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/render-web.mjs  of <details class=\"mw-table-disclosure\">",
];
