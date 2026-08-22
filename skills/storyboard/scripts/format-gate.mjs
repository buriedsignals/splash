const FORMAT_COPY = {
  static: {
    label: "Static / print",
    tradeoff: "one fixed graphic, suitable for print and non-interactive placement",
  },
  web: {
    label: "Interactive web",
    tradeoff: "a responsive page with exact values available on hover, tap, and keyboard focus",
  },
  video: {
    label: "Video",
    tradeoff: "a timed build for broadcast or social video",
  },
  scrolly: {
    label: "Scrollytelling",
    tradeoff: "a fixed visual whose state changes with the article's scroll sequence",
  },
};

export const PUBLICATION_FORMATS = Object.freeze(Object.keys(FORMAT_COPY));

/**
 * THE REACHABILITY ANSWER, ONE LEVEL BELOW THE PAIR — the cells this toolchain offers and cannot
 * draw, named one by one with the measurement that put each of them here.
 *
 * `formatGap` and `confirmFormatReachable` (`propose.mjs`) answer about a MEDIUM and a FORMAT, and
 * they are right at that grain. What they cannot see is the TREATMENT, which is chosen two
 * movements later (⑩), and a medium/format pair can be entirely producible while one treatment
 * inside it has no producer at all.
 *
 * ROUND SIX MEASURED EXACTLY ONE SUCH CELL, on `stories/stress-ab-emigration-flows` — 29 defects,
 * the highest of any beat in six rounds, and five silent failures every one of which was found by
 * driving the page rather than by a test. Its slot recorded `medium: map`, `format: web`,
 * `reachable: yes`, `chosen: "Flow map (route)"`. Measured against the tree:
 *
 *   - `map/web` is TRUE at its own grain and stays on the menu: choropleth, dot density, hex grid,
 *     locator and proportional symbol all render and deliver on the web, with committed proof
 *     pages. Withdrawing the pair would make five working treatments unreachable to close a gap in
 *     one — a false answer in the other direction.
 *   - `map-web` holds no flow machinery whatever: its seed, its pure geometry core, its live-plan
 *     builder and its interaction model are every one of them proportional-symbol. The beat that
 *     needed one wrote 1,500 lines of it by hand, inside the story, off doctrine.
 *   - `map-beat/references/types/flow-map.md` says the same thing in the survey a gate reads:
 *     "THIS TOOLCHAIN HOLDS NO SHEET AND NO PRODUCER FOR AN OD FLOW DIAGRAM". The doctrine already
 *     knew; nothing between the format gate and the render ever asked it.
 *
 * A LIST, AND EXACT ON PURPOSE. The general answer would be a per-treatment format declaration in
 * the catalogue, and the field for it exists (`visual-catalog.json`'s `treatments[].formats`) — it
 * carries all four formats for all forty-one treatments and therefore discriminates nothing. Giving
 * forty-one treatments real values is a judgement per treatment, not a measurement, and this file
 * will not invent forty of them to look complete. `proofFormats` is not the substitute: it records
 * what happens to be rendered on disk, and gating on it would withdraw more than twenty treatments
 * nobody has proven yet but this toolchain can produce. So each row here carries its own
 * measurement, the same way `splash/test/filters-are-declared-or-absent.test.ts`'s own legacy list
 * does, and the list going stale is a red test rather than a silent widening.
 */
export const TREATMENT_FORMAT_GAPS = Object.freeze({
  "flow map route/web":
    "a route map has no producer in this toolchain for the web — map-web draws proportional " +
    "symbols, choropleths, dot density, hex grids and locators, and holds no flow machinery at " +
    "all. A route reads on a static frame or in a video, where the journey is revealed rather " +
    "than interrogated; and an origin-destination table is not a route map either " +
    "(map-beat/references/types/flow-map.md), it is carried by a proportional-symbol map of the " +
    "total leaving each origin, by a matrix heatmap, or by a chart of the largest corridors",
});

