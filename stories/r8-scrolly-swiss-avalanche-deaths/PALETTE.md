---
ground: "#16191B"
accent: "#D4A853"
accents: "#5B8A8A"
origin: journalist
---

# The colours this story is drawn in

`proposePalette` was run against `NEWSROOM.md`, this beat's own subject line and its takeaway, with
`surface: "screen"` and `series: { kind: "part-to-whole", count: 2 }` — the two terrain categories
sum to the whole toll, so one of them takes the accent and the other is its comparison field.

`matchConvention` returned nothing: avalanche deaths carry no colour a reader already holds, and the
proposal said so out loud rather than reaching for one. The newsroom's own colours therefore lead.

Option 1, taken as proposed: Buried Signals's `brandColor: #D4A853` on its `ground: #16191B`,
measured at **8.01:1** against the ground — clear of the 3:1 non-text floor. The house's second
accent `#5B8A8A` also passed, at **4.58:1**, and is recorded in `accents:` because this beat draws
two series and `seriesInks(palette, 2)` returns them in the recorded order.

**Which series takes the accent.** `#D4A853` draws deaths in CONTROLLED terrain — buildings and
transport routes — because that is the series the takeaway is about and the one that collapses.
`#5B8A8A` draws deaths in UNCONTROLLED terrain, the comparison field it collapsed against.

`origin: journalist` — the recommended option was read and accepted, not defaulted into.
