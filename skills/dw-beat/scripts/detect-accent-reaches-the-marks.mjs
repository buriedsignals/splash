// THE ACCENT A JOURNALIST RECORDED, AGAINST THE FIELD THE PROVIDER ACTUALLY PAINTS FROM.
//
// Every other producing skill draws its own marks, so the accent recorded in `PALETTE.md` reaches
// them by being the fill it writes. This one delegates: it names a colour in a metadata field and
// hopes. When it names the WRONG field the provider stores the value, echoes it back on a GET, and
// paints in its own default anyway — so the round trip verifies clean, the spec verifies clean, and
// the delivered artefact is in a colour nobody chose. That has now happened twice, on two different
// mark families, each time found only by counting pixels in a delivered file.

/** The guard this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["accentPaintsTheMarks"];

/** Whether the accent this beat recorded is in the field the delegated renderer paints marks from.
 *
 *  ROUND THREE measured it on a bar chart, live, against published chart `1u88u`: `custom-colors`
 *  keyed by the resolved series label was sent and STORED — `GET /v3/charts/1u88u` echoed it back
 *  verbatim — and the bars still rendered in Datawrapper's own `#18a1cd`. It fixed `d3-bars` and
 *  `column-chart` and left every other family on the key it had just proved inert.
 *
 *  ROUND FIVE measured the same defect on the next family out. Off the delivered
 *  `stress-y-rural-broadband` PNG: 2014 pixels of `#18a1cd` against 1811 of the house `#5B8A8A`,
 *  and every one of those 1811 was rule or label — not one of the 186 marks was the newsroom's
 *  colour. Isolated live on chart `cc6eK` (`d3-scatter-plot`, 40 rows, published, PNG exported at
 *  600px zoom 1, pixels counted): `custom-colors` alone gave 475 px of `#18a1cd` and none of the
 *  accent; `base-color` gave 475 px of the accent and none of the blue.
 *
 *  So this is not a check on a chart type. It is the one-line statement of what the two live
 *  measurements found: the accent has to be in `base-color`, whatever the mark, and a payload that
 *  carries it only in `custom-colors` is a delivered artefact in the provider's colour. Compared
 *  case-insensitively because a hex a journalist typed and a hex a provider echoes differ in case
 *  and in nothing else; `null` accent means nothing was recorded to check, and this says nothing. */
export function accentPaintsTheMarks(payload, accent) {
  if (typeof accent !== "string" || accent.trim() === "") return true;
  const painted = payload?.metadata?.visualize?.["base-color"];
  if (typeof painted !== "string") return false;
  return painted.trim().toLowerCase() === accent.trim().toLowerCase();
}
