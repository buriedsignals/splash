# Beat — following the Danube in four scroll steps, the map only ever gaining ground

**Type:** flow / route map, carried by the scroll vehicle. **Medium/genre:** map / scrolly.
**Channel:** article web, one self-contained `render/danube-scrolly.html` (505 KB, plate inlined),
**four steps**, one fixed camera over the sibling static beat's own 900 × 420 plate — reused, not
re-baked per step.

## Claim

The Danube touches ten countries and nine of them can be drawn; scrolled, they arrive in the order
the river reaches them, and the map never loses ground it has gained. Each step adds territories and
extends the line; nothing already revealed is taken away.

## Data

- Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines; territory shapes — Natural
  Earth 1:50m Admin 0 Countries.
- `danube-route.csv`: **911 points**, `seq` 0 → 910, strictly consecutive. Byte-identical (same md5)
  to `proof/mapmore-flow-danube` and `proof/mapgen-flowmap-video`.
- `countries.geojson`: 16 territories, Moldova included.

## Exact values — computed 2026-08-09, and every number in the prose is derived, not typed

The step prose is a FUNCTION of the computed facts, not a literal string — this beat had three false
statements in an earlier literal version, so the numbers now come from the route:

- **"two countries before Vienna"** (step 1). Recomputed: the nearest route sample to Vienna
  (16.3738, 48.2082) is **index 342**, 3.9 km from the city. First entry indices are Germany 0,
  Austria 249, **Slovakia 355** — so exactly **two** countries are touched by index 342. Slovakia's
  first entry comes *after* Vienna, which is why the earlier "three" was wrong.
- **"close to 440 km"** for the Romania–Bulgaria border zigzag (step 3). Recomputed: Bulgaria is the
  rarer label along the route (51 points against Romania's 174), first at index 722, last at index
  810; the great-circle distance along the route between them is **438.1 km**, which rounds to 440.
- **The Iron Gate is named in step 3, not step 2.** The gorge's nearest route sample is **index
  682**; step 2 ("plain") stops revealing at index 639, so naming it there described a stretch the
  graphic had not yet drawn. Step 3 reveals through index 898, well past it.
- The dropped superlative was right to drop: Germany's own opening run measures **534 km**, longer
  than the 438 km Romania–Bulgaria stretch, so "the longest single stretch of the whole journey" was
  false.
- **Moldova: 0 of 911 points** — the reason only nine of ten appear.
- Crossing order, derived: Germany → Austria → Slovakia → Hungary → Croatia → Serbia → Romania →
  Bulgaria → Ukraine.

## Subject and accent

One accent, `#E69F00`, on the route alone; territories take a separate categorical cycle that
excludes it. Numbered badges carry order.

## Step order — cumulative, never subtractive

| Step | Adds | Line revealed through |
| --- | --- | --- |
| `source` | Germany, Austria, Slovakia | Hungary's own first index |
| `plain` | Hungary, Croatia, Serbia | Romania's own first index |
| `border-run` | Romania, Bulgaria | Ukraine's own first index |
| `delta` | Ukraine | end of route |

Each step's territory set is its own countries PLUS every earlier step's, so the map only ever gains
ground — which is what "the map advances" has to mean for a route. The line is revealed through the
NEXT territory's first index rather than the current one's, so it visibly reaches the badge it is
about to introduce instead of stopping short of it.

## Anti-patterns for this case

- **A scrolly must carry different states, not the same picture four times.** The test this beat has
  to pass is whether each step shows something the previous one did not; here each adds territories
  and extends the line, and if it did not, this should have been an animated beat instead.
- **Never let the prose name something the graphic has not drawn yet.** The Iron Gate case is the
  worked example: index 682 named in a step that stops at 639. Any place named in a step's prose has
  to sit at or before that step's own reveal cutoff, and the cutoff is a number, so it can be
  checked.
- Derive every count and distance in the prose from the route. All three of this beat's earlier
  defects were hand-typed values: a count, a superlative and a place.
- "Crossed" is not "flowed through" — the river IS the border for long stretches, and the closing
  step carries Moldova's exclusion rather than quietly rounding ten down to nine.
- One camera. The plate is baked once and shared with the static sibling; re-baking per step would
  move the ground under the reader while the line is moving.

## Source line

`River course: Natural Earth 1:10m Rivers + Lake Centerlines. Territory shapes: Natural Earth 1:50m Admin 0 Countries. Same bake as the sibling static flow-map beat (mapmore-flow-danube) — one fixed camera, reused rather than re-baked per step.`
