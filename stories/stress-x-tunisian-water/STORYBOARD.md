---
takeaway: "تستهلك محافظة تونس أكثر من غيرها من المياه، بواقع 142 مليون متر مكعب في السنة."
subject: "محافظة تونس"
comparison: "بقية المحافظات الست في الجدول، وفي مقدمتها صفاقس"
limits: "الجدول يغطي سبع محافظات فقط، لا كامل الجمهورية، فلا يمكن استنتاج ترتيب وطني كامل منه. وقيمة صفاقس مكتوبة بالأرقام الهندية العربية في المصدر المجمّد، فلم تُقرأ آليًا ولم تُرسم."
placement: "بعد الفقرة الافتتاحية مباشرة، حيث يرد رقم 142 مليون متر مكعب لأول مرة."
credit: "الشركة الوطنية للمياه، أرقام السنة المدنية 2025"
effectiveDate: "2026-08-21"
grounding: "unverifiable"
reference: "none — no row in doctrine/references/reference-set.md carries the argument structure 'one category leads a ranked field'; its eight rows are all narrative structures, and live research was out of scope for this run"
language: "ar"
slots:
  - id: 1
    proves: "أن استهلاك محافظة تونس أعلى من كل محافظة أخرى في الجدول، وأن قيمة صفاقس هي القيمة الوحيدة التي تعذّرت قراءتها."
    medium: "chart"
    format: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["Bar and column", "Treemap"]
    chosen: "Bar and column"
    producer: "custom"
---

## ① Restitution — what was read in the article

Three claims could become visual, in order of strength:

1. **Tunis governorate consumes more water than any other, at 142 million cubic metres a year.**
   Stated in the article's own Arabic lead, with the number. The strongest claim and the one the
   frozen table can carry.
2. **Sfax is the second largest consumer and has almost as many residents.** Stated in the English
   paragraph. The table carries both columns — but Sfax's consumption cell is written in
   Arabic-Indic digits (`٨٩٠٠٠٠٠٠`), and the frozen profile records that the whole column stayed
   `text` because of it.
3. **The figures come from the national water utility and cover the 2025 calendar year.** An
   attribution and an effective date, both stated.

The article also carries a **production constraint, not a claim**: the governorate names must appear
in Arabic, as the article writes them, and a previous attempt reversed the letters and was rejected
by the desk.

## ② The confirmed takeaway and its grounding — G1

Confirmed verbatim as the article's own lead sentence. Grounded with
`resolveGrounding(takeaway, profile, { csv })`:

    verdict: unverifiable
    142 — could not be placed in any numeric column's range or total ("السكان" [374000, 1056000],
    sum 4984000) — and note that the profiler REFUSED to type "استهلاك_المياه_م3"
    (looked numeric but "٨٩٠٠٠٠٠٠" is not, so the column stays text), so any number this claim
    makes about that column could not be attempted at all

`unverifiable` closes G1. It is information, not a refusal: nothing was refuted, and the check said
exactly what it could not see. The claim's superlative (`أكثر من غيرها`) was never parsed — the
grounding check reads English and French superlative shapes only — so the ranking this beat draws
was verified by hand against the frozen rows instead, and the beat says which figure it could not
read.

## ③ The journalist's hand

| Question | Answer |
| --- | --- |
| Who is the subject? | محافظة تونس |
| What does the reader compare it to? | The six other governorates in the table, Sfax first |
| What does this data NOT let you conclude? | Seven governorates of twenty-four: no complete national ranking. And Sfax's own figure was never read. |
| Which paragraph does it follow? | Straight after the opening paragraph, where 142 million first appears |
| Source, and as of when? | The national water utility, 2025 calendar-year figures; effective 2026-08-21 |

The credit was recorded through the proposal's **escape**, not its recommendation. `proposeCredit`
recommended `unattributed` — "Source: not stated" — on an article that says in plain words where its
figures come from. The recorded credit is the article's own attribution, in the story's language,
and it names no organisation the article does not name.

## ④ The survey

