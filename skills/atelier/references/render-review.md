# Render-review — the editorial second pair of eyes (Gate 3, Layer 2)

A MANDATORY editorial pass on every PRODUCED visual, run BEFORE the journalist's "ship it".
It reads the ACTUAL rendered visual — the `static.png` / a video frame for what a still can show, and,
for an interactive or scrolly deliverable, the RESULT of the producer's interaction test (below) for what
a still cannot — together with the article + the data + the emitted spec, and flags editorial defects that
deterministic code cannot see. Its concerns are **advisory** — surfaced to the journalist, who decides —
but running it is **mandatory**: `assertShippable` refuses to export a visual with no review record.
Honest scope: the record is a **checkpoint that a review ran**, not mechanical proof of its substance
(unlike Gate 2b, whose trigger is upstream provenance data) — a self-attested record from the host that
wrote the spec can rubber-stamp its own error. What makes it real is **independence**, below.

**A static image is not evidence of interaction.** A `static.png` (or a single video frame) shows layout,
labels, colour, aspect, title, source, emphasis — and NOTHING about behaviour. Hover, focus, tooltip
content, tooltip in-viewport clamping, popup name/value, pan/zoom are INVISIBLE in a still. Asserting any
of them from a still — "the tooltip stays in-viewport on hover", "hover surfaces a tooltip", "pan/zoom
works" — is a FALSE verification: a claim the review never performed. This has shipped twice (a symbol map
and a waterfall interactive both had "in-viewport tooltip works on hover" asserted off two static PNGs).
See **Interaction claims require an interaction test**, below — the invariant every type inherits.

Why it exists: the spine gates catch mechanical faults (an invalid spec), but the most damaging faults
are editorial and need the article as ground truth — a title that misstates the metric, a fabricated
source, a misleading encoding. In the test campaign these shipped from otherwise-clean runs.

## Independence (the point)
Review with a FRESH pair of eyes, not the reasoning that produced the spec — a self-review by the
author rubber-stamps its own error (the false "cinq fois plus de jeunes au chômage" title looked fine
to the host that wrote it). **Never spawn an Agent/Task sub-agent to get that fresh pair of eyes** —
during a live journalist-facing atelier run this is a hard rule: atelier ONLY sequences, gates, and
invokes producer scripts/sub-skills; a stray Agent/Task call leaks internal plumbing (an agentId) into
the journalist-facing conversation. Always review **adversarially** yourself instead: actively try to
FALSIFY the visual against each criterion, default to flagging — but be honest that this single-agent
review does NOT deliver true independence and carries residual rubber-stamp risk; it is a known,
accepted limitation, not a reason to spawn a background agent mid-flow.

## Interaction claims require an interaction test (invariant — every type inherits it)
For an **interactive** or **scrolly** deliverable, a claim about BEHAVIOUR — a tooltip surfaces on
hover/focus, the tooltip text is legible, the tooltip stays in-viewport at a mark on the edge, a map popup
shows the right name/value, pan/zoom works — is **allowed ONLY if backed by actually RUNNING the
producer's interaction snapshot script and reading its pass/fail**. NEVER infer it from a `static.png` or a
video frame. No run, no interaction claim: say "not interaction-tested", never assert it passed.

You do not have to trust your own reasoning here, and you must not: the producers ship the exact runnable
checks, and they ALREADY RAN, fail-hard, inside `produce-all` when the channel allows interactive (the
build cannot reach Gate 3 with a broken hover/tooltip). So the evidence for any interaction claim is those
scripts' pass — cite it. Re-run the relevant script yourself whenever you need to (re)confirm a specific
claim, and ALWAYS after any re-produce (Gate 3a re-runs on the new render — a static read never substitutes
for the interaction test). These are the scripts that ship in the repo (the private QA harness is NOT
available to a newsroom — rely only on these):

**chart-native (interactive / chart-scrolly)** — run from `skills/chart-native/`, `CHART=<type>` selects the
built type; each prints a JSON summary to stdout and exits non-zero on failure (a clean run exits 0 with an
`OK` line):
- `bun scripts/snap-tooltip-contrast.mjs` — focuses up to 12 data marks; asserts a `.tooltip` actually
  SURFACES on focus/hover AND its text clears 4.5:1 WCAG contrast. JSON `{chart, marksHovered, checked,
  violations}`; fails hard if not one mark ever opened a tooltip (the hover→tooltip mechanism is broken) or
  any tooltip text is under-contrast. → evidence for "hover surfaces a legible tooltip".
