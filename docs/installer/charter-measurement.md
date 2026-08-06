# What three real newsroom sites yield — before and after

Measures `proposeCharter` (`lib/newsroom/charter.ts`) against the three committed fixtures
(`lib/newsroom/fixtures/sites/`, loaded through `load.ts`) on this branch
(`feat/charter-reads-real-sites`, `359444d7`), and against the state immediately before this
chantier's four fixes.

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

| | Before (`a7ed5844`) | After (`359444d7`) |
|---|---|---|
| Colour candidates | `#d5121e` — `theme-color`, score 100, `declared` (1 measurement) | `#d5121e` — `theme-color` + 3 stylesheet declarations (`--lt-color-red-500-rgb`, `--lt-color-primary-500-rgb`, `--color-danger-400`), score **101**, `declared` (4 measurements) |
| Typography | none (stylesheet never read) | `Sang Bleu Kingdom` (webfont, from the CDN sheet) |
| Ground | none | none — unchanged |
| Confidence | `declared` | `declared` — unchanged |
| Notes | *"no stylesheet was read — the page may build its styles in JavaScript, in which case nothing here is reliable"* — wrong cause: the CSS was never fetched because the CDN host (`heidi-17455.kxcdn.com`) failed the same-host filter, not because it doesn't exist | *"the site declares colours in color-mix/oklch() notation, which is NOT read here — a brand colour expressed only that way was missed"* — a real, honest gap, and the JS-blame sentence is gone because the stylesheet now IS read |
| `evidence[].source` | absent (field didn't exist) | every entry names its origin: `https://www.heidi.news/` for the `theme-color`, the CDN href for the three stylesheet declarations |

What did **not** change: the top colour and its hex. What changed: the CDN stylesheet is now
read at all (557 642 bytes unblocked), which is why the same colour now has 3 corroborating
declarations instead of 1, one webfont appears where none did, and the failure note names the
right gap instead of blaming JavaScript for a fetch that was never attempted. **No new colour
candidate appeared** — see "What this does not establish" below for why that is the correct
outcome, not a shortfall.

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

- **heidi.news getting zero new colour candidates is the honest outcome, not a shortfall.** The
  implementer looked at lowering `RECURRENT_ROLE_MIN_COUNT` (currently 3) to see whether that
  would surface a second candidate on heidi.news, and refused: the only colour it would have
  surfaced there is `#569ff7`, traced to a bundled flatpickr date-picker default, not anything the
  newsroom declared. Lowering the floor to 2 would also have overturned a locked regression test —
  bbc.com's `#e00000`, which repeats on exactly two brand-carrying declarations and is the project's
  own worked example of "not evidence of anything… ask the question" (`charter.ts`,
  `RECURRENT_ROLE_MIN_COUNT` comment). heidi.news's single reported colour, `#d5121e` — read from
  `<meta name="theme-color">` — is exactly the palette entry already in heidi.news's own
  `NEWSROOM-PROFILE.md`. The extraction is right, not thin.

- **The rendered (browser) mode is not exercised here.** This measurement, and the test suite it
  mirrors, both read HTML and CSS as static text — the same thing `collectSiteSources` fetches
  today. A site that builds its presentation in JavaScript with no static declaration
  (`therecord-media` is close to this case, though its CSS module still ships static hex values) is
  the case the spec's rendered-mode plan targets. That mode is being written in the files this
  measurement was kept away from (`lib/newsroom/charter-render.ts`,
  `install/preflight/server.ts`/`client.ts`/`copy.ts`) while this document was produced, in
  parallel, on the same branch.

  **Placeholder — rendered mode, to be measured by hand once landed:**

  > *(not yet measurable — the browser-rendered path did not exist when this document was written.
  > When it lands, run the same three fixtures — or, better, the live sites, since rendered mode's
  > whole point is reading what a static fetch cannot — through it and fill in this section with
  > the same before/after shape as above.)*

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
