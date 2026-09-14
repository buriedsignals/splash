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
2. **The story** — the chart on the whole frame, zero-based; the running stock standing in the empty upper left.
3. **No end card** — the video ends on the two halves named; the credit.

## The choreography

An area says one thing a line cannot: its surface is the stock. What only a video can do is **fill it**: the surface
advances year by year from 1858, linear in years, while the stock counts up — the viewer watches the last few decades
pour in as much as the whole century before. Then **the split**: the rule at 1986, the two surfaces tinted apart and
named with their shares.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | the height is a year's emissions, from zero | — (furniture) | the ticks (0, 25, 45 Mt) and the years | consecutive years |
| `reveal` | 3 158 Mt since 1858 | **fill + count up** | the surface fills left to right, linear in years; « {n} Mt depuis 1858 » climbs | total |
| `subject` | half since 1986, in 38 years of 167 | **split + name** | the 1986 rule lands with its year; the earlier surface steps back to its tint; « 1858–1986 · 50,1 % » and « 1987–2024 · 49,9 % » inside each | midpoint 1986; 45 % < later share < 50 %; 38 × 3 < 129 |
| `conclusion` | — | — | the credit | — |
| `hold` | the two halves | — | nothing | hold = conclusion |

## Write as little as the picture allows

No standfirst, no reading line, no peak or last reading named: the stock and the two shares are the claim.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
