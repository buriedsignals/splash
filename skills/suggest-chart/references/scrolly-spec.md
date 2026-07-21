# scrolly — exact emitted config JSON (map track + chart track)

Detail for the `scrolly` producer path referenced from `skills/suggest-chart/SKILL.md`
(§ scrolly, both the map track and the *Chart scrolly* sub-section). The field discipline
(labelField/subject/palette/lang, the `valueKind` narrative hint, and the `beats` narrative
control) stays in `skills/suggest-chart/SKILL.md` itself — only the JSON shapes are here. **The
"Map colour" rule mentioned in the map-track JSON below lives in `map-dw-spec.md`** (shared
across all map producers — map-dw, map-native, scrolly).

## Map track — emitted config

```json
{
  "producer": "scrolly",
  "regionKey": "<data column holding ISO-A3 codes>",
  "valueField": "<data column holding the normalised rate>",
  "labelField": "<data column holding the region NAME in the deliverable language>",
  "rows": [{ "<regionKey>": "<ISO-A3>", "<labelField>": "<region name>", "<valueField>": <number> }, "…"],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, ≥12 chars, not a label or year range>",
  "description": "<what / when / where context>",
  "unit": "<long legend label, e.g. 'Share of renewables (%)'>",
  "valueUnit": "<short callout unit, e.g. '%'>",
  "subject": "<the topic hint, e.g. 'electricity access' — drives the subject-fit ramp>",
  "scaleType": "sequential",
  "palette": "<subject-fit registry ramp — see the Map colour rule; energy → 'oranges', water → 'blues'>",
  "valueKind": "temporal | magnitude",
  "revealMode": "context",
  "lang": "<deliverable language, e.g. 'fr' — localizes numbers, 'Source', beat descriptors>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```

## Chart track — emitted config

```json
{
  "producer": "scrolly",
  "nativeType": "line | bar | scatter",
  "title": "<the insight — sentence case, not a label or year range>",
  "description": "<what / when context — shown on the intro card>",
  "insight": "<the closing takeaway line>",
  "unit": "<LONG axis label, e.g. 'Share of global CO₂ (%)' or 'Births per woman'>",
  "valueUnit": "<SHORT callout unit for the scroll captions, e.g. '%' or 't' — keep it terse; a long unit is NOT repeated in every caption>",
  "directLabel": "<line only: the y series column>",
  "orientation": "horizontal",
  "source": { "name": "<honest source>", "url": "<URL>" },
  "data": "col1,col2\\n<CSV rows — line: x,y · bar: category,value · scatter: label,x,y>",
  "beats": [{ "x": "<line: x value>", "xEnd": "<line, optional: range end>", "category": "<bar: category value>", "text": "<the confirmed step caption>" }, "… (OPTIONAL — only when the journalist confirmed an explicit beat plan; omit for the auto narrative)"]
}
```
