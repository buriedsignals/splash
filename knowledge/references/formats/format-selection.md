# Format selection — which output best serves the claim (grounded)

> The suggester's JUDGMENT reference: given a claim + data + intent, choose the output format
> (static · interactive · scrolly · video) and, for geographic data, map vs chart. Grounded — see
> sources. **The confirmed distribution channel is applied FIRST** (GATE -1 below): it hard-restricts
> which formats are even eligible before any of the reasoning below runs. Within the channel's allowed
> set, the governing fact is: **most readers do not interact** (Archie Tse / NYT, Malofiej 2016: ~85%
> ignore rollovers/tooltips), so on the channels where it's available, interactive still must justify
> shipping a static fallback alongside it. GATE 0→5 below is an ordered ladder within the channel's
> allowed set — first match wins.

## GATE -1 — CHANNEL FIRST (constrains the allowed-format set, before anything else)

The confirmed distribution channel (CADRAGE Q3) hard-restricts which formats are even eligible for a
given piece — this gate runs BEFORE the escalation ladder in GATE 0→5, not after it. Code source of
truth: `skills/atelier/src/channel.ts` (`CHANNELS`, `allowedFormats`, `isFormatAllowed`). Exactly three
channels:

| Channel | Allowed formats | Aspect / size | Rule |
|---|---|---|---|
| **social-vertical** (Stories / Reels) | image · video ONLY | portrait 9:16 | NEVER interactive/scrolly — the surface can't host them |
| **social-feed** (Instagram / Facebook post) | image · video ONLY | square 1:1 | NEVER interactive/scrolly |
| **article-web / embed** | image · interactive · video · scrolly (all four) | media landscape 16:9 · component responsive | **DEFAULT interactive** — it wins unless a concrete reason not to (GATE 1/2 below) |

- On the two social channels, GATE 1→4 below still decides **image vs video** (static-first fully
  governs there, see GATE 1) — GATE 2/3 (interactive/scrolly) never fire because those formats simply
  aren't in the allowed set.
- On the article-web channel, interactive is the channel-level default rather than something that must
  be escalated into — see the reframed GATE 1/2 below for what that means in practice.

## GATE 0 — chart family (intent → type)

Classify the claim against the FT Visual Vocabulary BEFORE choosing format
(`<repo-root>/knowledge/references/chart-selection.md`): magnitude→bar/column · change-over-time→line/area
· distribution→histogram/box/dot · part-to-whole→stacked/pie(≤3) · correlation→scatter · ranking→sorted
bar · flow→sankey · geographic→map (subject to Gate 5).

## GATE 1 — STATIC-FIRST GROUNDING (the a11y-fallback baseline)

A static image is the right default for most journalistic data points, and the empirical grounding
(Archie Tse / NYT, Malofiej 2016) is why. Static reaches everyone, has zero interaction cost, embeds
anywhere, is accessible, shareable, and durable — one or two key claims · cross-channel distribution ·
the insight can be annotated directly on the chart · general audience · tight deadline all point here.

**Channel scoping (post GATE -1):** on the two **social** channels, this gate is the primary decision —
"static wins" in full, and the only escalation available is to video (GATE 4). On **article-web**, the
channel default is now interactive (GATE -1) as a deliberate product choice, so this grounding no longer
functions as a gate you must pass to reach interactive — instead it is the **reason a static HTML (no-JS)
fallback that carries the core claim is always produced alongside the interactive** (see GATE 2's
non-negotiable invariant). The fallback is a self-contained no-JS HTML document, NOT a separate static
image export — interactive delivery has no standalone PNG/image form. The reach argument doesn't
disappear when interactive wins the channel default; it moves to guaranteeing the fallback.

## GATE 2 — INTERACTIVE: signal + the non-negotiable fallback

On **article-web**, interactive is already the channel default (GATE -1) — it does NOT need to earn its
way in via an AND-gate the way it used to. The three conditions below are no longer a blanket
prerequisite; they are the signal for **how strongly** interactive serves this particular story (weak
signal on all three is a concrete reason to prefer static instead, even though article-web defaults
interactive):

1. the dataset is large/multi-series (>~10 series, or individual-record granularity) so a static chart
   omits data or becomes unreadable;