Seven rows, one text key (governorate), one measure that the profiler refused to type, one measure
it did type (population). Types the profile can support: **Bar and column**, **Lollipop** (the same
idea as a bar, in its own sheet's words), **Treemap**, **Dot strip**, **Pictogram**.

Not applicable, and why: **Slope** needs exactly two moments and this table has one; **Bump** needs
a rank per period; **Line** and **Area** need an ordered axis this table does not have;
**Choropleth** needs a region key and a basemap, and no governorate boundary file is frozen with
this story; **Scatter** refuses seven rows outright — its own sheet asks for eight or ten.

Reachability: `proposeMediums`/`proposeFormats` report chart open in all four formats, map open
(`MAPTILER_KEY` probed 200), Datawrapper open, hosted embed closed (Cloudflare answered 403).

## ⑤ The medium — G2a

**Chart.** The evidence is seven numbers with one text key; there is no photograph in the story and
no boundary geometry frozen with it, so a map is a different production, not a different drawing.

## ⑥ The format — G2b

**Static.** The beat has one thing to prove and one reading; a static frame is the form the desk
can put in print and in the article body without hosting anything. Web and video were both
reachable and both were declined for this first beat: neither adds a reading this frame omits.

## ⑦ The size — G2c

**Landscape.** The beat sits in the article body, not in a story rail.

## ⑧ The reference loop

`doctrine/references/reference-set.md` holds eight argument structures and none of them is a plain
ranked comparison — the structures there are narrative ones (a rule individual cases break, accounts
that contradict each other, a geography produced by an event). Recorded as `none`, with the reason,
rather than attaching a reference whose lesson does not transfer.

## ⑨ The palette and the typeface

**Palette.** `proposePalette` proposed the house colours only and recommended `#D4A853` on
`#16191B`. It did not offer the subject convention: its `SUBJECT_CONVENTIONS` table matches English
and French words only (`water|river|rainfall|eau|pluie|…`), so an Arabic subject reaches the newsroom
branch as though the story had no subject convention at all. The same table's own `water` entry
carries `#1F6FB2`, and that is what was recorded — measured at **3.34:1** against the house ground,
above the 3:1 non-text floor. `origin: subject`.

**Typeface.** `proposeTypeface` recommended the substrate stack, and that recommendation happens to
be right here for a reason nothing in the proposal measured: `Geeza Pro` — the obvious script-aware
choice on this machine, and one `familyResolves` reports as resolving — draws the ASCII colon and
`2025` as **empty boxes**, because resvg does not fall back glyph by glyph inside a family it did
find. The recorded stack draws the Arabic through resvg's own fallback and the Latin digits from
Helvetica, and every string in this beat was looked at before the face was recorded.

## ⑩ Slot 1 — the proposal

A horizontal bar chart of consumption per governorate, sorted descending, Tunis carrying the accent,
with Sfax present as a named row whose value was never read rather than absent from the frame.

### Candidates considered

1. **Bar and column** — chosen. "One value per category, encoded as the LENGTH of a rectangle from a
   shared baseline." Seven categories and one measure is exactly its case, and length from a shared
   zero is what lets a reader see Tunis ahead of the field without arithmetic. It is also the only
   candidate that can hold a row with **no bar at all** and still name it — which is what the
   unreadable Sfax cell needs.
2. **Treemap** — rejected. It reads consumption as a share of the seven-governorate total, which is
   a different and weaker claim (the table is not the country), and its own sheet says the nested
   layout buys nothing where there is no real grouping to preserve. It also has nowhere honest to put
   a row whose value is unknown: a tile with no area is not a tile.

**Lollipop was not offered.** `assertDistinctWays` counts ideas, not labels, and
`types/lollipop.md` declares itself the same idea as a bar.

### Producer — custom

`datawrapperMatch({medium: "chart", format: "static", treatment: "Bar and column"})` returns a
faithful mapping (`d3-bars`, `column-chart`), so the gate was put. **Custom** was chosen: this beat
has to draw a named row with no bar and a right-to-left category axis, and a delegated producer's
rendering of Arabic labels is not something this run can inspect at the pixel level.
