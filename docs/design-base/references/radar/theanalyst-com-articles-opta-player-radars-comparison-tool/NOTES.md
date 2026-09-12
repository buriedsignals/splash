# Opta Analyst — Player Radars: Opta's Player Comparison Tool (embedded, Craig Dawson)

- url: https://theanalyst.com/articles/opta-player-radars-comparison-tool
- archive: url-list
- type: radar, polar-area variant — nine wedges, live and searchable
- export: **web, in a frame.** `style.graphic.tag = "iframe"`, 1300 × 1066, `documentTop 1829`.
  The graphic's own reading is `style.graphicFrame`; `style.type` is the publisher's article
  furniture and describes the page around it.
- readAs: the live tool as it loads with its default player. `routes.pixel.measuredFrom =
  "graphic.png"`.

## What it is

The same Opta radar two years on, as an interactive rather than a picture. A search field
(`SEARCH BY PLAYER OR TEAM`), a `THIS SEASON / SINCE 2019` toggle, `SAVE IMAGE` and `COPY LINK`
buttons, then the radar card: **Craig Dawson**, "Defender template. Percentile rank vs defenders
with at least 500 minutes played", nine wedges with the percentile printed in each — `62` Goals,
`73` Shots, `87` Touches in Box, `80` Aerials Won, `26` Possession Won, `44` Defensive Actions, `54`
Touches, `11` Dribbles Attempted, `52` Chances Created.

Below the radar, a **similarity table**: `DAN BURN 86.09 %`, `DARA O'SHEA 84.25 %`,
`SAMUEL GIGOT 82.82 %`, `CHRISTOPHER WOOH 81.19 %` — the four players whose shapes are closest.

## What it does with information

**The shape is turned into a query.** This is the thing this record has that no static radar in the
family has: the polygon's whole point is that a reader compares profiles by silhouette, and the tool
does that comparison arithmetically and lists the answers under the chart. The radar stops being a
picture of one player and becomes the entry point to a neighbourhood of players.

**The template is named on the plate, and it is the population.** "Defender template. Percentile
rank vs defenders with at least 500 minutes played" — one line, and it fixes what the numbers mean.
The template also fixes which spokes exist: a defender gets nine, the striker template gets ten.
That is axis selection treated as an editorial object with a name, which is the discipline the type
reference asks for.

**The wedge families survive from the static design, but the hub labels do not.** Three colour
groups — red, purple, amber — still block the circle into attacking / possession / defensive
neighbourhoods, and the `ATTACKING / POSSESSION / PHYSICAL` ring that named them in the 2023 static
version is gone from this card. The colour still groups; nothing on the plate now says what the
groups are.

**Spoke labels are set on a curve around the rim, uppercase, tracked.** `CHANCES CREATED`, `TOUCHES
IN BOX`, `DEFENSIVE ACTIONS` — each rotated to its own angle, running along the circle rather than
radially.

**`SAVE IMAGE` and `COPY LINK` are part of the design.** The interactive assumes its output is a
still that leaves the page, which is the actual life of this form: a radar is made to be posted.

## What it does with style

Measured on `graphic.png` (the frame's rendered pixels): ground **`#F7F7F7` at 56.22 %** with
**`#FFFFFF` at 31.69 %** — the page's warm neutral behind a white card. The three wedge families
are **`#EB5863` at 4.26 %** (hue 355.5°), **`#FBBB53` at 2.85 %** (hue 37.2°) and **`#B645C2` at
2.22 %** (hue 294.2°); `#FE7AAE` (0.23 %) is the pink of the two action buttons. `#F5ACB1` and
`#DBA2E1` are antialias neighbours. The classifier reads the palette as `"categorical"`, which is
right — three hues at 355 / 37 / 294 are three names, not a scale. Ink is `#1D0A30` (0.73 % in the
neutral list), a near-black violet rather than black.

**Declared and rendered do not match, and the gap is the design.** `graphicFrame.marks` declares
`fill rgb(229,32,47)` ×3, `fill rgb(250,165,26)` ×3, `fill rgb(158,7,174)` ×3 — three saturated
source colours, three wedges each. What is actually painted is `#EB5863`, `#FBBB53`, `#B645C2`:
every family is lightened at the point of drawing. The saturated version would fight the white
numerals printed on top of it.

**The graphic's type comes from the frame, and it is a different voice from the article's.** Inside
the frame: **Big Shoulders Text** at 24/700 tracking 0.6 for the player name (`CRAIG DAWSON`),
16/400 tracking 0.6 for the template line, **14/400 tracking 1.2 uppercase for the spoke labels**
(`goals`), 16/800 uppercase for names in the similarity table, 12/600 grey `rgb(128,128,128)` for
the season, 12/800 uppercase for the similarity percentage, and **IBM Plex Mono 12/800 uppercase**
for the table's column heads. Frame ground `rgb(247,247,247)`, ink `rgb(29,10,48)`.

The host page around it speaks differently: Big Shoulders Text 60/500 for the headline and **Lora
16/400 for body prose**. A serif for reading, a condensed grotesque for the instrument. Anything in
this record's `style.type` is that article furniture and none of it is the chart.

## What is transferable

- **Print the population and the template on the card**, in one line, at body size.
- **Give the chart a name for its own axis set** ("Defender template") so a reader knows the spokes
  were chosen, and chosen for a reason.
- **Turn silhouette similarity into a ranked list under the chart.** It answers the question the
  shape provokes instead of leaving it to the eye.
- **Lighten a family colour before printing a value on it** rather than choosing between the colour
  and the label.
- **Assume the still will leave the page**, and give it a button.

## What was not verified

- **Hover, keyboard and focus behaviour were not exercised** — the harvester loads and photographs.
  Whether the wedges carry a tooltip, and whether that tooltip repeats the accessibility mistake
  named in `skills/chart-beat/references/types/radar.md` (the item name painted in its own accent on
  a dark ground), is unknown from this record.
- Whether the missing `ATTACKING / POSSESSION / PHYSICAL` hub ring is absent by design or appears at
  another breakpoint.
- Whether the similarity metric is computed on the nine drawn percentiles or on a wider vector.
- The default player is whatever the tool loaded on the day; nothing about Craig Dawson is editorial.
