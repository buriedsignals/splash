# End-to-end proof — ② → dw-chart (live)

Closing success-criterion 1 with a real produced chart (not just structural composition).

Case: `unemployment-trend`. Acting as ② (runtime procedure + KB refs) emitted a ChartSpec
(type d3-lines, insight title, Okabe-Ito base colour, an annotation on the 2020 peak).

1. **Deterministic gate** (`scoreSpec`, family `change-over-time`, maxWarnings 0):
   `{ validates:true, familyMatch:true, guardrailsOk:true, pass:true }`
2. **Live production** (`produceChart`, real Datawrapper API): published
   `https://datawrapper.dwcdn.net/WM8j7/1/` — title is the insight, the "Pandemic spike"
   annotation renders on the 2020 peak, source cited, blue #0072B2 line.

So the ②→dw-chart link is proven live, not only by composition.
