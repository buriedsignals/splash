---
takeaway: "Mazowieckie ma najwięcej łóżek szpitalnych w kraju, ale w przeliczeniu na mieszkańca jest dopiero trzecie — wyprzedzają je Śląskie i Łódzkie."
subject: "Mazowieckie"
comparison: "pozostałe siedem województw w zamrożonej tabeli, a przede wszystkim Śląskie i Łódzkie, które wyprzedzają Mazowieckie na mieszkańca"
limits: "Tabela obejmuje 8 z 16 województw, więc nie da się z niej odczytać pełnego rankingu krajowego. Łóżko szpitalne nie jest miarą jakości opieki ani jej dostępności — nie mówi nic o obłożeniu, o kadrze ani o tym, gdzie te łóżka stoją wewnątrz województwa. Kolumna lekarze_na_10tys nie została w tym wykresie użyta."
placement: "Bezpośrednio po drugim akapicie, w którym artykuł sam stawia pytanie o przeliczenie na mieszkańca."
credit: "Narodowy Fundusz Zdrowia, dane za 2025 r."
effectiveDate: "2026-08-21"
grounding: "unverifiable"
reference: "ABC News (Australia) — Conquering Mount Everest: High hopes and broken dreams (2 June 2019), the chart \"A century of death on Everest\" — the reference set's row \"a profile whose two dimensions disagree\""
language: "pl"
slots:
  - id: 1
    proves: "Że największy zasób łóżek nie oznacza najlepszego zaopatrzenia: Mazowieckie prowadzi w liczbach bezwzględnych, a na 10 tys. mieszkańców jest trzecie z ośmiu."
    medium: "chart"
    format: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["Bar and column", "Scatter (and bubble)"]
    intent: unrecorded
    chosen: "Bar and column"
    producer: "custom"
---

## ① Restitution — what was read in the article

Three things in the article could become visual, in order of strength:

1. **Mazowieckie has the most hospital beds of any voivodeship — 21 400.** Stated in the headline
   and in the lead, with the number, and with Śląskie (17 800) and Wielkopolskie (12 900) beside it.
2. **Mazowieckie is also the most populous voivodeship, and per inhabitant the picture is
   different.** The article's own second paragraph says this in as many words — *"W przeliczeniu na
   mieszkańca obraz wygląda inaczej"* — and then stops. It does not say how different, or who leads
   instead. The frozen table can answer that.
3. **The figures come from the Narodowy Fundusz Zdrowia and cover 2025.** An attribution and an
   effective date, both stated in plain Polish.

The article also carries a **production constraint, not a claim**: it is in Polish and it is going
to print. Both of those turned out to matter more than any single claim in it.

## ② The confirmed takeaway and its grounding — G1

The confirmed takeaway is claim 1 and claim 2 in one sentence, because drawing claim 1 alone would
publish the half of the story the article itself already flags as incomplete.

`resolveGrounding(takeaway, profile, { csv })` was run on it, in Polish, and returned:

    verdict: unverifiable
    detail:  no mechanically checkable claim in this takeaway — nothing was confirmed and nothing
             was refuted (0 of 1 sentence(s) carry a claim the frozen data could decide;
             0 produced a claim of any kind; 1 produced none)
    coverage: {"sentences":1,"evaluated":0,"decided":0,"unreadable":[]}

`unverifiable` closes G1. What it means here is narrower than it looks and worth writing down: the
check did not fail to decide the claim, it never read the claim at all. Its superlative,
comparison and denominator vocabularies are declared in four languages — English, French, Greek and
Arabic — and Polish is none of them. Polish is written in the Latin alphabet, so the safety net that
names an unreadable SCRIPT does not fire either: `coverage.unreadable` is `[]`, which is the same
answer it gives for a sentence it read and found nothing in.

**So the ranking below was checked by hand, against the frozen rows, and is written out here so the
next reader can check it too.** Beds per 10 000 inhabitants, `łóżka_szpitalne / ludność × 10000`:

