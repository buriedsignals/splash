# Approved

**Output** `1-bear-casualties-by-prefecture` · **decided** 2026-08-23 by the journalist.

## What I was shown, and what I did before saying yes

The rendered page, opened in a browser at 1600x900, 1400x900, 1024x768, 768x1024 and 375x667, both
as it ships (the baked plate) and with a real MapTiler key in it (the live map, which is what a
reader gets). Then driven, not described:

- **Hover.** A real pointer at every one of the 39 hit targets. 39 answered, none was swallowed.
  Two answered with a neighbour's value on the fallback layer (Tokyo shows Saitama, Kagawa shows
  Tokushima — both prefectures whose own circle is a pixel or less); on the live layer 6 of 528
  sample points inside a drawn disc answer with another mark, and all six are inside Akita's,
  where Iwate's target overlaps it. Akita's own number is printed under the map and in the table,
  so nothing this beat claims depends on that hover.
- **Keyboard.** Tab reaches a mark, then Left/Right walks all 39. 48 native focus stops on the page
  in total, including every filter chip.
- **The filter.** Every chip clicked for real. "All regions" shows 39 targets and 39 rows;
  Tohoku narrows to 6 and 6; Shikoku to 4 and 4, all four of them zero, which is a true reading and
  not an empty map. The map, the labels and the table narrow together.
- **JavaScript off.** Plate drawn, 39 circles, 39 `title` tooltips, 39 `aria-label`s, all 39 table
  rows, the legend and all 8 filter chips — the filter still works, because it is CSS.
- **The numbers.** Every value on the page checked against `bear-casualties-fy2025.json`, which is
  read from the frozen `source/data.csv` by `prepare-inputs.mjs`. The 39 drawn values sum to 238,
  the ministry's own published national total.

## What I accepted knowingly

- **17 of the 39 marks have no pointer path**, because they are zeros and a zero has no area. The
  live-map probe said so unprompted and named them. Their reading is the keyboard and the table,
  which is why the table ships open on this beat rather than behind a closed disclosure.
- **Akita's own disc is a quarter owned by Iwate's hit target** on the live layer. There is no fix
  inside this beat; it is written up for the maintainer.
- **At 1024x768 and 375x667 only Akita keeps a printed label.** Below a 460px map box the labels
  cannot be placed honestly at any build-time position, so they are withdrawn rather than drawn
  overlapping or pointing at the wrong circle. Every withdrawn value is still on hover, on keyboard
  focus, in the `title` and in the table.

## What I would not have signed

An earlier render of this same beat had a `#aac9e0` sea measuring 1.27:1 against the circles drawn
over it, French decimal commas on a page declaring `lang="en"` ("Akita : 67,0 people hurt", read
aloud as "sixty-seven comma zero"), a legend reading 22,3 / 44,7 / 67,0 people, and three of eleven
labels unreadable in Tohoku — the six prefectures the headline is about. All four are fixed in what
is approved here; all four are written up as defects of the toolchain, not of this story.
