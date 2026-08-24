---
planVersion: 1
findingIds: [slope-universal-increase-gap-persists]
---

# Brief — The gap that persists

## Takeaway

Every one of ten European countries increased heat-pump adoption between 2021 and 2025, with the average share rising from 20.5% to 29.8%, yet the gap between Nordic leaders (Norway at 64% and Sweden at 62%) and the lowest values (the United Kingdom at 9% and Spain at 12%) remains wide in 2025.

## Evidence hierarchy

1. **All ten lines slope upward** — the universal increase is the primary read, visible instantly
2. **Vertical spread between endpoints** — the persistent gap is the secondary read, carried by the distance between the highest and lowest lines at the right edge
3. **Per-country detail on hover/tap** — each country's exact 2021 → 2025 values and percentage-point change, the detail the static frame omits

## Reveal order

Title and axes establish first. The ten slope lines draw simultaneously (staggered slightly by 50ms each for texture). End labels appear after the lines settle. No filter — the data has no orthogonal dimension to narrow by.

## Single accent

`#D4A853` (amber) for all slope lines. The subject is the group, not any one country, so no single country is emphasised above the others. All lines share the same accent.

## Source

`Source: Splash Test Desk synthetic dataset`

## Anti-patterns

- No causation implied — the data contains no policy, climate, price, or housing variables
- No forecasting beyond 2025 — the endpoints are the claim
- No explanations for national differences — the sample is too small and the values fictional
- No map — geography merely labels the rows; the argument is about change and gap, not spatial pattern
- No emphasis on a single country — the subject is the group, and the finding is about the pattern they form together