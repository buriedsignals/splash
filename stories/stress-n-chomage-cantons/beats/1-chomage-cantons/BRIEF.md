# Beat — Le chômage par canton (Datawrapper, published embed)

**Type:** bar (ranking, 26 cantons, one bar per canton, sorted descending). **Medium/format:**
chart / web, delegated to Datawrapper (`format: "web"` → Datawrapper's own `interactive`
publish path — a hosted, published embed, never a PNG). **Chart type:** `d3-bars`.

## The traps this beat was built to hit

`source/data.csv`: 26 Swiss cantons, unemployment rate 1.7–6.4%. Three traps named in advance:
accented/emoji labels, 26 categories in one chart, a French-language delivered page. A fourth
trap was procedural: this skill's `format: "web"` path had never run in this tree at all — its
one prior artefact (`stories/stress-i-median-wages`) is a static PNG, and that PNG export was
itself refused (`plateFollowsGround`, "white-on-dark surface mismatch").

**Decision taken here:** ship the delegated path as intended — do not hand-roll a bespoke chart
for something `dw-beat` explicitly claims to cover as its default, thin producer. The point of
this beat is to exercise that exact unrun path with real data and a real token, and report what
actually came back, not to route around it.

## The takeaway shipped, and the grounding check, run verbatim

```
takeaway: "Le taux de chômage varie du simple au triple selon les cantons : de 1,7 % à Appenzell
Rhodes-Intérieures à 6,4 % à Neuchâtel, avec Genève juste derrière à 5,8 %."
```

`groundTakeaway` (`skills/storyboard/scripts/ground-claim.mjs`) against `source/profile.json`:

```json
[
  { "claim": "1", "verdict": "unverifiable", "detail": "could not be placed in any numeric column's range or total (\"taux\" [1.7, 6.4], sum 93.8) — this check has no way to confirm or refute it" },
  { "claim": "7", "verdict": "unverifiable", "detail": "could not be placed in any numeric column's range or total (\"taux\" [1.7, 6.4], sum 93.8) — this check has no way to confirm or refute it" },
  { "claim": "6", "verdict": "supported", "detail": "within the range of column \"taux\" [1.7, 6.4]" },
  { "claim": "4", "verdict": "supported", "detail": "within the range of column \"taux\" [1.7, 6.4]" },
  { "claim": "5", "verdict": "supported", "detail": "within the range of column \"taux\" [1.7, 6.4]" },
  { "claim": "8", "verdict": "unverifiable", "detail": "could not be placed in any numeric column's range or total (\"taux\" [1.7, 6.4], sum 93.8) — this check has no way to confirm or refute it" }
]
```

**Finding.** `NUMBER_RE` (`ground-claim.mjs`) is `/-?\d+(?:\.\d+)?/g` — DOT-decimal only. Fed a
FRENCH-formatted takeaway, every comma decimal in it is silently split into two independent
integer claims: "1,7" becomes "1" and "7"; "6,4" becomes "6" and "4"; "5,8" becomes "5" and "8".
The two fragments that could not coincidentally fall inside `taux`'s own [1.7, 6.4] range ("1" and
"7") come back `unverifiable`, correctly by luck rather than by design — but "6", "4" and "5" each
land inside that range purely as single-digit integers and are marked `supported`, which is not a
confirmation of anything: no claim in this takeaway is actually "somewhere between 1.7 and 6.4 named
4" or "named 5". The checker was never run against a French decimal comma before this beat, and this
is that first run. It does not invalidate the takeaway (both real numbers, 1.7 and 6.4, ARE genuinely
the column's own min and max — verified by reading `source/profile.json` directly, not by this
check), but the verdict array above is not evidence of that; it is a coincidence that the digits it
split on happen to fall in range too.

## What the live Datawrapper API actually did

`bun run skills/dw-beat/scripts/produce.mjs stories stress-n-chomage-cantons 1-chomage-cantons web
--story-output` — five real calls (create, set data, patch metadata, publish; no PNG export for
`format: "web"`), all against `api.datawrapper.de/v3`, no mock:

```json
{
  "format": "web",
  "provider": { "format": "interactive" },
  "chartId": "1u88u",
  "publicUrl": "https://datawrapper.dwcdn.net/1u88u/1/",
  "htmlPath": ".../renders/chart.html"
}
```

`DATAWRAPPER.json` records `"state": "local-complete"`. **`DATAWRAPPER_API_TOKEN` worked as a
token alias**: `.env` at this repo's root carries only `DATAWRAPPER_API_TOKEN` (confirmed —
`grep -c '^DATAWRAPPER_TOKEN=' .env` → `0`), and `resolveDatawrapperToken(process.env)` with
`DATAWRAPPER_TOKEN` explicitly unset in the shell still returned the real 64-character token. The
alias taught into `produce.mjs` yesterday works.

