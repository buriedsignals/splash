# Format selection — which output best serves the claim (grounded)

> The suggester's JUDGMENT reference: given a claim + data + intent, choose the output format
> (static · interactive · scrolly · video) and, for geographic data, map vs chart. Grounded — see
> sources. The governing fact: **most readers do not interact** (Archie Tse / NYT, Malofiej 2016:
> ~85% ignore rollovers/tooltips), so every format above static must EARN its cost. This is an
> ordered ladder — first match wins.

## GATE 0 — chart family (intent → type)

Classify the claim against the FT Visual Vocabulary BEFORE choosing format
(`<repo-root>/knowledge/references/chart-selection.md`): magnitude→bar/column · change-over-time→line/area
· distribution→histogram/box/dot · part-to-whole→stacked/pie(≤3) · correlation→scatter · ranking→sorted
bar · flow→sankey · geographic→map (subject to Gate 5).

## GATE 1 — DEFAULT TO STATIC (start here)

A static image is the right default for most journalistic data points. Choose static when: one or two
key claims · cross-channel distribution (web + social + print/email) · the insight can be annotated
directly on the chart · general audience · tight deadline. **If the main point can be shown without
interaction, static wins.** Static reaches everyone, has zero interaction cost, embeds anywhere, is
accessible, shareable, and durable. Escalate only if a gate below fires.

## GATE 2 — escalate to INTERACTIVE (only if ALL three)

1. the dataset is large/multi-series (>~10 series, or individual-record granularity) so a static chart
   omits data or becomes unreadable; AND
2. the reader's PERSONAL data point is the hook ("find your postcode/school/country"); AND
3. distribution is web-only (won't be shared to social / printed / emailed where interactivity is lost).
**Non-negotiable:** the static fallback must carry the core claim WITHOUT interaction — the interactive
layer is additive, never load-bearing (85% never see hover/click state).

## GATE 3 — escalate to SCROLLYTELLING (only if ALL)

1. the argument is irreducibly SEQUENTIAL (step N needs step N-1; author-mandated order matters); AND
2. a SINGLE visualization benefits from 4+ discrete state changes (one chart evolving — not several
   different charts, which are better as stacked statics); AND
3. the piece is long-form/feature (not breaking news — scrolly penalizes skimming + Ctrl+F); AND
4. resources exist (design+dev, mobile testing, more production time).
Reject scrolly for: simple comparisons (stacked static charts + headlines), breaking news, a visual that
doesn't change across steps.

## GATE 4 — escalate to VIDEO/MOTION (if either)

A. **motion is the only encoding** — temporal spread / geographic diffusion / a process with moving
   parts, where the change itself is the story and small multiples would need too many frames; OR
B. **distribution is social/vertical** — TikTok / Reels / Shorts / a native video tab, where static
   charts are invisible.
Reject motion for: comparison of two states (use static small multiples) · decorative animation (bars
growing, counters) · analysis tasks · audio-dependent clips without captions. Respect
`prefers-reduced-motion`.

## GATE 5 — MAP vs CHART (geographic data ONLY)

**Geographic data does NOT automatically mean a map.** A map encodes values with position (already used
by geography), area (poor perception), and colour (low precision) — three of the weakest encodings; a
bar uses length on a common baseline — the most accurate. So:

- **Use a MAP only when** the SPATIAL PATTERN is the story (clustering, spread, adjacency, diffusion —
  *where things sit relative to each other* is the insight), AND the data is normalized (rates, not raw
  counts — raw counts make a population map), AND the regions are legible (countries/states, not tiny
  municipal units), OR there is a self-location motive ("find my area").
- **Use a SORTED BAR CHART instead when** the story is "which region is highest/lowest" (ranking) · no
  clear geographic cluster · subtle adjacent differences (colour can't resolve them; bar length can) ·
  few regions (≤~15) · absolute counts not rates.
- **Practical test:** drop the geographic data into a sorted bar chart. If the story is equally/more
  legible there → use the bar chart. Maps only earn their spatial overhead when the pattern is genuinely
  lost in bars.

## Decision ladder (the suggester applies this)

```
CLAIM + DATA
  GATE 0  → chart family from intent
  GATE 1  → can the insight be a single annotated STATIC image?  YES → STATIC
  GATE 2  → large + personal-hook + web-only?                    ALL YES → INTERACTIVE (+static fallback)
  GATE 3  → sequential + single-chart 4+ states + long-form + resources?  ALL YES → SCROLLY
  GATE 4  → motion-is-the-encoding OR social/vertical?           YES → VIDEO
  GATE 5  (geo only) spatial pattern IS the story + normalized + legible regions?  YES → MAP  else → sorted BAR
```

Static-first is not conservatism — it is empirically grounded. Every escalation buys a specific capability
the static form cannot provide, at the cost of reach + production + delivery friction. Make the trade
explicit; never escalate because "interactive = sophisticated".

## Sources

Archie Tse / NYT via Nieman Lab (Malofiej 2016) · Dominikus Baur "The End of Interactive Visualizations" ·
Datawrapper (explanatory approach; choropleth caveats; "what to consider for choropleth maps") · NN/g
(interaction cost) · The Pudding + ACM ECCE 2023 (scrollytelling) + Robert Kosara / Nightingale (scrolly
caveats) · Observable HQ (effective animation) · Nieman Lab (vertical video 2024) · Storytelling with Data
+ Online Journalism Blog + FT Visual Vocabulary + Penn State GEOG 486 (map vs chart). Full URLs in the
research transcript.
