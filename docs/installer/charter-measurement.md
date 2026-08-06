# What three real newsroom sites yield — before and after

Measures `proposeCharter` (`lib/newsroom/charter.ts`) against the three committed fixtures
(`lib/newsroom/fixtures/sites/`, loaded through `load.ts`) on this branch
(`feat/charter-reads-real-sites`), and against the state immediately before this chantier's fixes.

**Every "after" number below was re-measured at the final review (2026-08-06), on the branch as it
then stood** — the first draft of this document pinned an "after" SHA that the branch had already
moved past, and one of its figures was wrong (see the therecord section). The commits named below
are the ones that CAUSED each change: they are points in this branch's history, and stay true
whatever the tip is. The "after" columns are the branch, not any one of them.

The three fixture tables reflect the four extraction fixes (`58d3add8`, `463e89df`, `0f7a9d89`,
`359444d7`); the `oklch()` fix (`46d8098e`) and the rendered mode (`5761a176`) that landed after
are covered in their own sections, since neither existed when the fixture "before" state was
chosen.

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
`bun test lib/newsroom/charter-fixtures.test.ts` also passes on the branch, which pins the "after"
numbers below against the same fixtures independently of this document.

## heidi-news (`https://www.heidi.news/`)

| | Before (`a7ed5844`) | After (this branch) |
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

The fixture is a capture from 2026-08-06; the site itself was measured again, live, once the
`oklch()` fix (`46d8098e`) was in place, and once more at the final review — same numbers both
times:

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