## Whether the delivered page is what the skill claims — it is not, on one axis

Opened BOTH pages with a real driven browser (Puppeteer/Chrome), not asserted from the JSON that
came back.

**The local page** (`renders/chart.html`) is exactly `iframePage`'s contract: `<html lang="fr-FR">`,
the takeaway as `<title>`, one `<iframe src="https://datawrapper.dwcdn.net/1u88u/1/">`. Checked
mechanically too — `pageLanguageMatchesStory(html, "fr-FR")` → `true`. This is the guard the task
brief calls out ("a delivered page's declared language is now guarded in this tree"): it exists as
a standalone function (`skills/dw-beat/scripts/verify-owned.mjs`), it is unit-tested, and it is
**not called anywhere inside `produce.mjs` itself** — a beat has to run it by hand against its own
delivered file, which is what this run just did.

**The published embed** (the actual `publicUrl`, opened directly, not through the local wrapper):
renders correctly on every trap this beat was built to hit — all 26 cantons present, sorted
descending, `Zürich`/`Genève`/`Neuchâtel`/`Basel-Landschaft`/`Sankt Gallen` all keep their accents,
and `Appenzell Ausserrhoden 🏔️` keeps its emoji, printed beside the label exactly where the CSV put
it. **It does NOT render in this beat's own colour.** `GET /v3/charts/1u88u` confirms the metadata
Datawrapper actually stored: `"custom-colors": { "Taux de chômage (%)": "#D4A853" }` — sent
correctly, keyed correctly (the resolved series label, never the raw `taux` column name), saved
correctly. The published chart's bars are `rgb(24, 161, 205)` (`.bc-bar-inner`'s own computed
`background-color`, read directly off the live DOM) — Datawrapper's own default blue, not
`#D4A853`. **Finding: `custom-colors` is confirmed live for a line chart (`references/
range-annotation-shape.md`, the CO₂ proof) and had never been confirmed live for `d3-bars` before
this beat — it is now, and it does not work for this chart type.** Every unit test in
`skills/dw-beat/test/metadata-spec.test.ts` and `produce.test.ts` checks that the right key/value
reaches the outgoing PAYLOAD; none of them can check what Datawrapper's own bar-chart renderer does
with it, because none of them call the real API. This beat's own record is that live check.

**Second, related finding, from `scripts/verify-owned.mjs`'s own header, quoted verbatim** because
it names this beat's exact situation before this beat existed: *"`spec` REQUIRES an accent (`color`)
and has no field for a ground. So a story whose `PALETTE.md` records `ground: "#16191B"` gets a
white chart delivered into a dark article, which is the defect `plate-follows-theme` was earned
by."* Confirmed here: the published chart is on Datawrapper's own white/transparent surface
(`getComputedStyle(document.body).backgroundColor` → `rgba(0, 0, 0, 0)`, the chart's own theme is
plain white beneath it), not this story's recorded `#16191B`. **And unlike the static path, nothing
catches it**: `assertExportedSurface`/`plateFollowsGround` only runs in `produceUnlocked`'s STATIC
branch (it inspects PNG bytes); the `format === "interactive"` branch this beat took returns before
that check is ever reached. `stress-i-median-wages` hit this same ground-vs-surface mismatch on the
STATIC path and was refused loudly. This beat hit the matching defect on the WEB path — a wrong
accent AND an unthemed ground — and nothing refused anything. The artefact was written, the state
was marked `local-complete`, and the record carries no sign that either mismatch happened.

## Look, including the ugly part

Opened both pages. The published chart itself is genuinely clean: legible French labels at 26
rows, no collision, no truncation, the emoji renders as a small grey mountain glyph inline with the
label text (not oversized, not clipped), values printed at each bar's own end. The ugly part is the
colour: an editorial gold accent was asked for, on a dark house ground, and what shipped is
Datawrapper's own default teal-blue on white — the newsroom's identity is entirely absent from the
one artefact a reader will actually see, and the local iframe wrapper (dark-ground-agnostic itself,
just a bare `<iframe>`) does nothing to correct that once embedded in a dark page.

## Source

`Source: Intake de l'article, source/data.csv (gelé), données gelées, année non précisée`

`source/article.md` names no data source and no reference year for these figures — the same gap
noted in every other stress beat's own `source/article.md` — the frozen article is never edited to
add one.
