---
format: video
size: landscape
type: locator
---

# Beat — La plus grosse centrale bas-carbone d'Europe est en Ukraine (video)

**Type:** locator (map). **Medium/format:** map / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen files (`../static-locator-zaporizhzhia/stations.csv`, `electricity.csv`, `places.csv`) and the
same assertions as `proof/static-locator-zaporizhzhia`: the largest low-carbon station in the register is in Ukraine, at
6 000 MW installed, and Ukraine is the one country whose 2024 generation the electricity file does not report. The same
naming rules: the country the story is in and its neighbours in frame, the six largest settlements in frame, three bodies
of water — three classes of place, three treatments.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the map on the whole frame, the camera the viewBox: Europe, then the close-up the still frames.
3. **No end card** — the video ends on the close-up with every name; the credit in a sea corner.

## The choreography

A locator answers « where ». What only a video can do is **travel there**: the viewer is shown the continent first, the
place is ringed on it, and the camera closes in until the names that let a reader place it can be printed.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | Europe, and a point in Ukraine | **name** | the continent; Ukraine takes its tint and its name; the station's ring lands | largest station in UKR |
| `reveal` | here | **zoom** | the camera travels from Europe to the still's window, eased; its regions' borders are drawn as it closes in; once it has settled, the neighbours' names (capitals), the six largest settlements (a dot and a name) and the waters (italic) land | the naming rules |
| `subject` | Zaporijjia, 6 000 MW installed | **name + count up** | the ring closes on the station; « Zaporijjia » lands and « MW installés » counts up to 6 000 | capacity ≥ 6 000 MW |
| `conclusion` | — | — | the credit | — |
| `hold` | the located station | — | nothing | hold = conclusion |

## The focus country's regions

The owner (2026-09-14): « si tu focus sur un pays il faut montrer les frontières des régions ». Once the camera closes on
Ukraine, its oblasts' borders are drawn — thinner and paler than a national border, landing as the camera settles and
absent from the continental shot. Source: Natural Earth 10 m admin-1 boundary lines, fetched 2026-09-14
(`curl -sSL https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lines.geojson`,
10 179 features, sha256 `1a1f30cc…c75b6`), filtered to Ukraine's 57 lines and rounded to three decimals: `regions.geojson`.

## Write as little as the picture allows

No standfirst and no reading line: « installés » on the figure carries « capacity, not output ». No key: a locator has
nothing to encode.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