- `bun scripts/snap-tooltip-viewport.mjs` — focuses up to 16 marks at a narrow (380px) and a wide (1100px)
  embed width; asserts each surfaced tooltip stays inside its plot box `[margin, size−margin]` (a mark on
  the right/top edge must not push the tooltip off-screen). JSON `{chart, widths, checked, violations}`;
  fails hard on any overflow or if no tooltip was ever observed. → the ONLY evidence that licenses "the
  tooltip stays in-viewport on hover".
- `bun scripts/snap-interactive.mjs` — loads the interactive build, hovers a data point, asserts the
  `.tooltip` renders, and screenshots it. → a driven hover image (a still that was PRODUCED BY a real hover,
  not a static render) when you want to eyeball the actual tooltip.

**map-native (interactive map)** — run from `skills/map-native/`, pass the built interactive dir:
- `bun scripts/snap-proof.mjs` (env `SERVE_DIR=<interactive dist> OUTDIR=<dir>`) — loads the interactive
  map, hovers to trigger a popup, and asserts the popup carries a region/place name (letters) and, for
  choropleth/symbol layers, a value (a digit); writes `interactive.png` from the real hover. Exits non-zero
  if no popup is ever found. → evidence for "hover surfaces a popup with the right name/value".

Any assertion listed under **Criteria** as `[interaction-tested]` MUST cite the script above whose pass
backs it (or its produce-time run). If you did not run it and cannot cite the produce-time pass, do not make
the claim — flag "interaction not verified" instead.

