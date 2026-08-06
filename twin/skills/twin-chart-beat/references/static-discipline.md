# Static discipline

The rules a static chart beat is written under. Each one is here because breaking it produced a
defect somebody had to find by looking at a rendered image.

## Every layer earns its place

Encode data, supply context, establish hierarchy, support verification, or direct attention. A
layer doing none of those comes out. The test is blunt: remove it, and ask whether anything is
harder to understand. Boxes, frames, drop shadows, tick marks that duplicate a gridline, a legend
for one series, a background band behind the title — all fail it.

## One accent

One semantic accent, reserved for the subject the journalist named. Everything else neutral or
muted. The subject is not the maximum: a chart that accents its highest bar because it is highest
has decided the story on the data's behalf.

## All furniture derived from the ground

No hex is written anywhere except the newsroom's ground and its accent, both of which arrive as
inputs. `deriveFurniture(ground)` produces the rest:

- **ink** is the pole — pure black or pure white — that MEASURES higher against this ground.
  Not a luminance threshold. The obvious `luminance > 0.5 ? black : white` is wrong on the
  mid-grey band: on `#808080` it picks white at 3.95:1 over black at 5.32:1.
- **muted** starts 62% of the way to the ink and escalates until it clears 4.5:1 against the
  ground. It always terminates: the worst ground for its own better pole is L = 0.1791, where
  that pole still measures 4.58:1. So a source line is readable on any ground a newsroom picks —
  there is no ground on which this has to fail.
- **grid** is decoration, not text. No contrast floor, and it must not shout.

Contrast is measured **on the real ground**, never on an assumed white.

## Honest baseline, visible zero

The scale starts at zero and the zero line is drawn. The cost is real and worth naming: when the
values sit far above zero — rainfall between 604 and 912 mm on a 0–1000 scale — the lower third of
the plot is empty. That emptiness is information (these are large numbers), and it is the price of
not manufacturing a slope. A beat that genuinely cannot start at zero says so on the axis; it does
not simply crop and hope.

## Sparse ticks

Three y ticks: the floor, the middle, the top. Three x ticks: first, middle, last. Nobody reads the
values between them off the axis — that is what the direct label is for. The unit goes on the top
tick only, so it is stated once.

## The source under the header, not in a footer

The source line sits directly beneath the title, at reading size, in muted ink. Not 9px, not in the
bottom-right corner, not cropped when somebody screenshots the top of the chart. It carries the
effective date the journalist gave, because "as of" is part of the claim.

## Direct end labels, not a legend

Name the series where it ends. A legend makes the reader carry a colour across the frame and back;
an end label is read where the eye already is. This is also why the right gutter exists.

## Gutters are measured, never fixed

The right gutter is `measureText(endLabel)`; the left gutter is the widest y tick label, measured.
A constant that fits `Annemasse` clips `Annemasse-les-Voirons-sur-Arve`, and a constant that fits
`1000 mm` clips `17 600 €`. Fixed gutters cost the engine this twin replaces four real clipped
labels in production — a stacked-area band label, two legends and an annotation — every one of them
found by eye, none by a test, because the tests were written against the constant.

`measureText` measures the ink of the real string in the font it will really be drawn in
(resvg lays it out and reports the box). It is not an estimate from character counts, and the font
stack it measures with is the same constant the component draws with. If those two ever diverge,
every gutter in the chart is measured against a font nobody is looking at.

## Gaps are shown, not bridged

A missing reading ends the run: the line is not drawn across the hole, and no dashed bridge spans
it either — a dashed bridge reads as data nobody measured. The break is the fact; a small muted
note in the hole names it.

## No root `<title>`

An SVG's root `<title>` becomes a tooltip that follows the cursor and repeats what is already
printed at the top of the chart. Use `role="img"` plus `<desc>` for the alt text (WCAG 1.1.1). The
alt text is a sentence about what the chart shows, written by the journalist, and it ships on every
beat — there is no beat without one.

## Language

The render speaks the journalist's language, furniture included. `no data 2019`, `Source :`, number
grouping and date format are all part of the beat, not incidental strings. A language leak in the
furniture is a defect even when every number is right.

## Verification

Applied to the pixels. Not to the source, not to the bundle, not to the config — grepping a bundle
for a hex proves nothing, because the bundle inlines colours nobody rendered. Look at the PNG, on
the light ground and on the dark one. A chart that passes its tests and looks bad is the failure
this discipline exists to prevent.
