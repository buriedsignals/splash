# What real newsrooms actually declare (and don't)

Learned running this skill against four real, live newsrooms — heidi.news, lemonde.fr,
theguardian.com, nzz.ch — not reasoned out from CSS specs in the abstract. Each finding below is
attached to which site produced it, because the pattern only earns a place here if a real site
demonstrated it.

## `theme-color` is the one reliably single-valued signal — when it exists at all

Three of the four sites (heidi.news, lemonde.fr, theguardian.com) declare
`<meta name="theme-color" content="#…">`. It's a single, unambiguous value a browser actually
uses (mobile Chrome/Safari colour the address bar with it), which is exactly why it's the highest-
confidence brand-colour signal this skill reads. But "declared" and "the newsroom's considered
house accent" are not the same claim:

- **heidi.news** declares `#d5121e` (a red) via `theme-color`. Heidi's own confirmed
  `NEWSROOM.example.md` — the file this whole project treats as the canonical shape — carries
  `brandColor: "#0B7A75"` (a teal), chosen by the newsroom itself. The two are simply different
  colours. `theme-color` is CMS-level default chrome tinting, not necessarily a considered brand
  decision, and a newsroom can absolutely have picked one colour for mobile browser chrome and a
  different one for its actual visual identity. This is the concrete case for rule 1 (show the
  evidence, don't just state the number): a journalist reading "brandColor: #d5121e — read from
  `<meta name="theme-color" …>`" can immediately say "no, that's not us" — a journalist reading
  bare `brandColor: #d5121e` has no way to know it's worth questioning.
- **lemonde.fr** declares `#ffffff` — plain white — via `theme-color`. A real declaration, but
  a neutral one carries almost no information about a brand identity; `isNeutralHex` exists so
  this skill can at least prefer a non-neutral candidate when more than one exists, but when
  white/black is the *only* `theme-color` present (lemonde.fr's real case), that's what gets
  reported — with its evidence, so a journalist sees plainly that the "signal" is just white and
  can supply a real answer.
- **theguardian.com** declares `#052962` — a distinct, deliberate navy that reads exactly like a
  real design decision, and does show up throughout the Guardian's own font/colour system as the
  UI's dominant tone. The strongest of the four real cases.
- **nzz.ch** declares **no `theme-color` at all**. Only `msapplication-TileColor` (an IE/Windows
  tile-pinning meta, unrelated to a "brand colour" in any browser-facing sense) — this skill does
  not read it, correctly, and nzz.ch is the one of the four sites where `brandColor` legitimately
  resolves to `null`.

## A design system's `:root` block is not a short list of brand tokens

heidi.news's own stylesheet, fetched and read in full, declares colour-valued custom properties
including `--card-warning-border-color`, half a dozen `--color-danger-*` steps, and a full
`--color-grey-*` ramp — real hex values, every one of them, none of them the brand colour. A
`:root` block on a real production newsroom site is the whole design system's token table, not a
curated three-item palette. This is why this skill's fallback path (used only when no
`theme-color` meta exists) narrows to custom-property NAMES containing `brand`/`primary`/`accent`
— and even then treats a hit as a lower-confidence candidate, always shipped with its full
declaration as evidence rather than presented with the same confidence as a `theme-color` match.

## A page's default background is often genuinely not declared as a literal hex anywhere fetchable

Of the four sites, only theguardian.com has a plain `body { background: #FFFFFF }` rule sitting in
a stylesheet this skill actually fetches. The other three do not — not because their pages aren't
white or off-white in a browser, but because:

- the true default may come from a browser's own UA stylesheet (no author rule needed to get white
  at all) plus a component-level design system with no single top-level "the ground" declaration;
- what looks like a candidate is actually scoped to something else entirely — lemonde.fr's only
  fetched background rule is `html.short-video,html.short-video body { background: #000 }`, a
  video-player mode's override, not the newsroom's own page background; nzz.ch's only comparable
  rule is scoped to `body.dark .market-iframe`, a financial-data widget's dark variant.

This skill refuses to guess in either case (see `references/extraction-traps.md` for the specific
selector-qualification rule that enforces it) and reports `ground: null` for three of the four real
sites tested. **That is the expected, correct outcome for most real newsrooms**, not a gap in the
extraction — a plain white page frequently has no single fetchable line of CSS that says so.

## Font stacks are declared everywhere, in volume, and the noise self-resolves by frequency

Every site tested declares dozens of `font-family:` rules — one per heading level, per UI
component, per state. Picking "the house typeface" out of that is not about finding the one
correct declaration; it's about the fact that the ACTUAL house typeface is declared far more often
than a one-off embed's font, so ranking candidates by how many distinct rules cite them (not
picking the first one seen) reliably surfaces the real answer:

- theguardian.com: `GuardianTextSans` and `GH Guardian Headline` — both genuinely load-bearing,
  named exactly as the Guardian's own public design-system documentation names them.
- lemonde.fr: `Marr Sans` and `Marr Sans Medium` — Le Monde's real licensed display typeface,
  visible directly in its stylesheet's own `font-family` declarations.
- heidi.news: `Sang Bleu Kingdom` — a real display face — surfaces alongside a `var(--lt-font-
  sans,Roboto)!important` declaration that resolves to nothing usable at all (see
  `references/extraction-traps.md`); the working extractor reports only the one it can actually
  resolve.
- nzz.ch: `Arial` outranks `nzz-sans-serif` by declaration count in the two stylesheets this skill
  fetches — a case where the numerically-dominant answer is a fallback face, not NZZ's actual
  branded typeface (`NZZ Sans`, visible only as an unresolved `--nzz-font-sans` custom property in
  the same file). Worth naming plainly: frequency-ranking is a heuristic, and this is the one real
  case among four where it produced the less-interesting of two real candidates. The evidence line
  still shows exactly what was counted, so a journalist correcting `typefaces: "Arial, nzz-sans-
  serif"` to `"NZZ Sans"` has the receipt for why the tool got it wrong.

## What this skill deliberately does not attempt

- **No colour-name table.** A `theme-color` or background declared as `black`/`white`/`crimson`
  rather than a hex is skipped, not resolved through a CSS-colour-keyword table. Every real
  declaration observed across the four sites tested was already hex; adding a keyword table is a
  small, contained addition if a future site needs it, deferred until one actually does.
- **No `@media`/`@container` awareness.** The block scanner in `extract.mjs` does not track
  whether a `{ }` block sits inside a media query, so a rule that's genuinely conditional (a dark-
  mode variant, a print stylesheet, a narrow-viewport override) is read exactly the same as an
  unconditional one — its evidence is shown verbatim, selector and all, so a journalist can
  recognise `@media (prefers-color-scheme: dark)` context is missing from the citation and correct
  accordingly, but the extractor itself cannot make that distinction.
- **No JS-rendered styling.** Everything read here comes from the served HTML document and the
  stylesheets it links — nothing injected by client-side JavaScript after the page loads is ever
  seen, because nothing here renders the page. A site whose actual brand colour is applied purely
  by a JS framework at runtime, with no server-rendered trace, is indistinguishable from a site
  that declares nothing at all — and correctly falls under rule 3.
