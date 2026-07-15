# Case 12 — "sans rien": from a bare topic, no article, no data

**Input given to the workflow:** a single topic string —
> « Pourquoi le prix du café est-il si volatil ? »

No article, no dataset. This tests the from-nothing edge, under the hard rule
**never invent data**.

## Ideation (what the system reasons, before producing anything)

1. **What is the core claim?** The *literal* story — "coffee prices swing a lot" — is a
   time series (coffee futures / spot price over years). That is a `d3-lines` chart.
   **But there is no price data in the input, and the system must not fabricate it.**
   So the literal chart is NOT producible from nothing; it would require fetching a real
   series (e.g. ICO / ICE Arabica futures) first. The honest output is to *name that data
   need*, not to invent numbers.

2. **What CAN be shown truthfully with no dataset?** The *reason* the price is volatile:
   supply is geographically concentrated in a few tropical origins, so one country's frost
   or drought moves the whole world price. That is a **geographic explainer** — the same
   class as the Hormuz chokepoint case — expressible from well-known geographic facts and
   qualitative editorial notes, with **no invented numeric data**.

3. **Decision.** Produce the honest, data-free deliverable now (a locator map of the major
   coffee origins + why concentration drives volatility), and flag the follow-up data need
   for the literal price-volatility chart.

## Deliverable produced

`out/coffee-belt-locator.png` — a map-native **locator** of the world's major coffee
origins, annotated with each region's role and the concentration-→-volatility mechanism.
No numbers were invented; only place locations and widely-known qualitative facts.

## Honest follow-up (the data need, not fabricated)

To show the volatility itself, fetch a real price series — e.g. ICE Arabica coffee
futures or the ICO composite indicator, monthly, ~2000–2025 — and route it to a
`d3-lines` chart (annotated at the 2021 Brazil-frost spike and the 2024 highs). That is a
one-line data-fetch away, deliberately NOT invented here.