/**
 * A treatment's name reduced to the tokens two people would agree on — the same shape
 * `producer-gate.mjs` reduces a Datawrapper alias to, written out here rather than imported so the
 * two gates do not share a mutable table. "Flow map (route)", "flow / route map" and "route map"
 * are one treatment under three spellings, and a gate that only recognised the catalogue's own
 * label would be a gate a journalist's own words walk straight past.
 */
function treatmentTokens(value) {
  return new Set(
    String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean),
  );
}

/** Words that name a MEDIUM rather than a treatment. A spelling made of nothing else — a bare
 *  "map" — names no treatment at all and must not match a row just by being a subset of it. */
const GENERIC_TOKENS = new Set(["map", "chart", "diagram", "plot", "graphic"]);

const GAPS = Object.entries(TREATMENT_FORMAT_GAPS).map(([key, why]) => {
  const cut = key.lastIndexOf("/");
  return { tokens: treatmentTokens(key.slice(0, cut)), format: key.slice(cut + 1), why };
});

/**
 * A spelling matches a row when every word in it is one of the row's own AND at least one of them
 * names the treatment rather than the medium. "Flow map (route)" is the catalogue's label,
 * "flow / route map" is what the survey's alternative-first beats write, and "flow map" and "route
 * map" are what a journalist writes; all four are this one treatment. "Proportional symbol" is not
 * a subset of it and does not match, and a bare "map" carries no treatment word and does not
 * either.
 */
function matches(row, tokens) {
  if (tokens.size === 0) return false;
  for (const token of tokens) if (!row.tokens.has(token)) return false;
  for (const token of tokens) if (!GENERIC_TOKENS.has(token)) return true;
  return false;
}

/**
 * `null` when this TREATMENT in this FORMAT has a producer — including when no treatment has been
 * chosen yet, which is the ordinary case at ⑥ and is an absence of evidence, never a refusal.
 * Otherwise the one-line reason, meant to be surfaced verbatim to the journalist beside the format
 * it withdraws, naming what the treatment IS reachable in.
 */
export function treatmentFormatGap(treatment, format) {
  if (!treatment || !format) return null;
  const tokens = treatmentTokens(treatment);
  return GAPS.find((row) => row.format === format && matches(row, tokens))?.why ?? null;
}

/** Render the complete G2b decision and nothing from a later storyboard movement. */
export function formatPublicationFormatGate({ recommended, rationale, options, treatment }) {
  if (!PUBLICATION_FORMATS.includes(recommended)) {
    throw new Error(`recommended publication format must be one of ${PUBLICATION_FORMATS.join(", ")}`);
  }
  if (!rationale?.trim()) throw new Error("the publication-format recommendation needs a rationale");
  // The treatment's own reachability, folded in before anything is offered or recommended. A slot
  // reaching this gate with a treatment already on it (a re-opened G2b — `storyboard.mjs` re-opens
  // the producer gate on `medium`, `format` and `chosen` alike) gets the narrower answer; a slot
  // that has not chosen one yet gets exactly the menu it always got.
  const byFormat = new Map(
    (options ?? []).map((option) => {
      const gap = treatmentFormatGap(treatment, option.format);
      return [option.format, gap ? { ...option, reachable: false, why: gap } : option];
    }),
  );
  const recommendation = byFormat.get(recommended);
  if (!recommendation?.reachable) {
    throw new Error(`recommended publication format ${recommended} is not reachable`);
  }

  const lines = [
    "Which publication format should Splash make first?",
    "",
    `Recommended: **${FORMAT_COPY[recommended].label}**, because ${rationale.trim()}`,
    "",
  ];
  for (const format of PUBLICATION_FORMATS) {
    const option = byFormat.get(format);
    const copy = FORMAT_COPY[format];
    if (option?.reachable) {
      lines.push(`- **${copy.label}:** ${copy.tradeoff}.`);
    } else {
      const reason = option?.why?.trim() || "this medium has no producer and delivery path for it";
      lines.push(`- **${copy.label}:** unavailable — ${reason}.`);
    }
  }
  lines.push("", "Which should I produce first?");
  return lines.join("\n");
}
