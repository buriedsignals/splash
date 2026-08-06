# Reference set

Real, examined treatments of a named argument structure, each reduced to a **transferable
information-design lesson** — never a styling description. This is what the reference loop
(`twin-storyboard`'s movement ④) shows a journalist: not "here is a chart that looks nice," but
"here is how a real newsroom sequenced this exact kind of evidence, and here is the rule you can
lift out of it and apply to your own data." Copying the rule, not the surface, is the whole
point — see `anti-patterns.md`'s closing entry.

**Every row below is a published, standalone, evidence-led newsroom graphic — six different
outlets, no presenter, no slide.** Nothing here is narrated over a stage deck: the two video rows
are produced newsroom pieces (their narration is part of the published artifact itself, not a
conference talk), and the other four are static or motion graphics with no presenter at all.

**Metadata is not enough — every row was verified by looking directly at the actual pixels, not
by reading `og:title`, a caption, or a caption track alone.** For the four static/motion rows, the
image actually shown was downloaded and inspected. For the two video rows, the exact cited frame
was extracted with `ffmpeg` and inspected. The lesson for each row describes only what was
directly seen, not what a headline or a secondary source claimed was there — an earlier draft of
this file shipped three rows whose lessons were contradicted by their own artifact once actually
looked at (a chart with eight categorical colours cited as an example of "one accent against
grey"; a sequential, randomized simulation cited as "four panels under one shared clock"; a
locator that pointed at empty, client-rendered markup with a quoted sentence that in fact belonged
to a different chart four thousand characters away) — all three are corrected or replaced below.

The **Moment** column is a locator, not necessarily a timecode: a published static or motion
graphic has no timecode, so its locator is the thing that actually identifies where in the piece
the graphic sits — here, the image file embedded in the article, or the labelled panel within it.
The two video rows carry a real timecode instead, each independently confirmed against an actual
extracted frame, not just a caption track.

| Reference | Moment | Transferable lesson |
| --- | ---: | --- |
| FiveThirtyEight (ABC News) — [How We Designed The Look Of Our 2020 Forecast](https://web.archive.org/web/20210104235440/https://fivethirtyeight.com/features/how-we-designed-the-look-of-our-2020-forecast/) (13 August 2020) | the embedded image `cards-desktop-1.png`, its foreground card "The winding path to 270 electoral votes" | The 270-vote threshold is drawn as a physical line straight through the ribbon of states, not just marked on an axis — states are ordered by how favourable they are to each candidate (snaking end to end) AND sized by their electoral-vote weight, so rank and magnitude are both encoded by the same shape, in the same glance, with no separate axis for either. |
| The New York Times, The Upshot — [Extensive Data Shows Punishing Reach of Racism for Black Boys](https://www.nytimes.com/interactive/2018/03/19/upshot/race-class-white-and-black-men.html) (19 March 2018) | the article's own promotional rendering of its opening chart (`race-class-white-and-black-men-promo-facebookJumbo.png`) | Individual dot-marks — one per child in the underlying study, coloured by race — flow from a single "Grew up rich" band into five adult-outcome bands, and the finding is set directly on the graphic as its own sentence: "Most white boys[orange] raised in wealthy families will stay rich or upper middle class as adults, but black boys[blue] raised in similarly rich households will not." The annotation states the claim outright while the individual dots keep the honest texture of exceptions — a reader can see both the rule and that it is not universal. |
| Reuters Graphics — [Behind the Battleground States](https://www.reuters.com/graphics/USA-ELECTION/SWING-STATES/myvmadqlzvr/) (24 September 2024) | the piece's own preview image (`reuters-graphics.jpg`), its small-multiples panel of state-by-state margin history (Michigan, Nevada, Pennsylvania, Wisconsin) | Every state gets an identically-shaped step-chart panel — two coloured lines crossing back and forth to trace which party led in each past election. Once a reader has learned to read Michigan's panel, Wisconsin's and Pennsylvania's cost nothing extra, because the shape-to-meaning mapping never changes between panels — small multiples make comparison the default reading rather than a task the reader has to set up for themselves each time. |
| Harry Stevens — The Washington Post — ["These simulations show how to flatten the coronavirus growth curve"](https://web.archive.org/web/2020/https://www.washingtonpost.com/graphics/2020/world/corona-simulator/) (14 March 2020) | the four labelled result panels — Free-for-all, Attempted quarantine, Moderate distancing, Extensive distancing — drawn on one shared scale | Each of the four simulations is its own random, reader-triggered run — the piece says so directly: "The four simulations you just watched … were random. That means the results of each one were unique to your reading of this article." Yet all four still converge on the same qualitative shape, a visibly lower and longer infection curve as distancing increases. Demonstrating a pattern through many honestly-random instances, instead of asserting it from one staged run, is what makes the evidence convincing rather than cherry-picked. |
| The New York Times Visual Investigations — [How the Police Killed Breonna Taylor](https://www.youtube.com/watch?v=lDaNU7yDnsc) (2020) | 4:20 | The video renders the scene as one fixed, grey 3D model — the same breezeway, the same two doors, officers rendered as ghosted grey figures — and layers each account into that unchanging space rather than cutting to a different depiction per witness. Contradictory testimony accumulates inside a shared frame instead of asking the viewer to hold each version separately in their head. |
| Vox — [The conflict in Kashmir, explained](https://www.youtube.com/watch?v=cyayif_nla8) (2019) | 3:55 | The map cuts to the disputed boundary — a dotted line separating a green region from an orange one — right as the narration names the 1949 ceasefire that created it, immediately after archival footage of the UN session that brokered it. Geography arrives paired with the specific historical moment that produced it, instead of being shown whole up front and explained afterward. |
