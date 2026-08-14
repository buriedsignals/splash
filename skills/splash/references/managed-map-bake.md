# Managed map bake contract

Use this contract only after Storyboard has confirmed a map treatment and format. The craft skill
still writes the bespoke visual; this contract gives Engine one fixed, non-executable description of
the basemap plate and projected geometry that visual needs.

Write `beats/<outputId>/MAP-BAKE.json`, then invoke the closed operation from the agent or
maintainer boundary. Never ask the journalist to type this command:

```sh
printf '%s\n' '{"storyId":"<storyId>","outputId":"<outputId>","parameters":{"contractDigest":"sha256:<digest>"}}' \
  | bsig run splash map-bake
```

Do not place a credential in the command, contract, story, or environment. Engine verifies the
story, contract, declared input digests, installed runtime, and managed browser before it reads
`MAPTILER_KEY` from the credential broker.

The version 1 contract has this exact shape:

```json
{
  "schemaVersion": 1,
  "treatment": "map.proportional-symbol",
  "format": "web",
  "camera": {
    "bounds": [[-8, 44], [8, 56]],
    "width": 1000,
    "height": 640,
    "settleMs": 5000
  },
  "basemap": {
    "style": "dataviz-light",
    "labels": "hide-all"
  },
  "geography": {
    "path": "source/places.geojson",
    "digest": "sha256:<digest>",
    "idProperty": "id",
    "nameProperty": "name",
    "studyIds": ["paris", "london"]
  },
  "data": {
    "path": "source/values.json",
    "digest": "sha256:<digest>",
    "format": "json",
    "joinProperty": "id"
  },
  "anchors": [
    { "id": "subject", "coordinates": [2.35, 48.86] }
  ],
  "outputs": {
    "plate": "plate.png",
    "geometry": "geometry.json"
  }
}
```

Rules:

- `treatment` is one selectable shipped map treatment. Proof-only treatments are refused.
- `format` is `static`, `web`, `video`, or `scrolly` and must match Storyboard.
- `bounds` are `[west, south]`, `[east, north]`; width and height are 240–4096 pixels with a
  managed total-pixel limit. `settleMs` is 1000–30000.
- `labels` is `hide-all` for a data surface or `keep-place-labels` for a locator where the basemap
  names do editorial work.
- Input paths are normalized paths under `source/` or the selected `beats/<outputId>/` directory.
  Both inputs are immutable for the bake through their SHA-256 digests. Geography is a bounded
  GeoJSON `FeatureCollection`; every `studyIds` entry must resolve exactly once through
  `idProperty` and have a non-empty `nameProperty`.
- `data.format` is `csv`, `tsv`, `json`, or `geojson`. The bake records and verifies the source but
  does not invent joins or transformations; the bespoke producer remains responsible for those.
- Output names are fixed. A successful bake writes an immutable digest-addressed directory under
  `beats/<outputId>/map-bake/<contractDigest>/` containing `plate.png`, `geometry.json`, and
  `RECEIPT.json`. Repeating the same verified contract reuses that directory.

The contract intentionally does not carry JavaScript, a command, an arbitrary output path, a
provider URL, or a key. A new camera mode or geography representation requires a later schema
version; it must not silently broaden version 1.