2. the reader's PERSONAL data point is the hook ("find your postcode/school/country");
3. distribution is web-only (won't be shared to social / printed / emailed where interactivity is lost).

On the **social** channels these conditions are moot — interactive isn't in the allowed set (GATE -1),
so this gate never applies there regardless of signal strength.

**Non-negotiable (the a11y-fallback invariant — GATE 1's grounding made concrete):** whenever interactive
is chosen, the static HTML (no-JS) fallback must carry the core claim WITHOUT interaction — the
interactive layer is additive, never load-bearing (85% never see hover/click state, Archie Tse / NYT,
Malofiej 2016). The fallback ships as one of the interactive delivery's three forms (code source / static
HTML no-JS / hosted embed link) — never as a separate static image export. This is why defaulting
article-web to interactive is safe: the reach guarantee ships either way.

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
  *where things sit relative to each other* is the insight), AND the value is **map-safe** — a normalized
  rate (%, per-capita, index) **or a per-region categorical/temporal attribute (year an event took effect,
  class, rank)**; the guard is specifically against **raw absolute counts**, which just redraw the
  population map — AND the regions are legible (countries/states, not tiny municipal units). A
  **self-location motive** ("find my own area") can also earn a map, but ONLY when that is the piece's
  explicit purpose — NOT merely because the data happens to be per-region (nearly all regional data has a
  weak "find my country" pull; that alone never earns a map).
- **Use a SORTED BAR CHART instead when** the story is "which region is highest/lowest" (ranking) · no
  clear geographic cluster · subtle adjacent differences (colour can't resolve them; bar length can) ·
  few regions (≤~15) · absolute counts not rates · **the units are a hand-picked, NON-CONTIGUOUS set of
  blocs** (a scattered list of countries/regions that don't tile a continuous space — there is no
  adjacency or cluster to perceive, so the spatial-pattern condition cannot hold). **Prose that frames the
  finding as a ranking — "X leads, Y lags", "swings from 27% to 6%", "which country is highest", a
  leaders-vs-laggards spread — is a BAR signal, not a licence for a map; the word "map" in a headline does
  not make the spatial pattern the story.** A ranking framing over non-contiguous blocs is the textbook
  bar case — never a choropleth.
- **Practical test (the TIE-BREAKER):** drop the geographic data into a sorted bar chart. If the story is
  equally/more legible there → use the bar chart. When a geographic dataset could go either way, DEFAULT
  to the bar; maps only earn their spatial overhead when the pattern is genuinely lost without the map
  (a real cluster / spread / diffusion, or a genuine self-location piece).

## Decision ladder (the suggester applies this)

```
CLAIM + DATA
  GATE -1 → channel restricts the allowed-format set FIRST
            social-vertical/social-feed → {static, video} only, NEVER interactive/scrolly
            article-web                → {static, interactive, video, scrolly}, DEFAULT interactive
  GATE 0  → chart family from intent
  GATE 1  → static-first grounding: full gate on social · a11y-fallback baseline on article-web
  GATE 2  → article-web: interactive is already default; these 3 are signal, not an AND-gate
            (large/multi-series + personal-hook + web-only) — static HTML (no-JS) fallback ALWAYS
            ships alongside (never a separate image export)
  GATE 3  → sequential + single-chart 4+ states + long-form + resources?  ALL YES → SCROLLY
  GATE 4  → motion-is-the-encoding OR social/vertical?           YES → VIDEO
  GATE 5  (geo only) spatial pattern IS the story + map-safe value (rate OR categorical/temporal, not raw
          counts) + legible regions?  YES → MAP.  Ranking finding / could-go-either-way → sorted BAR (tie-breaker)
```

Static-first is not conservatism — it is empirically grounded. On the social channels every escalation
(to video) still must buy a specific capability static cannot provide. On article-web, interactive is now
the deliberate channel default rather than an earned escalation — but the same grounding still governs
the non-negotiable static HTML (no-JS) fallback that ships alongside it (as one of the interactive
delivery's three forms, never as a separate image export), so the reach guarantee is never lost. Never
drop the fallback invariant, and never pick interactive on a social channel because "interactive =
sophisticated" — it simply isn't in that channel's allowed set.

## Sources

Archie Tse / NYT via Nieman Lab (Malofiej 2016) · Dominikus Baur "The End of Interactive Visualizations" ·
Datawrapper (explanatory approach; choropleth caveats; "what to consider for choropleth maps") · NN/g
(interaction cost) · The Pudding + ACM ECCE 2023 (scrollytelling) + Robert Kosara / Nightingale (scrolly
caveats) · Observable HQ (effective animation) · Nieman Lab (vertical video 2024) · Storytelling with Data
+ Online Journalism Blog + FT Visual Vocabulary + Penn State GEOG 486 (map vs chart). Full URLs in the
research transcript.
