---
takeaway: "Of the eleven national agencies that reported, Germany has the highest recycling rate, at 67.8 per cent, and Macedonia has the lowest recycling rate, at 18.4 per cent."
grounding: supported
reference: "Sabrina Weiss and David Bauer -- Republik -- 'Mensch gesund, Klima krank? Die Schattenseite der Pharmaindustrie' (21 March 2025), with SRF Data -- the honesty move used: the share that cannot be attributed is EXCLUDED from the marks and DECLARED in the source note rather than folded in. Applied here to the thirty-one European countries whose agencies did not report and to the one duplicated survey row."
subject: "Germany, the highest rate on the map, read against Macedonia, the lowest"
comparison: "each reporting country's recycling rate against every other reporting country's, on one class scale"
limits: "eleven of forty-two European countries reported; the other thirty-one are drawn as no-data and are not part of any claim. The agencies do not share one definition of recycled -- some count material sent for sorting, others only material that re-entered production. One survey row (Sweden) is duplicated byte for byte in the frozen source and is counted once."
placement: "social video, published alongside the article rather than inside it"
credit: "national environment agencies, collected March 2025"
effectiveDate: "2026-08-21"
language: "en"
slots:
  - id: 1
    proves: "that among the eleven agencies that reported, Germany's rate is the highest and Macedonia's the lowest, and that most of the continent did not report at all"
    medium: map
    format: video
    size: portrait
    reachable: yes
    candidates: ["Choropleth", "Proportional symbol (symbol / bubble map)"]
    intent: unrecorded
    rankingWalk: unrecorded
    chosen: "Choropleth"
---

## What the visual shows

A portrait video for social. The whole continent is on screen from the first frame: a dark
basemap, forty-two European countries drawn as shapes. The eleven that reported fill in, lightest
to darkest by recycling rate, over a single reveal. The thirty-one that did not report keep a
hatch and never fill -- they are on the map, visibly without a value, rather than absent.

Germany lands last and alone, outlined and labelled in the house accent, with its rate stated.
Macedonia, the other end of the gap the article names, is labelled at the same moment on the same
scale, so the argument the reader is left holding is a distance between two marks and not a
sentence.

## Why a choropleth and not a symbol map

A recycling rate is a share of a country's own municipal waste -- a property of the whole
territory, which is what shading area means. The alternative offered was a proportional symbol map
of `collected_kt`, which would have shown where the tonnage actually is (Germany 15 420 kt against
Macedonia 190 kt). That is a different, also true, story; it is not the one the article's own
sentence makes.
