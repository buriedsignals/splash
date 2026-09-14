---
format: scrolly
type: gantt
---

# Beat — Six pays n'ont jamais quitté le top 10 des émetteurs depuis 1990 (scrolly)

**Type:** gantt (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `gantt` type in the scrolly format, drawn once per filed direction from the same data, membership computation,
runs and claim as `static-gantt-top-ten-tenure`.

## The choreography

A gantt is time laid flat; the scroll gives it back its time with a playhead (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | each row a country, each bar its years in the top 10; in 1990, these ten | — | the playhead at 1990, the ten rows of that year begun, the others faint |
| 2 | to 2008: Ukraine leaves after 1995, Iran enters in 2006, the UK leaves after 2008 | **sweep** | the playhead travels, spans grow behind it, a row's name wakes when it enters |
| 3 | then Saudi Arabia enters in 2009, Canada leaves after 2016, Indonesia enters in 2017 | **sweep** | on to 2024 |
| 4 | six of sixteen never left | **filter** | the six kept in the accent, the ten others stepping back |
| 5 | two rows have a hole (Italy 1991, South Korea 1998–99); Kuwait, one year | **filter + outline** | the interrupted rows and the single year kept, each hole outlined |
| 6 | the reading line | **name** | both years of every run written in its label — the static plate's form |

## Precision

- **Laid out in the reader's pixels**: the label column as wide as the widest label with its dates, measured once,
  so writing the dates in never moves the plot. Below 560 px each name goes above its bar and the bar takes the
  whole width.
- **Ticks that would touch are dropped**, the first and the last kept.
- **Every event a card names is checked against the runs**: who left or entered in which half of the sweep, two
  interrupted rows, one single year, the United Kingdom in from the start.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`. The static beat has no
`creme` render; this page has one.
