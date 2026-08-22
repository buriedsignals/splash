import visualCatalog from "../references/visual-catalog.json" with { type: "json" };
import { FORMAT_CATALOG, formatsFor } from "./format-catalog.mjs";
import { treatmentNames } from "./producer-gate.mjs";

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
 * THE REACHABILITY ANSWER, ONE LEVEL BELOW THE PAIR — and it is DERIVED, from what each producing
 * skill declares it holds machinery for, never from a list of cells somebody remembered to extend.
 *
 * `formatGap` and `confirmFormatReachable` (`propose.mjs`) answer about a MEDIUM and a FORMAT, and
 * they are right at that grain. What they cannot see is the TREATMENT, which is chosen two
 * movements later (⑩), and a medium/format pair can be entirely producible while one treatment
 * inside it has no producer at all.
 *
 * ROUND SIX MEASURED ONE SUCH CELL and this file TYPED IT OUT, on `stories/stress-ab-emigration-
 * flows` — 29 defects, the highest of any beat in six rounds. Round seven then measured two more
 * that the typed list did not name: `treatmentFormatGap("Cartogram", "web")` and
 * `treatmentFormatGap("Contour / isoline", "web")` both returned `null`, so a slot could record
 * `reachable: yes` for a treatment with no producer anywhere. A POPULATION TYPED BY HAND WHERE IT
 * COULD BE DERIVED is the shape this repository keeps being burned by, and the previous version of
 * this comment argued at length that the derivation did not exist. It was looking at the wrong side.
 *
 *   - The TREATMENT side genuinely does not discriminate. `visual-catalog.json`'s
 *     `treatments[].formats` carries all four formats for all forty-one treatments; giving them real
 *     values is forty-one judgements, not a measurement. `proofFormats` records what happens to be
 *     rendered on disk and would withdraw more than twenty treatments nobody has proven yet but this
 *     toolchain can produce.
 *   - The PRODUCER side does, and it was already written down in prose. `map-web/SKILL.md`: "What
 *     this skill can draw is what it has machinery for: proportional symbols, choropleths, dot
 *     density, hex grids and locators. There is no flow path here — no seed, no pure core, no
 *     live-plan builder and no interaction model." One closed list of five, in the producing
 *     skill's own words, and every map treatment outside it is a gap. That is three gaps today, and
 *     it stays right when a forty-first sheet lands: the new sheet is a gap until a producer claims
 *     it, rather than a silent pass.
 *
 * So what is declared here is REACH — what a producer holds — and the gaps are derived by
 * subtraction against the catalogue's own treatment list. A pair with no row draws whatever the
 * beat needs: `chart-beat`, `chart-web`, `chart-video`, `map-beat`, `image-beat` and `scrolly` all
 * write a bespoke component per beat, so no type in their medium is closed to them by machinery,
 * and that absence is the honest answer rather than forty invented judgements. A name in `draws`
 * that no catalogue treatment of that medium answers to fails at load, so this list going stale is
 * a red test rather than a silent widening.
 */
export const PRODUCER_TREATMENT_REACH = Object.freeze({
  "map/web": {
    draws: [
      "Proportional symbol (symbol / bubble map)",
      "Choropleth",
      "Dot density",
      "Hex grid (spatial binning)",
      "Locator",
    ],
    measured:
      'map-web/SKILL.md: "What this skill can draw is what it has machinery for: proportional ' +
      "symbols, choropleths, dot density, hex grids and locators. There is no flow path here — no " +
      'seed, no pure core, no live-plan builder and no interaction model."',
  },
});

/** The catalogue treatment a spelling names, or `null`. THE SAME NAME RULE THE PRODUCER GATE USES
 *  (`treatmentNames`): "Flow map (route)" is the catalogue's label, "flow / route map" is what the
 *  survey's alternative-first beats write, and "route map" is what a journalist writes; all of them
 *  are this one treatment, and a gate that only recognised the catalogue's own label would be a
 *  gate a journalist's own words walk straight past. The longest shared name wins, so "contour" and
 *  "isoline" both reach `Contour / isoline` while a bare "map" — which carries no treatment word —
 *  reaches nothing. */
function treatmentFor(spelling) {
  const asked = treatmentNames(spelling);
  let best = null;
  for (const treatment of visualCatalog.treatments) {
    for (const name of treatmentNames(treatment.label)) {
      if (!asked.includes(name)) continue;
      const words = name.split(" ").length;
      if (!best || words > best.words) best = { treatment, words };
    }
  }
  return best?.treatment ?? null;
}

const DRAWN_BY = new Map(
  Object.entries(PRODUCER_TREATMENT_REACH).map(([pair, reach]) => [
    pair,
    new Set(
      reach.draws.map((label) => {
        const treatment = treatmentFor(label);
        const medium = pair.slice(0, pair.indexOf("/"));
        if (!treatment || treatment.medium !== medium) {
          throw new Error(
            `format gate: ${pair} declares it draws ${JSON.stringify(label)}, which is not a ${medium} treatment this catalogue holds`,
          );
        }
        return treatment.id;
      }),
    ),
  ]),
);

/**
 * `null` when this TREATMENT in this FORMAT has a producer — including when no treatment has been
 * chosen yet, which is the ordinary case at ⑥ and is an absence of evidence, never a refusal.
 * Otherwise the one-line reason, meant to be surfaced verbatim to the journalist beside the format
 * it withdraws, naming what the producer DOES draw, what this treatment IS reachable in, and the
 * sheet to read before choosing again.
 */
export function treatmentFormatGap(treatment, format) {
  if (!treatment || !format) return null;
  const row = treatmentFor(treatment);
  if (!row) return null;
  const drawn = DRAWN_BY.get(`${row.medium}/${format}`);
  if (!drawn || drawn.has(row.id)) return null;
  const reachable = formatsFor(row.medium).filter((other) => {
    const set = DRAWN_BY.get(`${row.medium}/${other}`);
    return !set || set.has(row.id);
  });
  const producer = FORMAT_CATALOG[`${row.medium}/${format}`]?.producerSkill ?? row.medium;
  const reach = PRODUCER_TREATMENT_REACH[`${row.medium}/${format}`];
  return (
    `${row.label} has no producer in this toolchain for the ${format}: ${producer} draws ` +
    `${reach.draws.join(", ")}, and holds no machinery for anything else — ${reach.measured}. ` +
    (reachable.length
      ? `${row.label} is produced here as ${reachable.join(", ")}. `
      : `Nothing in this toolchain produces it in any format. `) +
    `Read ${row.reference} before choosing again.`
  );
}

/**
 * EVERY UNREACHABLE CELL, DERIVED — the same object this file used to carry by hand, kept under its
 * own name because the doctrine that cites it (`map-beat/references/types/flow-map.md`,
 * `map-web/SKILL.md`, `storyboard/SKILL.md`) names it. Keyed `<treatment id>/<format>`, one entry
 * per treatment a declaring pair's producer holds no machinery for. It had one row when it was
 * typed; subtraction finds three.
 */
export const TREATMENT_FORMAT_GAPS = Object.freeze(
  Object.fromEntries(
    Object.keys(PRODUCER_TREATMENT_REACH).flatMap((pair) => {
      const medium = pair.slice(0, pair.indexOf("/"));
      const format = pair.slice(pair.indexOf("/") + 1);
      return visualCatalog.treatments
        .filter((treatment) => treatment.medium === medium)
        .map((treatment) => [`${treatment.id}/${format}`, treatmentFormatGap(treatment.label, format)])
        .filter(([, why]) => why !== null);
    }),
  ),
);

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
