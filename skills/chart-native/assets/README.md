# assets

- `sample-data/series.json` — the runnable sample: a generic small-newsroom monthly time series
  (library visits, with a COVID dip and recovery). Shape:
  `{ title (insight), source{name,url}, unit, directLabel, xField, yField, xType:"time", points:[{date,value}] }`.
  Swap this file to retarget all three formats; the component and renderers read it directly.
- `preview.png` — a still of the produced static chart.

What's generic vs project-specific: the geometry core, the component, and the renderers are generic.
Per-project = `series.json` (your data + insight title + source + direct label) and, for video, the
`durationInFrames` speed knob in `remotion/src/Root.tsx`.
