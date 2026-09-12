# The Marshall Project — "The Black Mortality Gap, and a Century-Old Document"

- url: https://www.themarshallproject.org/2021/08/30/the-black-mortality-gap-and-a-century-old-document
- archive: url-list
- type: base-plus-excess — a counterfactual drawn in neutral, with the difference stacked on it in
  the accent, at one dot per death
- export: interactive (a scroll-driven reveal on one canvas)
- readAs: the same `<canvas>` element in **two states**. `graphic.png` in this directory is the
  reveal's first step, which is what the harvester reached; `graphic-scrolled.png` is the settled
  state, captured by walking the page. Both are measured below, and the difference between them is
  the point.

## What it is

Every death of a Black American in 2019, one dot each, arranged as a distribution over age (`Age: 1`
to `100+`). The first state draws only the counterfactual — "if Black Americans died at the same
rates as White Americans, in 2019 about 294,000 Black Americans would have died" — as a black cloud.
The settled state adds, on top of that cloud and at the same unit, the **excess** deaths in a hot
red.

## What it does with information

**The change is the difference, drawn on top of the base, in the same unit.** Not two clouds side by
side, not a subtraction printed in a corner: the neutral cloud is what should have happened and the
red rim above it is what did. The reader counts the same object throughout and the gap is a shape
they can see the age profile of — which is the finding ("the biggest inequality affected Black
infants").

**The unit is declared, once, with a leader into the mark**: `Each dot is 1 person's death ——↓`, in
bold beside the first dot. Everything after that is countable.

**The accent number is set inline in the prose, in the accent colour.** "almost **3,600 more Black
babies** died before their first birthday" — the red in the sentence is the red in the picture, so
the caption is a legend.

**The counterfactual is the neutral and the reality is the accent** — the reverse polarity to
"past in neutral, present in accent", and correct here for the same reason: the neutral holds what
is not the story.

**The x axis is a bare age scale with five labels** (`Age: 1`, `10`, `25`, `50`, `75`, `100+`) set
below the cloud in a light 12 px, and there is no y axis at all. With one dot per person the
vertical extent is a count, and a count of dots does not need ticks.

## What it does with style

Measured on the canvas element, in both states.

**First state** (`graphic.png`, what `measured.json` holds): ground `#F6F6F4` at **69.8 %**, palette
**monochrome — `chromatic` is empty**, neutrals `#000000` 10.6 %, `#3E3E3D` 7.4 %, `#7B7B7A` 6.0 %.

**Settled state** (`graphic-scrolled.png`): ground `#F6F6F4` at **64.5 %**, palette **sequential,
one cluster at 348°**, `#FF0B3A` at **3.1 %** with its antialiasing ramp (`#FD4669`, `#FB8097`,
`#F8BBC5`); neutrals `#000000` 10.7 %, `#3E3E3D` 8.3 %, `#7B7B7A` 5.3 %, `#B8B8B7` 2.5 %.

**This is `METHOD.md`'s correction 5 caught in the act, with both frames kept.** The routes reported
`ok` on a record whose palette contains no accent at all, because the reveal had not run. The reading
of the encoding would have been wrong in its central claim.

Style route, canvas 1139 × 683 (ratio 1.67), text column 1139 px / **104 ch**. Type, four families:

| role | family | size | weight | case | ink | runs |
| --- | --- | ---: | ---: | --- | --- | ---: |
| body | Utopia-Std (serif) | 23 | 400 | none | `#0B0B0B` | 104 |
| body, cited title | Utopia-Std | 23 | 400 | **italic** | `#0B0B0B` | 2 |
| annot | acumin-pro | 21 | 400 | none | `#0B0B0B` | 6 |
| annot, emphatic | acumin-pro | 21 | 700 | none | `#0B0B0B` / `#FF0B3A` | 6 |
| axis | acumin-pro | 12 | 300 | none | `#0B0B0B` | 6 |
| eyebrow | Pressura (mono) | 12.5 | 400 | **uppercase**, tracking 0.1 | `#353535` | 6 |
| furniture | Pressura / PressuraLight | 12–14 | 400 | uppercase, tracking −0.2 | `#0B0B0B`, `#CECECC` | ~16 |

A serif for reading, a humanist sans for the graphic's own voice, and a **monospace, uppercase,
negatively tracked** for every piece of furniture — dateline, section labels, photo credits. Three
jobs, three families, and the assignment never wavers.

## What is transferable

- **Draw the base in neutral and stack the difference on it in the accent, at the same unit.** The
  comparison becomes one shape instead of two, and the difference gets a distribution rather than a
  number.
- **Declare the unit once, with a leader into the mark.**
- **Set the accent number inline in the prose in the accent colour**, so the sentence is the legend.
- **Give the furniture its own family** — a mono in uppercase with slight negative tracking — so
  dateline, credit and label are never mistaken for content.

## What is this piece's own

The Marshall Project's `#FF0B3A`; Utopia and Pressura; the one-dot-per-death unit, which is a
decision about the subject as much as about the encoding.

## What was not verified

The 294,000 and 3,600 figures, and the counterfactual's method — this note describes the encoding.
Whether the horizontal spread within an age column carries anything or is jitter. Whether the reveal
has further states after the one captured: the page was walked to its end and no third state was
seen, but the interaction was not driven step by step.
