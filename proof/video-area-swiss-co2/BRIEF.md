---
format: video
size: landscape
type: area
---

# Beat — La moitié du CO₂ suisse depuis 1858 a été émise après 1986 (video)

**Type:** area. **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen series (`../static-area-swiss-co2/data.csv`) and the same assertions as
`proof/static-area-swiss-co2`: the years are consecutive (an area over a gap would measure unreported years), the stock is
3 158 Mt, half of it is reached in 1986, the 38 later years carry about half (49,9 %), and they are far fewer than the 129
before. The area is drawn from zero — its surface is the stock.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the chart on the whole frame, zero-based; the running stock and its gauge standing in the empty upper
   left.
3. **No end card** — the video ends on the whole curve, the two halves named, the gauge at half; the credit on one line
   under the years.

## The choreography

An area says one thing a line cannot: its surface is the stock. The video **fills it** — the surface advances year by
year from 1858, linear in years, while the stock counts up. Then it **looks for the half**: the surface steps back to its
tint, a rule starts at the right edge of 2024 and travels back through the years, repainting the recent surface in the
accent, while the stock's gauge fills from its right with the share the rule has passed — it stops at 1986, the gauge
at its half mark. Then it **shows why so few years hold so much**: each half's top levels to its mean, the curve becoming
two blocks of the same surface — a long low one, « 129 ans », and a short tall one, « 38 ans ». The curve comes back
whole with both names.

Every outline in the flatten holds the same surface as the curve (a polygon's surface is linear in its points'
heights), so the motion itself is honest.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the height is a year's emissions, from zero | — (furniture) | the ticks (0, 25, 45 Mt) and the years | consecutive years |
| `reveal` | 3 158 Mt since 1858 | **fill + count up** | the surface fills left to right, linear in years; « {n} Mt depuis 1858 » climbs | total |
| `subject` | half since 1986, in 38 years of 167 | **sweep + measure, then flatten** | the surface tints; the rule travels back from 2024, its year riding on it, the recent surface and the gauge's share in the accent, landing on 1986 at half; both halves level into blocks named with their years and lengths | midpoint 1986; 45 % < later share < 50 %; 38 × 3 < 129; each block's surface = its half's |
| `conclusion` | — | **pull back** | the blocks rise and sink back into the curve, the names riding to their seats; the credit | — |
| `hold` | the two halves | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no share printed: the gauge's half mark says it. The names are years and lengths.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
