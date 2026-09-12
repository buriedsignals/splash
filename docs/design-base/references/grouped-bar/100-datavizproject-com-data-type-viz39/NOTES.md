# Ferdio / 100.datavizproject.com — #39, the grouped column in isometric, and what it costs

- url: https://100.datavizproject.com/data-type/viz39/
- archive: datavizproject
- type: 3D grouped column chart — 3 series (NO, DK, SE) × 2 categories (2004, 2022), isometric
- export: static raster (`img` 823 × 823) served in the page
- readAs: `graphic.png`, picked at `documentTop` 172, photographed at 824 × 823. Both routes `ok`;
  `routes.pixel.measuredFrom === "graphic.png"`. `style.typeSource` is **"the page only — the graphic
  is a raster and carries no type this route can read"**.

## What it is

The same six values as #25, placed on a three-dimensional floor: category runs into the page
(2004 nearer, 2022 further), series runs across it (NO, DK, SE), and value runs up a left-hand axis
labelled `0 / 5 / 10 / 15`.

## What it does with information

**It is filed here because it is the form, and it is kept because it shows the form's failure
mode.** Every rule the flat versions obey is present — same series order in both rows, same colour
per series, shared scale — and the chart is still harder to read than any of them.

**Occlusion.** The 2022 row stands behind the 2004 row, and where a rear bar is shorter it is partly
hidden by the one in front of it. Nothing in the data caused that; the projection did.

**The shared baseline is gone.** Each bar meets the floor at a different depth, so the floor plane
is no longer one line. Two bars of equal value in different rows do not start at the same height on
the page. That is the single property the whole bar family rests on, and the projection spends it.

**Not one value is printed.** With the axis foreshortened and the baselines staggered, every reading
has to be estimated against a receding grid — the one situation where per-bar labels stop being
optional, and they are absent.

**What it does keep:** a legend is unnecessary, because the two floor edges are labelled directly —
`2022 / 2004` along one, `NO / DK / SE` along the other, each in its own series colour.

## What it does with style

Measured on `graphic.png` (`record.pixel`): ground `#FFFFFF` at **89.230 %**. Chromatic
`#3274DA` **2.056 %** and `#2561C9` **2.023 %**; `#EE5440` **1.037 %** and `#D3433D` **0.938 %**;
neutrals `#283250` **0.986 %** and `#17203B` **0.961 %**. Shape **diverging**, clusters at 216°
(4.687 %, 16 members) and 7° (2.330 %, 8).

**Every series now costs two colours instead of one, at almost exactly a 1 : 1 ratio.** The face and
the shaded side of each prism are separate fills — `#3274DA` / `#2561C9`, `#EE5440` / `#D3433D`,
`#283250` / `#17203B` — and the shares within each pair are within 2 % of each other. A three-series
palette has become a six-value palette, and half of it carries no meaning at all. The cluster
counts say the same thing: 16 distinct members inside the blue cluster where the flat #25 needed 9.

Note also that the axis-label colours are the series colours (`SE` blue, `DK` coral, `NO` navy),
which is the one legend-free device in this plate worth keeping.

## What is transferable

- **Do not project a grouped bar.** The type's whole mechanism is a shared zero baseline; an
  isometric floor removes it, and adds occlusion the data never asked for.
- **If a form is going to be projected anyway, every bar must carry its printed value**, because the
  axis can no longer be read against.
- **Colouring the axis labels in their series' own colour** removes the legend at no cost, and
  survives the projection being a bad idea.
- **A shaded 3D face doubles the palette.** Any colour budget stated for *n* series is really 2*n*.

## What is this piece's own

The isometric camera angle and the wireframe floor.

## What was not verified

The graphic's typography (raster; page-only type source). Whether the rear row is 2022 or a second
depth axis — read off the floor labels by eye. The exact camera angle. One publication.
