---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

## One accent, and everything else is a value on the direction's own neutral

Sixteen lines and seven rails, and **the accent is spent on exactly two lines** — Finland and Sweden,
the only two countries above both thresholds, which is the claim. Every other line is one neutral,
and that is `parallel-coordinates.md`'s own rule rather than a taste: un-highlighted context lines
"render in a single neutral muted grey, exempt from the categorical palette check … the grey lines
are scaffolding for the highlighted ones' shape to stand out against, not claiming to be
individually tracked categories". Sixteen hues here would be sixteen categories a reader is asked to
learn and then track through fifteen crossings.

The accent cap this type states is "near three". This page spends two.

## What the brush spends, and what it is forbidden from spending

The page's one reader control is a **brush** (`skills/chart-web/assets/brush.ts`): a named band on a
rail, and the lines crossing it step forward. A control has to be visible in *some* channel, and the
channel it takes is decided by what is already occupied:

- **colour is occupied**, by "is this line the claim's subject". So a line the reader selects that
  already carries the accent keeps it — `web-discipline.md` says no control on the page may take the
  accent off the subject, and `the-subject-is-ringed-not-recoloured` says recolouring "spends a
  channel that is already carrying something". `brush.ts` calls those lines `held`, and they take the
  brush's **weight** step and never its **value** step.
- **weight is free**, on every one of the sixteen. 1,2 (context) and 2,2 (subject) at rest, 3,4
  selected, plus a 1,8 ring on each of the selected line's seven vertices. So band membership is read
  off a channel that is uniform across all sixteen lines, while identity stays on the hue the control
  never touches.
- **value is free on the neutral**, and only there. A selected context line steps from `thread` to
  `deep` — the same neutral, two steps apart.

## Every colour this page paints, measured in each direction it ships in

`thread` is `mix(ground, ink, 0.32)` clamped to the non-text floor, `deep` is `mix(ground, ink, 0.92)`
clamped the same way, `lit` is the direction's own accent clamped the same way, `rail` is
`mix(ground, ink, 0.45)`. Nothing here is a literal: all four are computed at render time from the
direction being rendered, so a direction that changes its ink changes this page with it.

| direction | ground | thread (line at rest) | deep (line selected) | deep against thread | lit (the subject) |
| --- | --- | --- | --- | --- | --- |
| creme | `#FFFCEE` | `#919088` — 3,12:1 | `#141413` — 17,92:1 | **5,75:1** | `#1755B2` — 6,85:1 |
| rapport | `#FFFFFF` | `#919191` — 3,15:1 | `#141414` — 18,42:1 | **5,85:1** | `#1E5A88` — 7,31:1 |
| nocturne | `#111044` | `#636385` — 3,09:1 | `#ECECF0` — 15,09:1 | **4,88:1** | `#53E1C1` — 10,93:1 |

**The middle column is the one this beat had to add a refusal for.** Two colours can each clear 3:1
against the ground and be indistinguishable from *each other*, and "which lines came forward" is the
only comparison a reader operating a brush is making. So `assertBrushDeclaration` is handed all three
readings and refuses the declaration if the step between the two states falls under 1,6:1. The
smallest this page actually ships is 4,88:1, on nocturne.

## Why nothing recedes, and why nothing is painted through an opacity

The repertoire's words for this gesture are "everything outside it steps back". This page does the
opposite relation, and the reason is the first column of that table: `thread` is already *at* the
non-text floor in all three directions (3,12 / 3,15 / 3,09), so there is no step back available that
leaves an unselected line legible — and a line receding must still be measured where it crosses what
it crosses. The selected set rises instead.

The previous build of this page drew its context lines at `strokeOpacity={0.75}` over a `thread` that
had just been clamped to 3:1, and its vertices at `fillOpacity={0.6}`. That is a contrast measured
before the thing that destroyed it — the same defect that reached readers at 1,75:1 and 2,19:1 on two
other beats. Both opacities are gone; every mark on this plate is painted in a colour that was
measured as painted.

**The one exception, stated rather than slipped past.** The band's own rectangle is a wash —
`mix(ground, ink, 0.2)`, which reads 1,60:1 on creme, 1,61:1 on rapport and 1,83:1 on nocturne. It is
under the floor on purpose and it carries no reading: it is a region marker sixteen lines are drawn
*over*, and a wash at 3:1 would be a second plate behind the plot. What a reader actually reads on it
is its **two bounds**, and those are a 1 px outline in `deep` — 17,92 / 18,42 / 15,09:1.

## The one pair this page cannot separate by value

On nocturne a selected subject line (`#53E1C1`) and a selected context line (`#ECECF0`) read
**1,38:1** against each other. They are told apart by hue, not by value, which is the whole point of
the accent being reserved — but it is recorded here rather than discovered later, because it is the
one place on this page where two marks in the same state are close.
