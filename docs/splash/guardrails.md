# Scripted guardrails — what the machine catches before and after production

Every guard below is CODE on the produce spine (not prose): a violation fails loud, before
the journalist sees a broken visual. This page exists so a newsroom (and any integrator)
can see what is mechanically guaranteed vs what stays on the human render-review (Gate 3a).
Every row was verified against its named file — no guard is documented from memory.

The spine runs in this order: **validation gate** (on every accepted proposal, before any
producer) → **produce-time guards** (inside each producer, on the real render) → **ship
gates** (before anything is exported or deployed). A failure at any layer stops the element;
nothing is silently downgraded.

## Layer 1 — the validation gate (`skills/splash/src/validate-gate.ts`, every accepted proposal)

| Guard | Catches | Where |
|---|---|---|
| Producer validators (Tier-0 floor) | an invalid or weak spec itself — the producer's OWN validator re-run at the spine, so a hand-rolled spec that skipped the suggester's self-check cannot ship | `validate-gate.ts` `validateByProducer` → `skills/dw-chart/src/chart-spec.ts`, `skills/map-dw/src/map-spec.ts`, `skills/map-native/src/validate-config.ts`, `skills/chart-native/src/spec-to-config.ts` |
| Preflight (per-engine readiness) | a missing API key or uninstalled skill deps announced BEFORE production in journalist language (tri-state green/yellow/red, re-derived from the manifest on every read — nothing is cached), instead of a lazy crash mid-PRODUCTION | `skills/splash/src/preflight.ts` (manifest + gate in `produce-all.ts`), `skills/splash/scripts/preflight.mjs` (PROPOSITION-time report, records nothing), `lib/newsroom/readiness.ts` (the decor's reading of the same manifest; a live provider verdict lives in `newsroom.json.capabilities[].lastVerified`, written only by the setup page) |
| Claim-grounding (GUARD 4) | a title/`confirmedTakeaway` citing a year outside the chart's time axis, or a value ABOVE the plotted/joined data maximum, with no annotation or reference line backing it — the "70% target by 2035 on data that tops out at 48% in 2023" defect | `validate-gate.ts` (`claimGroundingErrors`; domain read from CSV `data` for charts + map-dw, from `rows[valueField]` for map-native choropleth/dot-density; hex-grid (`points[]`), cartogram (`values[]`), locator/route/symbol configs are a strict no-op — their value claims stay on the human render-review) |
| Placeholder source URL (GUARD 2) | a fabricated citation on an RFC 2606/6761 reserved domain (`example.com`, `.test`, `localhost`, …) | `skills/splash/src/source-guard.ts` (`placeholderSourceReason`), wired in `validate-gate.ts` |
| Source fidelity (GUARDs 2b/2c) | a named org from the article dropped for the generic "as reported in this article" fallback; a journalist-provided URL silently deepened/upgraded — both keyed off the captured `sourceHint`; a dropped hint surfaces as a non-blocking warning | `skills/splash/src/source-guard.ts` (`sourceNamePreservedReason`, `sourceUrlFidelityReason`, `droppedSourceHintWarning`) |
| Confirmed-takeaway presence (GUARD 3) | a proposal with no VERBATIM Gate-1b `confirmedTakeaway` — without it, nothing proves the journalist ever confirmed the claim, and Gate 3a has nothing authoritative to quote the title against | `validate-gate.ts` (`missingConfirmedTakeawayError`) |
| Duplicate takeaway (GUARD 3b) | one combined takeaway stamped byte-identically onto several elements of a batch (one element = one confirmed claim) | `validate-gate.ts` (`duplicateConfirmedTakeawayError`) |
| Guardrail parity | the suggester's deterministic guards re-applied at the spine so a hand-authored bypass clears the same bar: row-driven chart types on a portrait/square channel (cropped overflow), a titleless/sourceless native spec, a non-water subject painted on the blue family | `skills/splash/src/guardrail-parity.ts` |
| skillsInvoked sub-skill proof (GUARD 5) | a guided proposal that does NOT list `suggest-chart` in `skillsInvoked` (a host re-decision bypassing the ranked candidates) → error; an absent/empty list, or one declaring no branch token, → non-blocking warning (cannot mechanically prove the sub-skill ran) | `validate-gate.ts` (`skillsInvokedIssues`) |
| Narrative consideration (Tom #3, advisory) | a `candidates.json` menu that carries NEITHER a narrative-family candidate (chart-scrolly · map-story · map-scrolly · image-scrolly · video reveal) NOR an explicit non-empty `narrativeRuledOut` reason → a NON-blocking `report.warnings` entry (the tool now SURFACES the "silent narrative absence" the suggest-chart contract forbids; the harness `check:narrative-not-considered` verifies it). Menu-level, computed by the produce-all CLI, not per-proposal | `skills/splash/src/candidate-provenance.ts` (`narrativeConsiderationWarning`), attached in `produce-all.mjs`; report field `ProduceReport.warnings` |
| Candidate provenance | a non-direct proposal whose PRODUCER is not named in the persisted `candidates.json` beside `accepted.json` — a spec for a producer the suggester never proposed — OR a run with no `candidates.json` at all → fail-hard, before production. Makes the ranked candidates menu a mechanical PRECONDITION of production (Tom #1/#2/#3), not a courtesy. ONLY the DIRECT branch (`skillsInvoked: ["splash:cadrage-direct"]`) is exempt. Producer-level by design (not type-level): candidate/spec type vocabularies do not align — a narrative candidate names `chart-scrolly` while its spec names `line`/`choropleth` — so a type-strict gate would false-block scrolly; off-menu TYPE stays caught by the harness + GUARD 4/5 | `skills/splash/src/candidate-provenance.ts` (`candidateProvenanceIssue`, `extractCandidateProducers`), wired in `produce-all.ts`; CLI resolves the sibling in `produce-all.mjs` |
| Narrative-beat anchors | a scrolly beat plan anchored on an x/category that is not in the data → hard error; a bar walk whose rendered sort contradicts the beat order → advisory warning (caption SEMANTICS stay human, Gate 3a) | `skills/chart-native/src/chart-story.ts` (`narrativeBeatErrors`, `narrativeBeatWarnings`), wired in `validate-gate.ts` (`validateScrolly`) |
| Channel normalization (fail-closed) | a garbled/unknown channel string — it THROWS instead of silently widening to the permissive article-web default | `skills/splash/src/channel.ts` (`normalizeChannel`), consumed by `guardrail-parity.ts` and `produce-all.ts` |

## Layer 1b — producer spec-level tripwires (before any API/render call)

| Guard | Catches | Where |
|---|---|---|
| Annotation y-domain tripwire | a dw-chart annotation whose derived y lands outside the data's y-domain — Datawrapper would silently drop it off-canvas | `skills/dw-chart/src/spec-to-metadata.ts` (throws "outside the y-axis domain") |
| map-dw join-key registry | a `mapKeyAttr` that is not a real join key of the (known) basemap — the join would fail and ship a fully grey, dataless map | `skills/map-dw/src/map-spec.ts` (`validateJoinKey`, keys pinned in `basemap-keys.ts`) |
| map-dw dataless-join guard | the produce-time net behind the registry: the join checked against the LIVE basemap geometry, failing hard when it essentially matched nothing | `skills/map-dw/src/join-match.ts` |
| Symbol maps refused on map-dw | Datawrapper symbol maps are hover-only (no always-visible labels) — the static PNG would ship mute circles, so map-dw hard-errors and routes to map-native, whose renderer labels the top-N symbols | `skills/map-dw/src/map-spec.ts` (symbol branch hard error) |
| Number-format validation | a non-Datawrapper numeral token (silently ignored by DW), and the percent-scale mismatch ("%" token on 0–1 fractions renders "0%") | `skills/map-dw/src/map-spec.ts` (`validateNumberFormat`), shared helpers in `skills/dw-chart/src/chart-spec.ts` |

The map-dw validator also emits advisory warnings (never blockers): a sparse basemap subset
(data covering a sliver of the basemap reads as an empty map with a data speck) and a
sub-national locator extent (map-dw's generalized basemap renders inland places offshore at
that zoom — prefer map-native). Both in `skills/map-dw/src/map-spec.ts`.

## Layer 2 — produce-time guards (inside the producers, on the real render)

| Guard | Catches | Where |
|---|---|---|
| Channel/format gate | a format outside the channel's allowed set (the hard rule: off-embed ⇒ never interactive/scrolly), enforced at dispatch before any producer runs | `skills/splash/src/produce-all.ts` (`assertFormatAllowed`) + `skills/splash/src/channel.ts` |
| Producer match (GUARD 1) | a silent producer swap between accept and produce (committed dw-chart, produced chart-native) — the only sanctioned switch is the explicit native→dw fallback | `skills/splash/src/producer-guard.ts`, wired in `produce-all.ts` |
| Produce conformance | type-appropriate render-free checks run BEFORE building — subject-fit palette, furniture-on-theme contrast, symbol labeling — a violation fails the run, never rubber-stamped | `skills/chart-native/src/core/produce-conformance.ts`, `skills/map-native/src/core/map-produce-conformance.ts` (+ `skills/map-native/src/conformance.ts`) |
| Render-size conformance | a produced static PNG whose pixel dimensions differ from the channel's mandated size (a silent wrong-aspect ship) | native producers' `scripts/produce.mjs` + `channel.ts` (`assertRenderedSize`) |
| Contrast snaps | WCAG text contrast measured on the REAL render (static and interactive passes, tooltip included), brand-explicit fills accounted for | `skills/chart-native/scripts/snap-contrast.mjs`, `snap-interactive-contrast.mjs`, `snap-tooltip-contrast.mjs`; `skills/map-native/scripts/snap-contrast.mjs` (the furniture-text WCAG guard actually invoked at `produce.mjs:287` static / `:356` interactive — a HARD FAIL with no brand-colour downgrade bucket), `snap-theme.mjs`, `snap-a11y.mjs` — all run fail-hard from `produce.mjs` |
| Label-fit snaps | clipped/truncated labels at the delivered widths (static @900, interactive @360/1100, clipPath-aware) | `skills/chart-native/scripts/snap-label-fit.mjs`; `skills/map-native/scripts/snap-responsive.mjs` |
| Tooltip-in-viewport snap | an interactive tooltip rendered outside the visible frame | `skills/chart-native/scripts/snap-tooltip-viewport.mjs` |
| Video snap + watchdog | a broken mp4 (container/reveal/progression checks + the FINAL still verified against the approved frame) and unbounded render hangs (process-group watchdog) | `skills/chart-native/scripts/snap-video.mjs`, `skills/map-native/scripts/snap-video.mjs` + `skills/map-native/src/video-watchdog.ts` — run fail-hard from both `produce.mjs` |

## Layer 3 — ship gates (before export or deploy)

| Guard | Catches | Where |
|---|---|---|
| Shippable assertion | exporting anything not `produced` + render-REVIEWED + render-APPROVED — the one mechanical gate in the irreversible-action scripts | `skills/splash/src/export-guard.ts` (`assertShippable`) |
| Review probes ledger | a review record that lists nothing it actually ran — an empty ledger proves nothing and is refused | `skills/splash/src/review-gate.ts` |
| Render provenance | approving a file production did not emit (a hand-planted artifact) or a stale-generation approval after a re-produce rewrote the artifacts | `skills/splash/src/render-provenance.ts` |
| Delivery shape | a hand-over folder that does not match the pinned format + chosen form: static = exactly one image, video = exactly one mp4, interactive/scrolly = the chosen html / runnable code-source bundle (`package.json` + `vite.config.ts` at root) / `EMBED_URL.txt` | `skills/splash/src/export-guard.ts` (`assertDelivered`) |
| Hosted-URL floor | an embed delivery claiming shipped on a blank/placeholder/local URL (a stalled deploy cannot fake "delivered") | `skills/splash/src/export-guard.ts` (`isHostedUrl`) |
| Embed fail-fast | choosing the embed form with no `FLY_API_TOKEN` — fails before any flyctl call, instead of stalling and marking delivered | `skills/splash/scripts/deploy-embed.mjs` |

## What stays human (Gate 3a, by design)

Semantic judgment has no mechanical lever and stays on the render-review: whether the title
MEANS the same thing as the confirmed takeaway (only its presence, duplication, and numeric
grounding are scripted), whether an encoding misleads, whether a caption's comparative
wording is fair, palette subject-fit beyond the deterministic blue-family check. The
scripted guards exist to guarantee the review spends its attention there — not on grey maps,
cropped charts, fabricated citations, or numbers the data cannot show.