| | Before (`a7ed5844`) | After (this branch) |
|---|---|---|
| Colour candidates | `#e06b2c` — best signal `link`, score 77, count 26 (12 evidence entries shown, capped); those 12 are `declared` ×9, `link` ×3 · `#fca532` — `link`, score 76, count 3 | Same two candidates, same scores, same counts. The 12 shown `#e06b2c` entries are the SAME 12 declarations, in the same order, re-labelled: `recurrent-role` ×8, `declared` ×1, `link` ×3 (`recurrent-role` weighs 60, still under `link`'s 75, so the ranking does not move). `#fca532`'s 3 entries are unchanged |
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

**"Re-labelled" is a claim about the same rows, and it was checked as one.** `evidence` is capped
at `EVIDENCE_CAP` (12), and the twelfth slot is not stable in general: `rank()` REPLACES it
whenever a later measurement outweighs everything already collected
(`b.evidence[EVIDENCE_CAP - 1] = m`), so two runs can show twelve entries that are not the same
twelve. That is why this row cannot be read as a relabel just because both sides say "12". It was
verified by comparing the two runs entry by entry: **12 of 12 tokens identical at the same index,
8 of them re-signalled** `declared` → `recurrent-role`. The cap-slot replacement never fires for
this colour — no measurement of `#e06b2c` on this site outweighs `link` (75), which the very first
run already holds — so the sample is stable here, and only here for that reason.

The first draft of this document said "7 of the 12 … flip", with no such check behind it. The
number was wrong (it is 8) and, more to the point, the framing was unearned: the document said
"flip" where it had only counted. Both are fixed above.

## restofworld-org (`https://restofworld.org/`)

| | Before (`a7ed5844`) | After (this branch) |
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

  That leaves the browser path itself unproven by anything the suite runs. Run by hand against a
  live site, both paths in the same process, one after the other (re-run at the final review):

  ```
  STATIC   therecord.media — 0.5s, 2 sheet(s) read (69 140 chars + 1 char)
    #e06b2c score=77 count=26 signals=[recurrent-role/declared/link]
    #fca532 score=76 count=3  signals=[link/declared]
    typography: Inter (webfont), Inter Fallback (webfont) — confidence: inferred

  RENDERED therecord.media — 4.7s, 1 sheet read (80 186 chars)
    #e06b2c score=77 count=26 signals=[recurrent-role/declared/link]
    #fca532 score=76 count=3  signals=[link/declared]
    typography: Inter (webfont), Inter Fallback (webfont) — confidence: inferred
  ```

  Same yield as the static path on that site — same candidates, same scores, same counts, same
  typography, same `inferred` — which is what should happen: its CSS is same-origin and readable
  statically, so there was nothing extra for the browser to find. The two runs do not read the
  same BYTES (the browser hands back the CSSOM's serialisation of the sheet, 80 186 chars against
  the 69 140 the plain fetch gets, and it drops the near-empty second sheet); they arrive at the
  same proposal anyway.

  The first draft of this section printed one signal per colour — `#e06b2c [recurrent-role]` —
  where the fixture table above names that colour's best signal, `link`. Those were never
  different findings, only the first evidence entry versus the highest-weighted one, but the
  document contradicted itself in print, so it now shows the whole signal set on both sides.

  What this run proves is narrower than "renders better": it proves **the browser path executes
  end to end** against a real site (navigation, settle, stylesheet read, teardown), not that it
  yields more than the static path does. The case it is meant for — a site whose styles exist only
  after client-side JavaScript runs, with no static declaration at all — was not one of the three
  fixtures and was not run by hand here.

  Its named, accepted limits, in the order a request travels. **The entry address** is vetted
  exactly like the static path (`normalizeSiteUrl`, the same function). **The address the browser
  landed on** is vetted too, before a byte of the page is read — but only *after* `goto` resolved,
  so Chromium has already dialled every hop of the redirect chain. That closes the read, not the
  request: a pasted redirector that bounces onto `http://192.168.1.1/reboot?confirm=1` still causes
  that GET, where the static path refuses it before sending (`redirect: "manual"`, every hop vetted
  in advance). **Once the page is open**, it is a real browser executing the page's own JavaScript,
  and that script can issue outbound requests — a fetch, an image load, a redirect — to addresses
  this module does not vet at all, because a rendered page's outbound traffic is not a list of
  hrefs read in advance, it is arbitrary code running inside Chromium.

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

The first pass (fixtures, before/after):

```bash
git -C /Users/rmdms/Sites/Professional/splash-charter worktree add /tmp/charter-before a7ed5844
cd /tmp/charter-before && bun install
# measure.ts: loadSiteFixture(name) -> proposeCharter(sources) -> JSON.stringify, for all three sites
bun run measure.ts   # "before"
cd /Users/rmdms/Sites/Professional/splash-charter && bun run measure.ts   # "after"
bun test lib/newsroom/charter-fixtures.test.ts   # 7 pass, 0 fail — pins the "after" numbers independently
```

The final review, re-measuring the two figures this document had wrong (the therecord relabel and
the rendered run). No worktree this time: the "before" `charter.ts` and `charter-fetch.ts` were
checked out into the tree as scratch modules (`git show a7ed5844:…`), imported alongside today's,
and both fed the SAME fixture sources in one process — which is what makes the entry-by-entry
token comparison meaningful rather than two runs compared by eye.

```bash
# before and after in one process: 12/12 tokens identical at the same index, 8 re-signalled
git show a7ed5844:lib/newsroom/charter.ts       > lib/newsroom/zz-charter-before.ts
git show a7ed5844:lib/newsroom/charter-fetch.ts > lib/newsroom/zz-charter-fetch-before.ts
bun /tmp/measure-tokens.ts
rm lib/newsroom/zz-charter-before.ts lib/newsroom/zz-charter-fetch-before.ts

# the live probe: collectSiteSources then renderSiteSources, same process, same site
bun /tmp/live-probe.ts            # therecord.media — the transcript in the rendered section above
bun /tmp/live-heidi.ts            # heidi.news — still #d5121e, 8 evidence, Sang Bleu Kingdom

bun test install docs/installer   # 293 pass, 0 fail
cd install && bunx tsc --noEmit   # clean
```

Every script above was a scratch file outside the repo (or removed from it, for the two `zz-`
modules); none is part of any commit.

**The gate.** `bun run check` was run on this branch at `93e37a07` — after the whole chantier had
landed and after a `lib` typecheck fix, and BEFORE this final review round of fixes: **23/23
checks passed** (exit 0). That is the number this branch has been measured at; it was not
re-measured by this document's own commits, and is re-run at the end of the review round rather
than assumed forward.

One condition worth recording, because it costs an hour to rediscover: the gate needs
`VITE_MAPTILER_KEY` in `.env`. Without it, `skills/scrolly` and `skills/image-native` go red at
IMPORT time — `ScrollyMap.tsx` throws "VITE_MAPTILER_KEY missing" during module init, which
cascades into "Cannot access 'Scrolly' before initialization". That is a missing key, not a code
defect, and the 23/23 above was measured with the key linked in.
