---
takeaway: "Japan's record bear year was a Tohoku year: 158 of the 238 people hurt by bears in fiscal 2025 were hurt in the six northern prefectures, and 67 of them in Akita alone."
claimShape: "none"
subject: "Akita Prefecture (秋田)"
comparison: "every other prefecture in the ministry's own table — the 21 that reported at least one casualty, and the 17 that reported none"
limits: "These are 速報値, preliminary figures the ministry says may still change. They are counts of people, not risk: the table carries no population column, so nothing here is a per-capita rate. The casualty column already includes the deaths, so the two must never be added. Eight prefectures — Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima and Okinawa — are absent from the table entirely and must not be drawn or read as zero."
placement: "Follows the paragraph beginning 'What the national total hides is where those 238 people were.' That paragraph already gives 238, 158 and the six Tohoku names, so the visual must give the per-prefecture values and the absent prefectures, and must not repeat the national total as its headline number."
credit: "Ministry of the Environment, Japan (環境省) — 「Ｒ０７年度におけるクマの人身被害件数［速報値］」"
effectiveDate: "2026-08-23"
grounding: "unverifiable"
reference: "a total whose majority escapes the subject named in the title — Weiss & Bauer, Republik, 'Mensch gesund, Klima krank' (21 March 2025). Lifted rule: the part that cannot be placed is EXCLUDED from the marks and DECLARED in the source note, never folded into a residual. Applied here to the eight prefectures the ministry does not report, which get no mark and an explicit caveat line. Rejected from the same row: performing the argument in the title — this subject does not take a joke."
language: "en"
slots:
  - id: "1-bear-casualties-by-prefecture"
    proves: "Japan's 238 bear casualties in fiscal 2025 are concentrated in the north: Akita 67 and Iwate 40 between them account for 45 per cent of the national count, and the six Tohoku prefectures for two thirds."
    medium: "map"
    format: "web"
    reachable: "yes"
    candidates: ["Proportional symbol (symbol / bubble map)", "Choropleth", "Cartogram"]
    chosen: "Proportional symbol (symbol / bubble map)"
    producer: "custom"
---

# Japan's record bear year, prefecture by prefecture

## What was asked, and what I answered

**G1 — the takeaway.** *What is the one thing this graphic has to prove?* — That the record year is
a regional one. 158 of the 238 casualties are in the six Tohoku prefectures; 67 are in Akita alone.

**G1, second question — what SHAPE is this claim?** *maximum · minimum · comparison · total · none,
and about which column?* — **none.** The sentence is a concentration claim, which is not one of the
five. I first answered `total`, about `計_被害者数`, because "158 of the 238" reads as a part of a
total in plain English. The check came back `contradicted` — *"column 計_被害者数 sums to 476, not
100"* — which would have blocked the gate on a true sentence. `total` in this vocabulary means *the
parts sum to 100 per cent*, and nothing in the question says so. Recorded as `none`, honestly.

**Grounding: `unverifiable`.** The check could not place a single one of this takeaway's four
numerals, and it could not place them because it does not read this table's column names. It said so
by blaming the sentence — *"the claim names none of them"* — while a claim naming `計_被害者数`
verbatim came back `unverifiable` too. Recorded as what it is. See `NOTES-FOR-MAINTAINER.md`, phase
`storyboard`.

**The hand.** Subject: Akita. Comparison: every other prefecture in the ministry's own table.
Limits, placement, credit, effective date: in the front matter above, each answered once.

**G2a — medium.** *Map*, because the claim is about where. A ranked bar would prove the same
arithmetic and lose the thing the sentence is actually about: that the high values are adjacent.

**G2b — format.** *Interactive web.* The alternatives offered were static/print, video and
scrollytelling, all four reachable for `map`. Web wins because 39 prefectures carry a value and a
static frame can label six of them; the reader who wants Toyama's 6 should be able to ask for it.
Hosted embed is closed on this machine (Cloudflare answered 403), so the delivery will be a file.

**G2c — size.** Not asked. A web beat carries no size.

**G2-producer.** Asked, because Datawrapper does map this treatment (`d3-maps-symbols`). The gate
answered itself: *"Datawrapper cannot carry a web beat on this newsroom's ground (#16191B) … a
published Datawrapper embed follows the reader's own colour scheme and defaults to light."* Recorded
as `custom`, which was the only reachable answer.

**⑧ The reference loop.** The set's closest row is *a total whose majority escapes the subject named
in the title*. One live search for newsroom treatments of a geographic-concentration claim returned
nothing usable, so nothing new was added to the set and the existing row is what this beat lifts
from — specifically its source-note rule, above.

## The candidates, and why the chosen one won

| Candidate | Why it was on the list | Why it did not win |
|---|---|---|
| **Proportional symbol** | The claim is *how many people at this place*. Circle area carries a count directly, and a prefecture that reported zero honestly draws nothing. | *chosen* |
| **Choropleth** | The northern block would read as one contiguous mass, which is the argument. | It shades a COUNT over an AREA. Hokkaido is 22 per cent of Japan's land and reported 6 casualties; it would read as loud as Akita's 67. A choropleth here needs a rate, and the ministry's table has no denominator in it. |
| **Cartogram** | States the concentration most forcefully of the three. | Destroys the coastline. The reader has to find Akita on a shape they know before the number means anything, and 17 zero-valued prefectures would collapse to nothing and take the map's own outline with them. |

## The eight that are not zero

The ministry's table lists 39 prefectures. Eight are absent: Fukuoka, Saga, Nagasaki, Kumamoto,
Oita, Miyazaki, Kagoshima and Okinawa. They are not zeroes and this beat does not draw them as
zeroes — it draws no mark for them at all and says so in the caveat line, which is the rule lifted
from the reference row.
