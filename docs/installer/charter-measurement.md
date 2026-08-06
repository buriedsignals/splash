# What three real newsroom sites yield — before and after

Measures `proposeCharter` (`lib/newsroom/charter.ts`) against the three committed fixtures
(`lib/newsroom/fixtures/sites/`, loaded through `load.ts`) on this branch
(`feat/charter-reads-real-sites`, HEAD `46d8098e`), and against the state immediately before this
chantier's fixes. The three fixture tables below reflect the four extraction fixes
(`58d3add8`, `463e89df`, `0f7a9d89`, `359444d7`); the `oklch()` fix (`46d8098e`) and the rendered
mode (`5761a176`) that landed after are covered in their own sections, since neither existed when
the fixture "before" state was chosen.

## "Before" is not the merge-base — here is why

The task asked for `git worktree add … $(git merge-base main HEAD)` to get the "before" state. That
merge-base is `c8d7d1e6`, and the fixtures do not exist there at all — `lib/newsroom/fixtures/`
was added later, on this same branch, by `a7ed5844` ("three real newsroom sites, captured with
their provenance"). Running the merge-base would not produce a "before" measurement of these
sites; it would produce nothing, because `load.ts` and the `.html`/`.css` files it reads are not on
disk yet.

`a7ed5844` is the commit right after the fixtures land and right before any of the four fixes
begin (`58d3add8`, `463e89df`, `0f7a9d89`, `359444d7`). It is the honest "before": fixtures
present, none of this chantier's code changed yet. Used a worktree at that commit (fresh `bun
install`, no source touched) instead of the merge-base.

```
$ git -C /Users/rmdms/Sites/Professional/splash-charter worktree add /tmp/charter-before a7ed5844
$ git -C /Users/rmdms/Sites/Professional/splash-charter show c8d7d1e6:lib/newsroom/fixtures/sites/load.ts
fatal: le chemin 'lib/newsroom/fixtures/sites/load.ts' existe sur le disque, mais pas dans 'c8d7d1e6'
```

Both trees measured with the same small script — `loadSiteFixture(name)` piped straight into
`proposeCharter`, JSON-printed, no other code — run with `bun run measure.ts` in each worktree.
`bun test lib/newsroom/charter-fixtures.test.ts` on HEAD (`359444d7`) also passes (7/7), which pins
the "after" numbers below against the same fixtures independently of this document.

## heidi-news (`https://www.heidi.news/`)

| | Before (`a7ed5844`) | After (`46d8098e`) |
|---|---|---|
| Colour candidates | `#d5121e` — `theme-color`, score 100, `declared` (1 measurement) | `#d5121e` — `theme-color` + 3 hex stylesheet declarations (`--lt-color-red-500-rgb`, `--lt-color-primary-500-rgb`, `--color-danger-400`) + 4 more via `oklch()` (`--lt-color-red-500: oklch(55.41% .2189 26.74)` and 3 siblings, each converting to the same `#d5121e`), score **101**, `declared` (8 measurements) |
| Typography | none (stylesheet never read) | `Sang Bleu Kingdom` (webfont, from the CDN sheet) |
| Ground | none | none — unchanged |
| Confidence | `declared` | `declared` — unchanged |
| Notes | *"no stylesheet was read — the page may build its styles in JavaScript, in which case nothing here is reliable"* — wrong cause: the CSS was never fetched because the CDN host (`heidi-17455.kxcdn.com`) failed the same-host filter, not because it doesn't exist | *"the site declares colours in color-mix() notation, which is NOT read here — a brand colour expressed only that way was missed"* — narrowed from `color-mix()`+`oklch()` (4 occurrences of `color-mix()` remain in that stylesheet, now the only unread notation) |
| `evidence[].source` | absent (field didn't exist) | every entry names its origin: `https://www.heidi.news/` for the `theme-color`, the CDN href for all 7 stylesheet declarations (hex and oklch alike) |

What did **not** change: the top colour and its hex. What changed, across both fixes: the CDN
stylesheet is now read at all (557 642 bytes unblocked), and the `oklch()` values inside it now
resolve — so the same colour has 8 corroborating declarations instead of 1 (4 hex, 4 oklch), one
webfont appears where none did, the unread-notation note narrowed to `color-mix()` alone, and the
failure note names the right gap instead of blaming JavaScript for a fetch that was never
attempted. **No new colour candidate appeared** — see "What this does not establish" below for
why that is the correct outcome, not a shortfall.

### heidi.news, live (not the fixture) — measured after everything above landed

The fixture is a capture from 2026-08-06; the site itself was measured again, live, once this
chantier's last commit (`46d8098e`) was in place:

```
couleur : #d5121e | confiance: declared | preuves: 8
   - theme-color   <meta name="theme-color" content="#d5121e"/>
   - declared      :root { --lt-color-red-500: oklch(55.41% .2189 26.74) }
   - declared      :root { --lt-color-red-500-rgb: #d5121e }
typo    : Sang Bleu Kingdom
```

Before this chantier, the same live site yielded: **0 stylesheets read**, one colour from the
`<meta>` tag alone, **no typography at all**, and a note blaming JavaScript for a stylesheet that
was never fetched. The live run and the fixture agree — 8 evidence entries, `#d5121e`, `declared`,
`Sang Bleu Kingdom` — which is the fixture's own claim to still being representative, checked
against the real site rather than assumed.

## therecord-media (`https://therecord.media/`)

| | Before (`a7ed5844`) | After (`359444d7`) |
|---|---|---|
| Colour candidates | `#e06b2c` — best signal `link`, score 77, count 26 (12 evidence entries shown, capped) · `#fca532` — `link`, score 76, count 3 | Same two candidates, same scores, same counts — 7 of the 12 shown `#e06b2c` evidence entries flip from `signal: "declared"` to `signal: "recurrent-role"` (weight 60, still under `link`'s 75, so the ranking does not move) |
| Typography | 3 webfonts: `icomoon`, `Inter`, `Inter Fallback` | 2 webfonts: `Inter`, `Inter Fallback` — `icomoon` (an icon font, not a house typeface) is gone |
| Ground | none | none — unchanged |
| Confidence | `inferred` | `inferred` — unchanged |
| Notes | *"the site names no brand colour anywhere…"* | identical sentence — unchanged |
| `evidence[].source` | absent | every entry: `https://therecord.media/_next/static/chunks/3t3yknc51puyw.css` (this site's stylesheet was already same-host, so the filter lift changes nothing here) |

This is the site with no house colour to find (a Next.js app with no `theme-color`, no `--brand`
property, no masthead SVG) — the fixture README calls it "the *or one that carries no brand* half
of the brief's second site", and this measurement confirms that stays true after the fixes: the
extraction still, correctly, finds nothing the site itself labelled as its house colour. The only
visible move here is the `icomoon` fix and the `declared`→`recurrent-role` relabelling, which is
provenance, not a ranking change.

## restofworld-org (`https://restofworld.org/`)

| | Before (`a7ed5844`) | After (`359444d7`) |
|---|---|---|
| Colour candidates | `#242ef7` (`theme-color`, score 101) · `#d231a0` (`brand-property`, score 92) · `#ffbef0` (`accent-property`, score 70) | Identical three candidates, identical scores, identical evidence — byte-for-byte, only `source` added to every entry |
| Typography | 6 entries: `Moderat` (body), `Input Mono` (headings), `Georgia` (headings), `Moderat` (headings), `Moderat` (webfont), `GT Sectra` (webfont) | Identical 6 entries |
| Ground | none | none — unchanged |
| Confidence | `declared` | `declared` — unchanged |
| Notes | none | none — unchanged |
| `evidence[].source` | absent | present: the page URL for the `theme-color` and one `declared` custom property read inline; the theme stylesheet's href for the rest |

Nothing about this site's *measurement* moved. Its stylesheet was already same-host, so the filter
lift is a no-op here, and no candidate in this fixture repeats often enough on
`RECURRENT_ROLE_PROPERTIES` to trigger the new signal. The only diff is the `source` field landing
on every evidence entry — visible, but not a behaviour change for this particular site.

## What this chantier does not establish

- **The fixtures are a dated capture**, not a live probe. Per
  `lib/newsroom/fixtures/sites/README.md`, everything under `fixtures/sites/` was fetched by hand
  once, on 2026-08-06, and the test suite reads those files from disk, never the network. A site
  can change its markup, its CDN, or its CSS tomorrow, and this measurement — before or after —
  would not know.

- **`color-mix()` is still unread.** `oklch()` moved from unread to read this chantier; `color-mix()`
  did not — it is a computation over other colours rather than a colour notation on its own, and
  was deliberately left alone. On heidi.news's CDN stylesheet it accounts for the 4 occurrences
  that remain in `notes` after this chantier's fixes. A brand colour expressed only that way would
  still be missed.

- **The rendered (browser) mode is exercised by hand, not by the suite.** `charter-render.ts`
  (`5761a176`) opens the page with an injectable launch, reads `document.styleSheets` where
  readable, and falls back to computed styles of link/control/masthead/ground elements
  synthesized as real CSS declarations when it cannot. `/charter` offers it as a second attempt —
  `mode: "static" | "rendered"`, `"static"` by default — surfaced by the page only once the static
  read finds nothing, in both languages, never triggered automatically. Its 14 tests all substitute
  an injected `launch`; **no browser opens in `bun test`**, by design (a real Playwright download
  does not belong between a contributor and a green suite).

  That leaves the browser path itself unproven by anything the suite runs. Run by hand, once,
  against a live site:

  ```
  renderSiteSources("https://therecord.media") → 4.3s, 1 sheet read
  colours: #e06b2c [recurrent-role], #fca532 [link]
  typography: Inter, Inter Fallback
  ```

  Same yield as the static path on that site — its CSS is same-origin and readable statically, so
  there was nothing extra for the browser to find. What this run proves is narrower than "renders
  better": it proves **the browser path executes end to end** against a real site (navigation,
  settle, stylesheet read, teardown), not that it yields more than the static path does. The case
  it is meant for — a site whose styles exist only after client-side JavaScript runs, with no
  static declaration at all — was not one of the three fixtures and was not run by hand here.

  Its named, accepted limit: once the page is open, it is a real browser executing the page's own
  JavaScript, and that script can issue outbound requests — a fetch, an image load, a redirect —
  to addresses this module does not vet. The static path checks every stylesheet href against a
  same-host/forbidden-host list before fetching it; the rendered path has no equivalent, because a
  rendered page's outbound traffic is not a list of hrefs read in advance, it is arbitrary code
  running inside Chromium. The entry address itself is vetted exactly like the static path
  (`normalizeSiteUrl`, the same function); what happens after the page opens is not.

- **The honest headline: on heidi.news, no new colour was found, because there was none to
  find.** Across this whole chantier's colour work on that site — same-host CDN fix, then
  `oklch()` — the extraction never surfaced a second candidate. What changed is how well-supported
  the one candidate it already had is: the extraction now corroborates `#d5121e` through three
  independent declarations rather than one (a `<meta name="theme-color">` tag, a `declared`
  `oklch()` custom property, a `declared` hex custom property — the live proof above shows exactly
  this), not through a second colour appearing. The implementer looked at lowering
  `RECURRENT_ROLE_MIN_COUNT` (currently 3) to manufacture a second candidate on heidi.news, and
  refused: the only colour it would have surfaced is `#569ff7`, traced to a bundled flatpickr
  date-picker default, not anything the newsroom declared. Lowering the floor to 2 would also have
  overturned a locked regression test — bbc.com's `#e00000`, which repeats on exactly two
  brand-carrying declarations and is the project's own worked example of "not evidence of
  anything… ask the question" (`charter.ts`, `RECURRENT_ROLE_MIN_COUNT` comment). heidi.news's
  reported colour, `#d5121e`, is exactly the palette entry already in heidi.news's own
  `NEWSROOM-PROFILE.md`. The extraction is right, not thin — corroborated, not padded.

## Commands run

```bash
git -C /Users/rmdms/Sites/Professional/splash-charter worktree add /tmp/charter-before a7ed5844
cd /tmp/charter-before && bun install
# measure.ts: loadSiteFixture(name) -> proposeCharter(sources) -> JSON.stringify, for all three sites
bun run measure.ts   # "before"
cd /Users/rmdms/Sites/Professional/splash-charter && bun run measure.ts   # "after"
bun test lib/newsroom/charter-fixtures.test.ts   # 7 pass, 0 fail — pins the "after" numbers independently
```

`measure.ts` was a scratch file, run and deleted from the working tree in both locations — it is
not part of this commit.
