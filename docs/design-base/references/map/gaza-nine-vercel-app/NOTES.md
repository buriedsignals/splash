# Buried Signals — Gaza casualties map

- url: https://gaza-nine.vercel.app
- archive: buried-signals
- type: proportional-symbol map
- export: web
- readAs: the deployed site's own map element, at rest

## What it is

Recorded casualties in Gaza and southern Israel as proportional circles on a Mapbox basemap, with
two controls beneath — `METHODOLOGY` and `CASUALTY TYPES`.

## What it does with information

**The methodology is a control, not a footnote.** On a casualty map every number is contested, and
putting `METHODOLOGY` beside the map as a thing the reader can open — rather than in prose below —
treats the question as part of reading the map rather than as an appendix to it.

**Circle area carries count and hue carries side**, at low saturation, so a dense cluster reads as
one quantity before it separates into two.

**Place names are the basemap provider's**, delivered as they come: settlements in capitals
(`RAFAH`, `NETIVOT`, `BEERSHEBA`, `OFAKIM`), road numbers in shields.

## What it does with style

Ground `#DEEBED` — a pale blue sea against a sand landmass, the provider's own palette. The circles
are the only editorial colour.

## What is transferable

- **Put the methodology where the map is**, as a control, when the count itself is what will be
  argued about.
- **Area for count, hue for side, both quiet** — so the field reads as a magnitude first and a
  division second.

## What is this piece's own — and why it cannot corroborate

This is **Buried Signals' own work**, and Splash is being built with that house. It is filed because
it teaches, and it is **not admissible as an independent publication**: using our own archive to
corroborate our own vocabulary is the parochialism the evidence floor exists to refuse, under a
different name. See `METHOD.md`, correction 9.

## What was not verified

Both controls — only the resting state was read. Whether the provider's place labels were restyled
at all; at this resolution a default cannot be told from a decision, the same limit recorded for La
Nación's *mapa del delito*.
