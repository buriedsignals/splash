# Ferdio — 100.datavizproject.com #44 (the same flow in isometric 3D)

## What it is

The third of Ferdio's flow encodings of the same dataset, and the cautionary one: the three ribbons
of `#42` lifted into an **isometric grid**, each running from a 2004 floor value up to a 2022
value, with a wireframe box around them and the three series named along the front axis.

**What was actually read**: the piece's own graphic, an `img` 823 × 823 at `documentTop: 172`,
photographed as an element and confirmed by eye. Both routes `ok`.

## What it does with information

Each ribbon is a flat plane in perspective. The value is written on the ribbon's leading edge at
both ends (`13` → `15`, `4` → `10`, `5` → `8`) and the rate of change is written along the sloping
face (`+15%`, `+150%`, `+60%`). Every quantity in the picture is printed, which is the tell: in
`#42` the thickness carried the value and the number confirmed it; here the number carries the
value and the thickness cannot be trusted to, because two ribbons at different depths in the same
projection are drawn at different apparent scales.

The wireframe floor exists to give the eye a datum, and it is the only thing that makes the two
back ribbons placeable at all. The series names on the front axis are set in each series' own hue
— a legend that is also a position.

The comparison the form is for — is Denmark now above Norway? — is the one this projection makes
hardest. Occlusion is doing work colour and thickness are supposed to do: the red ribbon passes in
front of the navy one, and being in front is a fact about the camera, not about the data.

## What it does with style

Measured on `graphic.png` (`record.pixel`, `measuredFrom === "graphic.png"`):

- ground `#FFFFFF` at **93.29 %** — the picture is far emptier than the two flat versions, because
  the projection spends most of its area on a wireframe;
- **two tones per series**, which is the shading: `#EE5440` at 1.46 % against `#F37666` at 0.59 %
  (DK), `#3274DA` at 0.70 % against `#5495EC` at 0.66 % (SE), and the neutrals `#283250` at 0.96 %
  against `#424B65` at 0.69 % (NO);
- so the palette carries **six** values for three series, and the second tone of each is a lighting
  decision that says nothing about the data;
- `#F3F5F5`, `#EDF0F1`, `#EAEDEE` at 0.14–0.30 % are the wireframe.

Set against `#42` — where the same three series took `#3274D8` 8.75 %, `#EE5440` 4.37 % and
`#283250` 2.82 % on the same 823 × 823 canvas — the isometric version spends **a fifth of the ink**
on the data and roughly doubles the number of colours needed to draw it.

`record.style.type` is the Ferdio website (stevie-sans, Borgia Pro), not the graphic.

## What is transferable

Mostly as a refusal, and it is worth having measured rather than asserted:

- **A projection that adds a dimension the data does not have costs ink and colour and returns
  neither.** 93.3 % ground against 82.5 %, six palette entries against three, for the same three
  numbers.
- **When the geometry stops being trustworthy, every value has to be printed.** That is a
  reasonable diagnostic in both directions: a flow diagram that cannot be read without a number on
  every ribbon is a flow diagram whose thickness has stopped meaning anything.
- **Shading tones are not palette entries and must not be counted as tracked categories.** If a
  renderer produces two tones per series, the accessibility budget still has three series in it,
  and the six colours are not six affordances.
- What *is* worth keeping: naming each series along an axis **in its own hue**, so the legend and
  the position are the same object.

## What was not verified

- **The graphic's own typography.** Raster `img`; the rotated labels were seen, not measured.
- **Whether the ribbons share one pixels-per-unit scale.** In an isometric projection they cannot,
  and the record has no way to test it. The claim above that thickness is untrustworthy is a
  reading of the projection, not a measurement of the file.
- **Whether Ferdio intends this as a demonstration of a bad idea.** The series is explicitly an
  exercise in encoding one dataset a hundred ways; nothing on the page grades them.
- **Independence.** One of three `100.datavizproject.com` references — one publication.