| # | województwo | na 10 tys. | łóżka | ludność |
|---|---|---:|---:|---:|
| 1 | Śląskie | 40,45 | 17 800 | 4 400 000 |
| 2 | Łódzkie | 40,16 | 9 800 | 2 440 000 |
| 3 | **Mazowieckie** | **38,84** | **21 400** | **5 510 000** |
| 4 | Lubelskie | 38,54 | 7 900 | 2 050 000 |
| 5 | Wielkopolskie | 36,96 | 12 900 | 3 490 000 |
| 6 | Dolnośląskie | 36,68 | 10 600 | 2 890 000 |
| 7 | Małopolskie | 35,38 | 12 100 | 3 420 000 |
| 8 | Pomorskie | 35,32 | 8 300 | 2 350 000 |

The eight regions together hold 100 800 beds for 26 550 000 people — 37,97 per 10 000. The raw
ranking (Mazowieckie 21 400, Śląskie 17 800, Wielkopolskie 12 900, Małopolskie 12 100, Dolnośląskie
10 600, Łódzkie 9 800, Pomorskie 8 300, Lubelskie 7 900) was read straight off the frozen CSV.

Both halves of the takeaway are true of the frozen table. Neither was confirmed by anything but a
person.

## ③ The journalist's hand

| Question | Answer |
| --- | --- |
| Who is the subject? | Mazowieckie |
| What does the reader compare it to? | The other seven voivodeships in the table, and above all Śląskie and Łódzkie, which are ahead of it per inhabitant |
| What does this data NOT let you conclude? | Eight voivodeships of sixteen: no complete national ranking. And a bed is a count of furniture, not a measure of care — nothing here says anything about occupancy, staff, or where inside a region the beds stand. |
| Which paragraph does it follow? | Straight after the second paragraph, where the article itself raises the per-inhabitant reading |
| Source, and as of when? | Narodowy Fundusz Zdrowia, 2025 figures; effective 2026-08-21 |

The credit was recorded through the proposal's **escape**, not its recommendation.
`proposeCredit({ newsroom, article })` returned `attributions: []` and recommended `none`, whose
printed line is `Source: not stated` — on an article whose third sentence is *"Dane pochodzą z
Narodowego Funduszu Zdrowia i dotyczą 2025 roku."* The recorded credit is that sentence's own
organisation, in the story's language, and it names nobody the article does not name.

## ④ The survey

Eight rows, one text key (`województwo`), three numeric measures (`łóżka_szpitalne`, `ludność`,
`lekarze_na_10tys`). No period column, no geometry frozen with the story, no photograph.

Types the profile can support: **Bar and column**, **Lollipop** (its own sheet declares it the same
idea as a bar), **Dot strip**, **Scatter (and bubble)** — at exactly its sheet's floor of eight
rows — **Dumbbell (range plot)**, **Treemap**, **Pictogram**.

Not applicable, and why: **Line**, **Area**, **Streamgraph** and **Calendar heatmap** need an
ordered time axis this table does not have; **Slope** and **Bump** need two moments or a rank per
period, and a raw count and a per-capita rate are two measures of one moment, not two moments;
**Choropleth** and every other map type need a voivodeship boundary file, and none is frozen with
this story; **Histogram**, **Box plot** and **Beeswarm** want a distribution of observations, and
eight regional aggregates are not one.

Reachability: `proposeMediums` / `proposeFormats` report chart open in all four formats, map open
(`MAPTILER_KEY` probed 200), Datawrapper open, hosted embed closed (Cloudflare answered 403).

## ⑤ The medium — G2a

**Chart.** The evidence is eight numbers with one text key. A map of voivodeships would be the
obvious second reading and there is no boundary file frozen with this story, so it is a different
production, not a different drawing.

## ⑥ The format — G2b

