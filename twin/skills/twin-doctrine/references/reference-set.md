# Reference set

Real, examined treatments of a named argument structure, each reduced to a **transferable
information-design lesson** — never a styling description. This is what the reference loop
(`twin-storyboard`'s movement ④) shows a journalist: not "here is a chart that looks nice," but
"here is how a real newsroom sequenced this exact kind of evidence, and here is the rule you can
lift out of it and apply to your own data." Copying the rule, not the surface, is the whole
point — see `anti-patterns.md`'s closing entry.

**Four rows, not six.** This file has twice shipped more rows than could be honestly defended, and
been cut back both times on review. The floor `checkReferenceSet` currently enforces
(`test/reference-set.test.ts`, at least six rows) is **not met by this file as of this version** —
see the note at the end of this preamble. Four true rows that survived being looked at, read
around, and checked against `editorial-standard.md` and `anti-patterns.md` are worth more than six
where two are stretched, because the entire purpose of this file is that a model can trust it.

**What "verified" means here, precisely, after three rounds of getting it wrong in three different
ways:** round 1 verified metadata (`og:title`, `datePublished`) and never looked at a pixel; round
2 downloaded and looked at images and video frames, but described things the artifact itself did
not show (a chart's actual colours, a simulation's actual mechanism, a locator that pointed at the
wrong element); round 3's own submission looked at the right pixels but never read the caption two
lines away from them — one row turned out to be a design mockup captioned, in the article's own
words, "placeholder data and annotations," and another's lesson asserted a mechanic (two lines
crossing back and forth across dated elections) that the cropped promotional card it was verified
against cannot actually show (no year labels, one crossing, no legend). Both are removed here.
**The rule going forward**: look at the actual pixels, AND read whatever text sits next to them —
a `<figcaption>`, a byline, a credit line, the surrounding paragraph — before writing a lesson.

**Two different kinds of "looked at" are mixed in the table below, and each row says which:**

- **Extracted video frame** (rows 3–4): the actual published artifact, at the actual cited
  timecode, pulled with `yt-dlp` + `ffmpeg` and read directly. This is the strongest form of
  verification in this file.
- **The piece's own social-preview image** (rows 1–2): what `og:image`/`twitter:image` serves is a
  `<meta>` tag reference, not a `<figure>` embedded in the article body — there is no separate
  caption to have missed for these two specific assets (confirmed by re-checking the surrounding
  markup: both are bare `<meta>` tags, with no `<figcaption>` anywhere near them). This is real,
  newsroom-produced content — NYT's and the Post's own CDNs serve it, it is what the piece looks
  like when shared — but it is a simplified, cropped derivative of the interactive page, not the
  page itself. The lesson for each row describes only what is visible in that specific derivative.

**Owed, on the record**: the static bar (at least half the set genuinely static) is not met by
this file — 1 of 4 rows (row 1, a still image) is unambiguously static; row 2 is motion; rows 3–4
are video. A genuinely published, in-article static `<img>` — not a promo card, not a design
mockup — with a real, non-placeholder caption has not yet been found and verified. See
`SKILL.md`'s Files section for the same statement in the skill's own voice.

| Reference | Moment | Transferable lesson |
| --- | ---: | --- |
| The New York Times, The Upshot — [Extensive Data Shows Punishing Reach of Racism for Black Boys](https://www.nytimes.com/interactive/2018/03/19/upshot/race-class-white-and-black-men.html) (19 March 2018) | the piece's own social-preview image (`race-class-white-and-black-men-promo-facebookJumbo.png`, a `<meta>` asset — no separate in-article caption exists for it) | Individual dot-marks — one per child in the underlying study, each carrying its own small coloured swatch — flow from a single "Grew up rich" band into five adult-outcome bands, and the finding is set directly on the graphic as its own sentence: "Most white boys ▪ raised in wealthy families will stay rich or upper middle class as adults, but black boys ▪ raised in similarly rich households will not," each group identified by its swatch rather than a colour named in the sentence itself. The annotation states the claim outright while the individual dots keep the honest texture of exceptions — a reader can see both the rule and that it is not universal. |
| Harry Stevens — The Washington Post — ["These simulations show how to flatten the coronavirus growth curve"](https://web.archive.org/web/2020/https://www.washingtonpost.com/graphics/2020/world/corona-simulator/) (14 March 2020) | the piece's own social-preview image (`promo2-coronavirus-simulator-0313.jpg`, a `<meta>` asset — no separate in-article caption exists for it), showing the four labelled result panels — Free-for-all, Attempted quarantine, Moderate distancing, Extensive distancing — on one shared scale | Each of the four simulations is its own random, reader-triggered run — the piece says so directly, in its own body text: "The four simulations you just watched … were random. That means the results of each one were unique to your reading of this article." Yet all four still converge on the same qualitative shape, a visibly lower and longer infection curve as distancing increases. Demonstrating a pattern through many honestly-random instances, instead of asserting it from one staged run, is what makes the evidence convincing rather than cherry-picked. |
| The New York Times Visual Investigations — [How the Police Killed Breonna Taylor](https://www.youtube.com/watch?v=lDaNU7yDnsc) (2020) | 4:20 | The video renders the scene as one fixed, grey 3D model — the same breezeway, officers rendered as ghosted grey figures — and layers each account into that unchanging space rather than cutting to a different depiction per witness; the camera moves around the model over the course of the sequence, but the model itself never changes. Contradictory testimony accumulates inside a shared frame instead of asking the viewer to hold each version separately in their head. |
| Vox — [The conflict in Kashmir, explained](https://www.youtube.com/watch?v=cyayif_nla8) (2019) | 3:55 | The map cuts to a dotted line tracing the outline of the disputed, hatched-orange territory against the green backdrop around it — appearing a few seconds after (not immediately after: one intervening archival photograph plays first) the archival UN Security Council footage — timed to land while the narration is still naming the 1949 ceasefire that fixed that boundary. Geography arrives paired with the specific historical moment that produced it, instead of being shown whole up front and explained afterward. |
