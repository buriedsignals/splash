---
format: scrolly
type: choropleth
---

# Beat — Sept pays européens dépassent 94 % d'électricité bas-carbone — six au nord-ouest, et l'Albanie (scrolly)

**Type:** choropleth (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone
to a wide desktop.

The `choropleth` type in the scrolly format, drawn once per filed direction from the same data, claim,
derived neighbours, north-west measurement, ramp and plate tints as `static-choropleth-europe-lowcarbon`.
Each direction keeps its own palette and faces.

## The choreography

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the low-carbon share, 40 reporting countries | — | Europe, empty: sea and land in the plate's tints |
| 2 | the colour is a class, from under 40 % to 94 % and more | **reveal in order** | the classes arrive one by one, lowest first, with the key |
| 3 | above 94 %, only seven remain | **filter + count** | every country under the floor steps back to bare land; "7 pays au-dessus de 94 %" counts |
| 4 | six are north or west | **name** | Iceland, Sweden, Norway, Finland, France, Switzerland named |
| 5 | the seventh is Albania, 100 %, and its three neighbours are all under 60 % | **zoom + name** | the camera travels onto the Balkans; Albania ringed, Montenegro, North Macedonia and Greece named with their shares |
| 6 | Ukraine has no reported production; Russia and Turkey coloured on their national share | **pull back** | Europe again, every class, the seven and Ukraine named |

## Precision

- **The static plate's camera**: Web Mercator on its own bake bounds and aspect, through the same `fitBounds`
  arithmetic, so every country sits where it sits on the plate; the neighbours are derived in degrees on
  the raw rings, the north-west measured on the drawn seats.
- **Vectors, not the MapTiler raster**: each country takes its own fill as the scroll moves, and the zoom
  is a camera move. Relief and the basemap's own labels are what is given up; the source line names the
  Natural Earth shapes. Sea and land keep the plate's tints (`plateTints`).
- **The zoom is the viewBox travelling**, kept inside the frame, Albania placed in the upper third so the
  card resting on the middle does not cover it. Close-up names appear only once the camera has arrived.
- **Names are seated at each country's most interior point** (never on its coast), placed through the
  SVG's screen matrix, and a name that would touch another steps down.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
