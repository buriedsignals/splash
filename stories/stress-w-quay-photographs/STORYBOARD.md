---
takeaway: "Three photographs of the same stretch of quay — 1994, 2010, 2025 — show boats moored three deep at the start and empty berths with no crane at the end."
subject: "The stretch of quay the three photographs were taken from, and what stands on it in each year"
comparison: "The 1994 frame against the 2025 frame — the same view thirty-one years apart, with the 2010 frame as the only surviving evidence from the decade in between"
limits: "Three photographs, not a survey: nothing here counts boats, berths or landings, and the frozen table carries no quantity at all. The three frames are not the same focal length or the same aspect ratio, so what is inside each frame is not a like-for-like crop of the others. The 2010 photograph came from the archive with no caption and no photographer; nobody at the paper can now say who took it, and the desk has decided to run it anyway. The 2025 photograph carries no credit in the frozen table either."
placement: "At the top of the piece, above the opening paragraph, as one sequence."
credit: "Régie du port for the 1994 photograph; the 2010 and 2025 photographs are unattributed"
effectiveDate: "2026-08-21"
grounding: "unverifiable"
reference: "none — doctrine/references/reference-set.md holds eight argument structures and not one of them is repeat photography of a fixed viewpoint over time; nothing in the set was close enough to show, so nothing was offered and nothing was accepted"
language: "en"
slots:
  - id: 1
    proves: "The same stretch of quay, photographed in 1994, 2010 and 2025, is full of boats at the start and empty at the end."
    medium: "image"
    format: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["Photograph sequence", "Before and after pair"]
    chosen: "Photograph sequence"
---

## What was read in the article (restitution)

The article makes one claim a visual can carry and one it cannot:

1. **Carried.** Three photographs of the same stretch of quay, 1994 / 2010 / 2025. The first shows
   fishing boats moored three deep; by the last the berths are empty and the crane has gone.
2. **Not carried.** *Why* the fleet left. The article does not say, and the frozen table holds
   nothing but file names, years, alt text and credits — no counts, no tonnage, no landings.

The desk's own instruction is explicit and is recorded as `placement`: *"Run all three as a
sequence at the top of the piece."*

## The 2010 photograph, and what the desk decided

The frozen `source/data.csv` carries an empty `alt` and an empty `credit` for `w-quay-2010.png`.
The article explains both: it came from the archive with no caption and no photographer, nobody can
now say who took it, and *"we should still run it — it is the only picture of the quay from that
decade."*

The frozen table also carries an **empty credit for the 2025 photograph**, which the article does
not mention at all. Two of the three photographs therefore arrive with no attributable
photographer, not one.

## Slot 1 — the sequence

### Candidates considered

1. **Photograph sequence** — chosen. All three frames, in the journalist's own order, each in the
   same box. It is the desk's own instruction, and the 2010 frame is the only evidence from its
   decade — dropping it would throw away the reason the article argues for running it.
2. **Before and after pair** — 1994 against 2025 only. A sharper contrast and a tidier layout,
   because the two landscape frames share an aspect ratio and the portrait one does not. Rejected:
   it silently answers the editorial question the article poses out loud, by dropping the
   photograph nobody can attribute.

There is no third candidate. Two honest ways beat three labels over one idea, and no third
treatment of three fixed photographs is a different *idea* rather than a different arrangement.

## What the grounding check could and could not see (G1)

`resolveGrounding` read the takeaway against `source/profile.json` and `source/data.csv` and
returned **`unverifiable`**, with the detail stated rather than hidden: the numerals `1994` and
`2025` were *placed* inside `year [1994, 2025]` — `consistent`, which is not confirmation — and no
sentence of the takeaway carried a claim this data could decide. That is the honest verdict for a
photograph manifest: it has no quantity in it to check a claim against. It closes G1; it does not
pretend to confirm anything.

## Sub-gates

- **G2a — medium.** `image`. The evidence is photographs, not a quantity on an axis.
- **G2b — format.** `static`. `proposeFormats({medium: "image"})` offers `static` and `scrolly`
  and refuses `web` and `video` by name. The piece needs one sequence at the top of an article,
  not a scroll vehicle.
- **G2c — size.** `landscape` — the article-web row. The piece runs in the article's own column.
