# Beat — half of this map's people live in 5 of its 42 countries

**Type:** dot density. **Medium/genre:** map / **video** — the second genre for this type, beside
the static beat (`proof/mapmore-dot-population`), which until now was the only one.
`render/dot-density.mp4`, 1080 × 1440, 30 fps, **380 frames = 12.67 s**, over a 936 × 827 baked
plate frozen in `plate/`.

## Why this type earns a video, in one sentence

**The static beat states the arithmetic in a sentence and asks the reader to take it on trust; this
one makes the reader watch it happen.** The countries arrive largest first, each given exactly the
same slice of the clock, and a meter under the map reads the share of the map's population drawn:
the bar is past its half-way line at the fifth country of forty-two — one eighth of the way through
the reveal — and the remaining seven eighths add less than the first eighth did. Order is the
property colour cannot encode and motion can, and concentration is a claim about order.

Every frame of the reveal differs from the last in the two things the argument is made of: how much
of the map is filled and where the bar has got to. Nothing here is a fade over a finished picture.

## Claim

More than half the population on this map lives in **5** of its **42** countries — **Germany, the
United Kingdom, France, Italy and Spain**, holding **327,522,303 of 596,770,599 people, 54.9%**.
**Four is not enough: the leading four hold 46.8%.** Five is therefore the smallest set that clears
half, which is what makes the title's "5 of its 42" mean anything.

Neither half is typed. `render.mjs` sorts the frozen file, walks the ranking until the running share
passes 0.5, and takes THAT count — then throws if the leading `k` do not clear half, and throws
again if the leading `k − 1` already do. The number 5 appears nowhere in this beat's source.

## Data

- Source: World Bank Open Data, indicator `SP.POP.TOTL` (population, total), 2023.
- `population-europe-2023.csv`: **42 rows**, copied here from the static sibling so this beat's
  render resolves every input inside its own directory.
- `countries.geojson`: the matching shapes. The join is asserted total in BOTH directions — no shape
  without a population, no population without a shape — with one alias, Kosovo (`KOS` in Natural
  Earth, `XKX` at the World Bank).
- Russia is deliberately absent: its figure covers a country almost entirely outside this frame.
  Seven micro-territories with no independent World Bank figure (Åland, Guernsey, Isle of Man,
  Jersey, Monaco, San Marino, Vatican City) are likewise absent. Both exclusions are on the frame.

## Exact values — printed by `render.mjs` on every run, from the frozen CSV and this plate

| Rank | Country | Population | Running share |
| --- | --- | --- | --- |
| 1 | Germany | 83,287,273 | 13.96% |
| 2 | United Kingdom | 68,526,000 | 25.44% |
| 3 | France | 68,372,286 | 36.90% |
| 4 | Italy | 58,984,216 | **46.78%** |
| 5 | Spain | 48,352,528 | **54.88%** |

- Map total **596,770,599** across **42** countries. Next in line: Ukraine 37,732,836 and Poland
  36,687,353. Last to arrive: **Liechtenstein, 39,846**.
- **1 dot = 199,000 people**, chosen from the total rather than typed; **2,996 dots** drawn. Same
  dot value and the same seeded scatter as the static sibling, so the two beats' pictures agree.
- The 42 shares are asserted to sum to 1 before a frame is drawn, because a rounding that left the
  meter short of its own end would be invisible in a still and obvious in motion.

## Subject and accent

One accent (`#0B7A75`, the house colour, `origin: newsroom`) on every dot, because this is a
univariate map: a dot means a fixed number of people and nothing else, so a second hue would invent a
second variable. The meter carries the same accent, because the meter and the dots are one quantity
in two channels.

**The five are NOT recoloured**, and that is deliberate. The static sibling refuses to colour its
subjects differently on the grounds that its claim is about which clusters are biggest and
recolouring them would beg that question; the same refusal holds here for the same reason. They are
picked out by direct labels, at the end, on their own dot clusters — and the label anchor is the
centroid of the country's OWN drawn dots, so it can only ever land inside the cloud it names.

`PALETTE.md` records why the house accent was taken rather than the static sibling's `#0072B2`: no
`matchConvention` entry fits population, and the sibling's blue predates `twin-palette` entirely.

## Reveal order (the edit)

30 fps, 380 frames. `establish` 0–24 (title, source, caveat) → `reference` 30–48 (**all 42 country
outlines, empty**, and the empty meter with its half-way line — the two things the argument is
measured against, laid down before any evidence) → `reveal` 60–270 (the countries fill in, largest
first, **each with exactly 1/42 of the window**, non-overlapping, so the meter is monotone and the
count is never ambiguous) → `subject` 270–290 (the five labelled) → `conclusion` 290–320 → `hold`
320–380 (2.0 s). Contract-checked; `hold` ends exactly on frame 380.

The half-way crossing lands at **frame 85** — 12% of the reveal, 5 countries of 42 — and that frame
is committed as evidence.

## The accessibility trap this type has in the video genre, and how it is closed

"Not yet drawn" must not read as "nobody lives here". Every one of the 42 countries is outlined and
filled with neutral land from `reference`, BEFORE the first dot exists, so an empty country is
visibly a shape waiting its turn rather than an absence. The readout says "N of 42 countries drawn"
at every frame, and a country's dots appear as a prefix of its own frozen scatter — never faded in,
because a half-opacity dot over a pale land fill reads as fewer dots, which would put the picture
and the meter in disagreement.

## Anti-patterns for this case

- **Time on screen is not population.** Equal slices are the argument, and a reader could otherwise
  read a country's duration as its size. The caveat says so, on the frame, in its first sentence.
- **A dot is not a place.** Each dot's position within its country is random; without that sentence a
  reader reads a cluster edge as a settlement.
- **A count is not a density.** Dots are uniform inside each country, so drawn tightness is people
  per unit area — a different quantity from the one the title is about, and the caveat says so. (The
  static sibling shipped an alt text that confused exactly these two and had to be corrected.)
- Do not put the dot value in a footnote: it is headline-level type here, because it is the one line
  that turns a texture back into a number.
- Do not silently drop an entity — an absence on a map reads as a zero, so both exclusions are named.

## Verification — frames extracted from the mp4 and looked at

Not the still, and not the props: `ffmpeg -vf select=eq(n,N)` on `render/dot-density.mp4`, committed
beside it.

- **`render/frame-0.png`** — the poster frame: title, source and caveat at full opacity, the plate
  and meter not yet faded in. Not blank, which 19 mp4s in this repository once were.
- **`render/frame-70.png`** — two countries in, the meter a fifth of the way.
- **`render/frame-85.png`** — **the beat**: "5 of 42 countries drawn", the bar just past the half
  line, "54.9% of 596,770,599 people". This is the image the static genre cannot produce.
- **`render/frame-160.png`** — "20 of 42 countries drawn", 91.0%: fifteen more countries have added
  36 points, and the flattening is visible.
- **`render/frame-275.png`** — the five labelled on their own clusters.
- **`render/frame-379.png`** — the last frame, identical to `render/final-frame.png`: 42 of 42,
  100.0%, the same finished picture the static sibling ships.

## Source line

`Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023 · basemap © MapTiler, © OpenStreetMap`
