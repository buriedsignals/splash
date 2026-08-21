# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at production

image-beat has no useTypeface and no readTypeface: scripts/render-still.mjs:29 holds FONT_FAMILY as a const. TYPEFACE.md was written for this story with palette writeTypeface and records family Helvetica, Arial, sans-serif with origin default. The record does not reach the render. image-beat/SKILL.md asks the beat to name this in its own hand-over, but deliver formatHandover takes a closed parameter set (files, placement, alt, credit, caveat, format, language) with no field for it, so the only way to obey is to put it inside the journalist own limits sentence. Recorded here instead.

## Found at production

image-beat carries no sizes.mjs, so nothing in that format knows what gate 2c chose. This beat had to vendor chart-beat/scripts/sizes.mjs into its own directory to learn that landscape is 1920x1080 with a 26px type floor, to draw at that size, and to measure the delivered PNG back off its own IHDR. The seed (assets/ImageBeatSeed.tsx) draws at a fixed 900 wide with a content-derived height and cannot honour any pinned export size.

## Found at production

imageBeatLayout in image-beat/assets/ImageBeatSeed.tsx uses captionTop as a text BASELINE while using creditTop as a text TOP (creditTop + fontSize). The caption ascenders therefore climb a whole cap height into the photograph above. At the seed own 15px caption over a 10px gap it is about one pixel and invisible in assets/preview.png; scaled up it is an overlap. This beat corrected it in its own component.

## Found at delivery

deliver materialise owned-file copies the WHOLE of a beat renders/ directory into export/<outputId>/. Anything a producer leaves there reaches the newsroom: a size probe, a guard receipt, a discarded variant. This beat keeps its portrait probe and its guards.json outside renders/ for that reason.

## Found at storyboard

SUBJECTS.md is required by deliver otherSubjectsFor, documented in storyboard/references/exchange.md movement 10, and read by NEITHER gate: checkStoryboard returned [] and whereIs returned production and then delivery with no SUBJECTS.md on disk. It was met at the last call of the run, which is the same shape as round-four finding 9 for the language field.

## Found at delivery

deliver formatHandover takes ONE alt and ONE credit. An image beat has one of each PER PHOTOGRAPH. The three were concatenated into one alt string and one credit string by hand; nothing in the hand-over can carry them per photograph.