**Static.** The journalist asked for it in the article's own last line — *"Potrzebujemy jednego
wykresu statycznego, po polsku, do druku."* All four formats are reachable; three were declined
because the destination is a printed page, which cannot run code and cannot play a video.

## ⑦ The size — G2c

**Landscape.** The beat sits in the article body.

## ⑧ The reference loop

`doctrine/references/reference-set.md` carries a row that is this story exactly: **"a profile whose
two dimensions disagree"** — ABC News (Australia), *Conquering Mount Everest*, and its chart *"A
century of death on Everest"*. Everest's raw annual death toll and its fatality rate disagree in
the same direction this story's raw count and per-capita rate do, and the lesson transfers whole:
give each dimension its own honest reading, in sequence, with numbers — do not soften the first to
make room for the second. The beat draws the per-capita rate as its geometry and carries the raw
count as a stated number in its own annotation, rather than shrinking either.

## ⑨ The palette and the typeface

**Palette.** See `PALETTE.md`. `proposePalette` offered the newsroom's two house accents on the
newsroom's ground `#16191B` and recommended `#D4A853` at 8.01:1. Nothing in the proposal knows the
delivery is a printed page. The answer was given through the escape: ground `#FFFFFF`, accent
`#5B8A8A` (3.86:1 measured on that ground). The house PRIMARY accent measures **2.20:1 on white** —
below the 3:1 non-text floor — so the ground change alone made the newsroom's own lead colour
unusable, and no proposal in this toolchain measured it.

**Typeface.** See `TYPEFACE.md`, written by `writeTypeface`. `proposeTypeface` was run with this
beat's own Polish strings as the sample. `Space Grotesk` (the newsroom's first face) does not
resolve on this machine; `Courier New` resolves and is cautioned as a monospaced face; the
substrate stack `Helvetica, Arial, sans-serif` was recommended and recorded, `origin: default`,
`answeredBy: nobody`. Its `drawsTheSample` is `null` — the fallback is never measured against the
sample, by construction — so the diacritics were settled by looking at the rendered pixels instead.

## ⑩ Slot 1 — the proposal

A horizontal bar chart of hospital beds per 10 000 inhabitants, one row per voivodeship, sorted
descending, Mazowieckie carrying the accent and every other row in the furniture grey, with the
national-eight average drawn as a reference rule and a direct annotation on Mazowieckie's own row
stating the raw count it leads on.

### Candidates considered

1. **Bar and column** — chosen. "One value per category, encoded as the LENGTH of a rectangle from
   a shared baseline." Eight categories and one derived measure is exactly its case, and length
   from a shared zero is what lets a reader see that the top four sit within 1,9 beds of each other
   without doing arithmetic. It is also the only candidate here with room on the row itself for the
   raw figure the headline is about.
2. **Scatter (and bubble)** — rejected. Population against beds would show the RELATIONSHIP rather
   than the ranking — whether a region carries more beds than its size predicts — which is a
   genuinely different and interesting way to see this table. It is rejected on two counts: its own
   sheet asks for "about eight or ten points" and this table has exactly eight, the floor rather
   than a comfortable margin; and the article's second paragraph poses a ranking question ("who is
   ahead per inhabitant"), which a cloud answers only indirectly.

**Lollipop was not offered.** `assertDistinctWays` counts ideas, not labels, and
`types/lollipop.md` declares itself the same idea as a bar.

### Producer — custom

`datawrapperMatch({medium: "chart", format: "static", treatment: "Bar and column"})` returns a
faithful mapping (`d3-bars`, `column-chart`), so the conditional G2-producer gate was put.
**Custom** was chosen: this beat has to draw a derived measure that is in no column of the frozen
table, carry a second number (the raw count) as a direct annotation on one row only, and — the
reason that decided it — have its Polish diacritics inspected at the pixel level, which a delegated
renderer's PNG does not allow before it is delivered.
