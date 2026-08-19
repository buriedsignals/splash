# Five evening stops — a route scrolly, rebuilt

The beat `splash-test-b-route-access` delivered on 2026-08-18, rebuilt here with this tree's own
machinery so the corrections have somewhere to live. Its data, its plate, its geography and its
prose are the original's; what changed is how the picture is assembled.

**Synthetic exercise.** All five programmes and their measurements are fictional, the stops are not
representative, and the temperatures are context rather than a ranking. That claim rides on the
frame itself, not only in this file.

## What the delivered file did, and what it cost

Measured on it at three widths — the account is in
`docs/splash/2026-08-19-route-scrolly-handover.md`:

- the visual was built into **all five step frames** and its boot script bound one of them with
  `querySelector` — singular. The animated copy was the one the scaffold hides from step 2 onward,
  so the four copies a reader actually sees were frozen at their build-time state. The graphic
  repainted **4.4 / 0.0 / 0.0 / 0.0 %** of its marks across the four transitions;
- the same 340 KiB plate was therefore inlined **five times** — 1.33 MB of a 1.80 MB page;
- the plate was forced to `object-fit: cover` under an overlay declaring
  `preserveAspectRatio="xMidYMid meet"`. One crops, the other letterboxes: at 375x812 Lisbon was
  drawn over Switzerland.

## How this one is assembled

**Five pictures, one plate, no runtime script.** Each step's frame carries its own SSR'd drawing —
the route revealed as far as that step's stop, the stops before it at full strength, the ones after
it held back. Nothing runs at read time, so there is no copy to bind and none to leave behind.

**One projection, by construction.** The plate is an `<image>` INSIDE the same SVG as the marks,
filling the same `viewBox="0 0 1400 700"`. There is no `object-fit` anywhere, so the plate and the
marks cannot describe two different places: they are the same projection.

**The plate is emitted once.** Step 1's frame defines `<image id="route-access-plate">`; the other
four `<use>` it. Same-document reference, and `opacity` is not inherited, so the definition resolves
from frames that are themselves at opacity 0.

**The reveal is measured in the path's own units.** `pathLength={1}`, `stroke-dasharray: 1`, and an
offset that is a fraction — never a length in plate units, and no `vector-effect` on a dash that
measures. That pairing is what broke the Danube beat for months; it is refused by
`verify-scrolly.mjs` now.

## The four states

| step | route drawn to | stops at full strength |
| --- | --- | --- |
| 1 Lisbon | its own stop (nothing yet) | 1 |
| 2 Madrid | 15.3% | 1–2 |
| 3 Marseille | 41.1% | 1–3 |
| 4 Milan | 53.8% | 1–4 |
| 5 Athens | 100% | 1–5 |

The fractions are the cumulative length of the route at each stop, computed from the geometry, not
authored.

## Verification

```sh
bun proof/mapmore-scrolly-route-access/render.mjs
bun skills/scrolly/scripts/verify-scrolly.mjs proof/mapmore-scrolly-route-access/render/route-access.html
```
