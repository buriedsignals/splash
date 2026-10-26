// The generic half of a marimekko WEB beat, taken from
// proof/web-marimekko-electricity-mix/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a mosaic whose
// column WIDTH is each column's total and whose band HEIGHT is its share, so a tile's area is a real
// quantity; a "hold still" control (the `hold` vocabulary) lets the reader freeze one factor of that
// product — "the widths" (every column the same width: height says only the share) or "the scale"
// (every column the same width, height = the column's total from a common floor) — with a figure
// printed on the compared tile and a sentence giving both ends (CSS only, works without JS); every
// tile answers hover/tap/Tab with its share, its amount and its part of the whole. This file lays out
// the mosaic and both held states and computes the comparison between the two compared tiles;
// ./beat.mjs — the one file the model writes — gives the columns, the bands and the WORDS.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedMarimekkoWeb, FRAME } from "./DirectedMarimekkoWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** The gap between two columns, in the geometry's units — the worked example's. */
const GAP = 6;

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "columns", "bandOrder", "tracked", "unit", "widthName", "claimNote", "format", "percent", "detail", "hold", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "percent", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const H = beat.hold;
  for (const field of ["label", "noneLabel"]) if (typeof H?.[field] !== "string") throw new Error(`hold.${field} must be a string (see CONTRACT.md)`);
  for (const option of ["parts", "scale"]) {
    if (typeof H?.[option]?.label !== "string") throw new Error(`hold.${option}.label must be a string (see CONTRACT.md)`);
    for (const fn of ["announce", "note", "figure"])
      if (typeof H[option][fn] !== "function") throw new Error(`hold.${option}.${fn} must be a function (see CONTRACT.md)`);
  }

  // ── the bands and the columns ────────────────────────────────────────────────────────────────
  const order = beat.bandOrder;
  if (!Array.isArray(order) || order.length < 2 || order.length > 10) throw new Error(`bandOrder holds ${order?.length ?? 0} bands; a marimekko stacks 2 to 10, bottom to top`);
  for (const b of order) if (!b || typeof b.key !== "string" || typeof b.label !== "string") throw new Error(`every band is { key, label }; got ${JSON.stringify(b).slice(0, 100)}`);
  if (new Set(order.map((b) => b.key)).size !== order.length) throw new Error(`two bands share a key in bandOrder`);
  if (!order.some((b) => b.key === beat.tracked)) throw new Error(`tracked ${JSON.stringify(beat.tracked)} is not the key of a band (${order.map((b) => b.key).join(", ")})`);
  if (order[0].key !== beat.tracked) throw new Error(`put the tracked band (${beat.tracked}) first in bandOrder — at the bottom of every column, where the eye compares its tiles`);
  // Drawn top to bottom: the last of bandOrder at the top in the lightest tone, the tracked band at the bottom in the darkest.
  const drawnOrder = [...order].reverse();
  const cols = beat.columns;
  if (!Array.isArray(cols) || cols.length < 2 || cols.length > 8) throw new Error(`columns holds ${cols?.length ?? 0} columns; a marimekko draws 2 to 8`);
  for (const c of cols) {
    if (!c || typeof c.label !== "string" || !c.values || typeof c.values !== "object") throw new Error(`every column is { key, label, values: { bandKey: value } }; got ${JSON.stringify(c).slice(0, 100)}`);
    assertNumbers(order.map((b) => [`${c.label} ${b.key}`, c.values[b.key]]));
    if (order.some((b) => c.values[b.key] < 0)) throw new Error(`${c.label} holds a negative band: a tile's area is a quantity, never below zero`);
  }
  if (new Set(cols.map((c) => String(c.key))).size !== cols.length) throw new Error(`two columns share a key`);
  if (new Set(cols.map((c) => c.label)).size !== cols.length) throw new Error(`two columns share a label`);
  const columnsIn = cols.map((c) => ({ ...c, key: String(c.key), total: order.reduce((s, b) => s + c.values[b.key], 0) })).sort((a, b) => b.total - a.total);
  const grand = columnsIn.reduce((s, c) => s + c.total, 0);
  const thin = columnsIn.filter((c) => c.total / grand < 0.03);
  if (thin.length) throw new Error(`${thin.map((c) => c.label).join(", ")} ${thin.length > 1 ? "are" : "is"} under 3 % of the whole: too narrow a column to read — leave it out and say so in limits`);

  const trackedTotal = columnsIn.reduce((s, c) => s + c.values[beat.tracked], 0);
  const holders = [...columnsIn].sort((a, b) => b.values[beat.tracked] - a.values[beat.tracked]).map((c) => ({ key: c.key, label: c.label, value: c.values[beat.tracked] }));
  const counted = { columns: columnsIn, grand, trackedTotal, trackedShare: (trackedTotal / grand) * 100, holders };
  beat.check(counted);
  assertDrawsClaimColumn(columnsIn.flatMap((c) => order.map((b) => c.values[b.key])), HERE);
  // The title states figures the plate carries: the tracked band's whole, its share, the holders'
  // part of it, every tile's amount and every column's total.
  const top2 = holders.length > 1 ? ((holders[0].value + holders[1].value) / Math.max(trackedTotal, 1e-12)) * 100 : 0;
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...columnsIn.map((c) => c.total), ...holders.map((h) => h.value), trackedTotal, counted.trackedShare, top2, grand], "tiles");

  // ── the mosaic: width = total, height = share ────────────────────────────────────────────────
  const usable = FRAME.width - GAP * (columnsIn.length - 1);
  let cursor = 0;
  const columns = [];
  const bands = [];
  const bandAt = new Map();
  columnsIn.forEach((c, ci) => {
    const code = `c${ci + 1}`;
    const w = (c.total / grand) * usable;
    columns.push({ code, name: plain(c.label), x: cursor, w, twh: plain(beat.format(c.total)) });
    let y = 0;
    drawnOrder.forEach((band, tone) => {
      const value = c.values[band.key];
      const share = c.total > 0 ? (value / c.total) * 100 : 0;
      const h = c.total > 0 ? (value / c.total) * FRAME.height : 0;
      if (h > 0) {
        const pct = plain(beat.percent(share / 100));
        const reading = { columnLabel: c.label, bandLabel: band.label, share, value, grandShare: (value / grand) * 100, grand, column: c, band };
        const tile = { code, source: `b${tone + 1}`, x: cursor, w, y, h, tone, label: pct ? plain(`${band.label} ${pct}`) : plain(band.label), detail: plain(beat.detail(reading)) };
        bands.push(tile);
        bandAt.set(`${c.key}|${band.key}`, tile);
      }
      y += h;
    });
    cursor += w + GAP;
  });
  if (new Set(bands.map((b) => b.detail)).size !== bands.length)
    throw new Error(`detail() prints the same sentence for two tiles: every tile must answer with its own reading (name its column and its band)`);

  // ── the two tiles the held states compare ────────────────────────────────────────────────────
  const compare = beat.compare ?? holders.slice(0, 2).map((h) => h.key);
  if (!Array.isArray(compare) || compare.length !== 2 || compare[0] === compare[1]) throw new Error(`compare must name two different column keys, e.g. ["${holders[0].key}", "${holders[1]?.key}"]`);
  const pairOf = compare.map((key) => {
    const c = columnsIn.find((z) => z.key === String(key));
    if (!c) throw new Error(`compare names ${JSON.stringify(key)}, which is not the key of a column (${columnsIn.map((z) => z.key).join(", ")})`);
    const tile = bandAt.get(`${c.key}|${beat.tracked}`);
    if (!tile) throw new Error(`${c.label} draws no ${beat.tracked} tile to hang the comparison on: compare two columns that hold some`);
    return { c, tile, words: { key: c.key, label: c.label, total: c.total, value: c.values[beat.tracked], share: (c.values[beat.tracked] / c.total) * 100 } };
  });
  const [A, B] = pairOf;
  const r = {
    a: A.words,
    b: B.words,
    valueRatio: A.words.value / B.words.value,
    shareRatio: B.words.share / A.words.share,
    totalRatio: A.words.total / B.words.total,
    areaGapPct: (A.words.value / B.words.value - 1) * 100,
    grand,
    trackedTotal,
    trackedShare: counted.trackedShare,
  };

  const EQUAL_W = (FRAME.width - GAP * (columns.length - 1)) / columns.length;
  const maxTotal = Math.max(...columnsIn.map((c) => c.total));
  const place = (column, X, sx, sy) => ({ key: column.code, tx: X - column.x * sx, ty: FRAME.height * (1 - sy), sx, sy });
  const equalColumns = (sy) => columns.map((column, i) => place(column, i * (EQUAL_W + GAP), EQUAL_W / column.w, sy(column, i)));
  const centreOf = (tile) => ({ lx: tile.x + tile.w / 2, ly: tile.y + tile.h / 2 });
  const words = (option) => ({ announce: plain(H[option].announce(r)), note: plain(H[option].note(r)), text: plain(H[option].figure(r)) });
  const parts = words("parts");
  const scale = words("scale");
  for (const [name, w] of [["parts", parts], ["scale", scale]])
    for (const side of [A, B])
      if (!w.note.includes(plain(side.c.label)))
        throw new Error(`hold.${name}.note() compares the two tiles, so it must name both columns (${A.c.label} and ${B.c.label}); it says: ${w.note}`);
  if (!parts.announce.includes(plain(H.parts.label))) throw new Error(`hold.parts.announce() must contain hold.parts.label (${H.parts.label}); it says: ${parts.announce}`);
  if (!scale.announce.includes(plain(H.scale.label))) throw new Error(`hold.scale.announce() must contain hold.scale.label (${H.scale.label}); it says: ${scale.announce}`);
  const hold = {
    label: plain(H.label),
    noneLabel: plain(H.noneLabel),
    options: [
      { key: "parts", label: plain(H.parts.label), announce: parts.announce, note: parts.note, figure: { text: parts.text, col: B.tile.code, ...centreOf(B.tile) }, columns: equalColumns(() => 1) },
      { key: "twh", label: plain(H.scale.label), announce: scale.announce, note: scale.note, figure: { text: scale.text, col: A.tile.code, ...centreOf(A.tile) }, columns: equalColumns((_, i) => columnsIn[i].total / maxTotal) },
    ],
  };
  /** The tile whose own label steps aside for the figure printed over it. */
  const figureHides = [
    { slug: "parts", value: `${B.tile.code}-${B.tile.source}` },
    { slug: "twh", value: `${A.tile.code}-${A.tile.source}` },
  ];

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const widthNote = plain(beat.widthName);
  const claimNote = plain(typeof beat.claimNote === "function" ? beat.claimNote(counted) : beat.claimNote);
  const toneLabels = drawnOrder.map((b) => plain(b.label));
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ ...counted, compared: r }) : beat.alt);

  const facts = beatFacts(columns.map((c, i) => ({ key: c.code, label: c.name, value: columnsIn[i].total })), { subject: holders[0].label, declaredSequence: plain(beat.unit) });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${columns.map((c) => `${c.name} ${c.twh}`).join(" ")} ${toneLabels.join(" ")} ${hold.label} ${hold.noneLabel} ${hold.options.map((o) => `${o.label} ${o.announce}`).join(" ")}`,
    annot: `${claimNote} ${widthNote} ${hold.options.map((o) => o.note).join(" ")}`,
    value: `${bands.map((b) => b.label).join(" ")} ${hold.options.map((o) => o.figure.text).join(" ")}`,
  };

  const interaction = {
    earns:
      `An area is a product, and the eye cannot factor a product: the two compared tiles are ${Math.abs(r.areaGapPct).toFixed(0)} % apart in area while one share ` +
      `is ${r.shareRatio.toFixed(2)} times the other. A still can state those numbers; it cannot hold one dimension still while the reader watches the other move.`,
    controls: [
      {
        question: "Is this tile large because its column is large, or because this band weighs heavily in it?",
        gesture: "toggle-a-comparison",
        changes:
          "The columns slide and stretch to one width: width says nothing any more and height alone speaks, either as the share of the column or as the amount from a common floor. " +
          "The measured tile carries its figure and a sentence under the control gives both ends.",
        parameter: "which of the two dimensions is held still",
        authorPicked: "none",
        readerPicks: ["none", "parts", "twh"],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this tile worth, and what part of the whole?",
        gesture: "ask-a-mark",
        changes: "The tile answers with its column, its band, its share, its amount and its part of the whole — the quantity the area stands for.",
        parameter: "which tile is asked about",
        authorPicked: `${A.c.label} / ${order[0].label}`,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedMarimekkoWeb,
        props: {
          bands,
          columns,
          hold,
          figureHides,
          tones: drawnOrder.length,
          toneLabels,
          widthNote,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          claimNote,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
