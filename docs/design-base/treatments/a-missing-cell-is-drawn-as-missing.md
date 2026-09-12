# a-missing-cell-is-drawn-as-missing

- kind: imported
- name: A position the data cannot fill is drawn, in a neutral outside the ramp, never left as a hole
- applies: the beat draws a grid holding positions its data cannot fill
- draws: value, annot
- priority: 7
- evidence: ons-gov-uk-peoplepopulationandcommunity-birthsdeathsandmarriages-liveb
- evidence: datawrapper-de-oingq
- detect: every impossible or empty position in the delivered artifact carries a mark in a neutral
  that is not a step of the ramp

## The rule

Draw the hole. A gap in a grid reads as a low value; an explicit empty cell reads as nothing.

## The two publications

ONS draws the dates that cannot exist — a 31st of February — as **explicit empty cells with the same
stroke as the rest**, so the grid stays rectangular and a hole never reads as a low value.
Datawrapper draws its no-data state in a neutral **outside the ramp**, and ships a whole empty month
rather than filling it with zeros.

## The counter-lesson that travels with it

Datawrapper's plate teaches against itself, and this base's record says so: **separate "no data" from
"low value" by LIGHTNESS as well as hue, or say in words that the neutral means no data.** Hue alone
does not survive greyscale, and a reader who prints the page loses the distinction entirely.