## Criteria — flag a concern for each that fails
Tag each finding with HOW it was verified: **[static]** (readable from the `static.png` / video frame) or
**[interaction-tested]** (requires running an interaction script above — never a still). Keep the two
apart in the record so a reader can tell what was eyeballed from what was exercised.
1. **Title honesty.** The title states exactly what the data shows. A RATE title must not assert a COUNT
   or VOLUME ("cinq fois plus de jeunes au chômage" over a rate, "deux fois plus d'emballages" over a %
   are both false). The insight must be literally true of the data. It must ALSO match the takeaway the
   journalist confirmed at CADRAGE (Gate 1b) — not a narrower or different claim: a specific multiplier
   ("2x") standing in for a confirmed "widening gap" insight, or a scope word ("Nordic countries") that
   excludes an entity the visual actually shows (e.g. an Alpine country on the same map), are both false
   even if each number is individually correct. If the data supports more than the title states, widen
   the title rather than shipping the narrower claim.
   **Mandatory step — QUOTE `confirmedTakeaway` and check EVERY part.** The review must (a) quote the
   proposal's `confirmedTakeaway` (`accepted.json`) VERBATIM, and (b) state EXPLICITLY whether the
   produced title/insight carries ALL its parts — a two-part takeaway ("punctuality is falling
   everywhere AND Italy is the only riser") needs BOTH parts carried, or the dropped part flagged as a
   concern; a confirmed grouping/classification must not be silently re-cut by the visual. A review
   that never quotes the confirmed takeaway, or quotes it without the part-by-part statement, is NOT a
   valid render-review — that omission is itself a review failure (re-run 3a properly). This is the
   recurring miss the step exists to close: the chosen chart type tends to foreground ONE half of the
   confirmed claim and silently drop the other.
2. **Source traceability.** The displayed source is supported by the article/data, and is COMPLETE — a
   NAMED dataset/publication (e.g. "Eurostat") MUST carry both its label AND a real, verifiable URL; a
   bare name with no URL is incomplete and must be flagged even when the name itself is genuine. The URL
   itself must resolve to the SPECIFIC, traceable dataset/page the figures actually come from (e.g. the
   Eurostat dataset page for the exact table/code, the Insee series page) — a generic organisation
   homepage (`eurostat.ec.europa.eu`, `insee.fr`) or an unverifiable/404 link is NOT traceable and must be
   flagged exactly like a missing URL, even when the organisation name itself is genuine. An attribution
   the article never gave — a dataset name and/or URL invented for unattributed figures — is a
   **fabrication**; flag it hard. Prose figures → "Chiffres tels que rapportés dans cet article" (or the
   outlet the journalist names) is the one legitimate name-only case (it cites no separate dataset), never
   a fabricated dataset. If the source is missing, incomplete, generic (a homepage standing in for the
   dataset page), or unclear, it must be corrected by asking the journalist directly for the SPECIFIC
   dataset/page reference — as ONE free-text prompt collecting the label and that specific URL together,
   never a single-select (a URL cannot be one of a few fixed menu options) — before shipping. A
   confident-looking citation built on the journalist's ADMITTED UNCERTAINTY (« je crois », « de
   mémoire », could not name the exact report) is a defect too: per Gate 2c it must have been either
   explicitly confirmed or downgraded to the honest prose fallback ("Chiffres tels que rapportés dans
   cet article" / the outlet's own name) — flag a hedged source dressed up as a verified reference.
3. **Honest encoding.** No two differently-denominated series sharing one axis; a majority/threshold that
   carries the story is drawn (a 50% line for a yes/no); a two-point change is a slope/dumbbell, not a
   line; a ranking is a bar, not a map.
4. **Earns its place.** The visual shows more than the sentence already says. A two-value "chart" that
   reads as a sentence → recommend no-chart (or a callout), not a chart.
5. **Legibility & a11y.** **[static]** for the still surface: readable at a glance at the target size;
   value labels clear 4.5:1; furniture (title, source, unit/legend) present, in the article's language,
   numbers localized (FR "1 900", "19,3"). For a chart-scrolly, this includes the caption wording itself —
   ordinals ("2e" not "2nd") and connective phrases ("en tête", "Le plus bas"), not just numbers
   (`chart-native/src/chart-story.ts` branches on `spec.lang`, same convention as `core/locale.ts`).
   **[interaction-tested]** for the hover surface of an interactive/scrolly deliverable: that a tooltip
   surfaces on hover/focus, its text is legible (4.5:1), it stays in-viewport at an edge mark, and (map) a
   popup shows the right name/value — these are NEVER visible in the `static.png`; assert them only by
   citing the pass of `snap-tooltip-contrast` / `snap-tooltip-viewport` (chart) or `snap-proof` (map). No
   cited run → record "tooltip/hover not interaction-tested", never "works".
6. **Fidelity. [static]** The emphasis the journalist accepted (a highlighted region, a labelled outlier)
   is actually in the render (visible in the still). Criteria 1–4 and 6 are **[static]** — verifiable from
   the `static.png` / video frame + article + spec. Only the hover surface of criterion 5 is
   **[interaction-tested]**.

## Probing a published Datawrapper chart — propagation lag is not a data defect
A freshly published DW chart can 404 its `dataset.csv` (and lag its published HTML) for a short
CDN-propagation window right after publish. A probe that hits a 404 there MUST **retry once after
`DW_DATASET_PROPAGATION_RETRY_MS` (30 000 ms, `src/review-gate.ts`)** before treating it as a data
defect. Only a 404 that SURVIVES the retry is a real fidelity/source concern — record it as a
`concern` probe and surface it; a 404 that clears on retry is recorded as a `resolved` probe with
that evidence ("first GET 404, retried after the propagation delay, 200 OK").

## Record it (this is what makes export possible)
```bash
bun skills/atelier/scripts/review-gate.mjs exports/<slug>/report.json <id> \
  --probes '[{"check":"...","outcome":"pass"}, ...]' [concern...]
```
Each trailing arg is one concern; no concern args = a clean review. **`--probes` is REQUIRED — the
LEDGER of every probe/check the review actually RAN**, as a JSON array (inline, or a path to a
`.json` file): each entry is `{check, outcome, note?}` with `outcome` one of
- `pass` — probed and clean;
- `concern` — probed and failing; `note` says WHAT failed, and the same finding MUST also be one of
  the surfaced concern args (a probed failure is never silently dropped — the gate refuses a
  concern-outcome probe on a review submitted with no concerns);
- `resolved` — probed, initially failing, explicitly resolved; `note` says HOW, with evidence (e.g.
  the propagation retry above).

The gate mechanically refuses: an EMPTY ledger; a `concern`/`resolved` probe without a `note`; and a
**failure keyword** (`404`, `absent`, `missing`, `mismatch`, `not found` + FR equivalents — see
`FAILURE_KEYWORDS` in `src/review-gate.ts`) appearing in the recorded narrative (a concern, or a
pass-probe's own text) that no `concern`/`resolved` probe reflects. The tripwire is deliberately
CONSERVATIVE — it may over-ask, never under-ask: a pass-probe worded "no value is missing" trips it.
That false positive costs one rewording ("all values present"), or an explicit `resolved` probe
quoting the keyword with its evidence — an accepted tolerance, because the failure mode it kills
(probing FOUND a missing value and a dataset 404, and the summary silently asserted full fidelity)
shipped for real. Then show the render to the journalist **together with** these concerns, and
proceed to the "ship it" approval (`gate-render.mjs`). The concerns never hard-block — the
journalist is the editor.

Keep the record honest about METHOD: a clean review of an interactive/scrolly deliverable means the
interaction test actually ran (its produce-time pass, or a re-run) — not that a still looked fine. If you
could not run it, that is itself a concern to record ("hover/tooltip not interaction-tested"), never a
silent pass. Do not word a concern (or its absence) so it implies an interaction was checked when only a
`static.png` was read.
