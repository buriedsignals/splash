// twin/skills/palette/scripts/palette.mjs
//
// Dependency-free. Proposes a palette; never renders one, never writes one.
//
// The colour maths below (`channels`, `luminance`, `contrast`) is a VERBATIM copy of the block in
// `chart-beat/scripts/render-still.mjs`. That is the canon here: a skill stays
// copy-pasteable on its own, so helpers are duplicated rather than imported. The risk that buys —
// silent divergence — is guarded by `splash/test/helper-parity.test.ts`, which compares this
// copy against every other one in the tree.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const HEX = /^#[0-9a-fA-F]{6}$/;

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** WCAG 2.x relative luminance. */
function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, 1..21. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG 2.2 SC 1.4.11 Non-text Contrast, Level AA: the visual information required to identify a
 * graphical object must clear 3:1 against its adjacent colour. A chart's accent IS that object —
 * the line, the bar, the highlighted circle — so 3:1 against the ground is the floor a proposal
 * has to clear before a journalist is asked to approve it.
 *
 * This is deliberately NOT 4.5:1. That threshold (SC 1.4.3) governs TEXT, and the beats already
 * meet it a different way: every word in a beat is drawn in `ink` or `muted`, both derived from
 * the ground by `deriveFurniture`, which escalates until it clears 4.5:1. Holding the accent to a
 * text threshold it never carries text at would reject perfectly legible house colours.
 */
export const NON_TEXT_CONTRAST_MIN = 3;

/**
 * The other floor, and the relaxation that belongs to it rather than to the one above. 4.5:1 is
 * SC 1.4.3 and it governs WORDS; its own large-text relaxation drops to 3:1 at 24px, or 18.66px
 * bold, or larger. The number coincides with the non-text floor and the criterion does not, which
 * is exactly why `assertLegible` below makes a caller name the role instead of the number.
 */
export const TEXT_CONTRAST_MIN = 4.5;
export const LARGE_TEXT_CONTRAST_MIN = 3;

function toHex(values) {
  return "#" + values.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/**
 * The nearest variant of `colour` that clears `min` against `ground`, found by walking it toward
 * whichever pole the ground is NOT — darkening an accent on a light ground, lightening it on a
 * dark one — in 2% steps and stopping at the first step that passes.
 *
 * It returns a REMEDY, never a replacement. The caller shows the failing colour, says it fails,
 * and offers this beside it. A palette that silently swapped in the nearest passing colour would
 * put a hex nobody chose into a published chart, which is the one thing this skill exists to
 * prevent — and the journalist, seeing a colour that is not their brand, would have no way to
 * learn why.
 *
 * Returns `null` when no step passes — and MEASURED, not assumed, that never happens at the
 * default 3:1 floor. Swept over 4352 grounds (every one of the 256 greys plus a 16-step RGB
 * grid): zero nulls at `min` 3, zero at 4.5, the first at 5. The hardest ground found is `#747474`,
 * where the far pole lands at 3.0000809:1 — the mid-grey band is genuinely the tight spot, and it
 * still clears. That is not luck: `towards` switches poles at L = 0.18 precisely because both
 * poles clear 3:1 on either side of it, so the walk always terminates in a pass.
 *
 * The branch stays because `min` is a PARAMETER. A caller raising the floor can and does exhaust
 * the walk (340 of those same grounds at 5:1), and returning `null` says "this ground leaves no
 * room" rather than shipping a near-miss dressed as a pass. An earlier draft of this comment
 * claimed the mid-grey band produced nulls at 3:1; it does not, and the sweep above is why this
 * one states a number instead.
 */
export function adjustToContrast(colour, ground, min = NON_TEXT_CONTRAST_MIN) {
  if (!HEX.test(colour)) throw new Error(`colour must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(ground)) throw new Error(`ground must be #rrggbb, got ${JSON.stringify(ground)}`);
  const towards = luminance(ground) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  const from = channels(colour);
  for (let step = 1; step <= 50; step++) {
    const candidate = toHex(from.map((v, i) => v + (towards[i] - v) * (step / 50)));
    if (contrast(candidate, ground) >= min) return candidate;
  }
  return null;
}

/**
 * THE SURFACE A BEAT ACTUALLY LANDS ON, and the ground each one puts under the marks.
 *
 * ROUND SIX, BEAT AD. `stress-ad-polish-hospital-beds` delivered a static frame TO PRINT — the
 * article's own last line asked for it, and gate 2b recorded `Static … because the destination is
 * a printed page`. The proposal was built against the one ground `NEWSROOM.md` records, `#16191B`,
 * and recommended the house primary `#D4A853` at 8.01:1 against it. On the sheet that beat was
 * actually going onto, that accent measures **2.20:1** — under the 3:1 non-text floor — and the
 * recommended ground was a full-bleed flood of ink across a printed page. Nothing anywhere
 * objected. The journalist re-measured all three colours by hand and answered through the escape,
 * which is why that story's `PALETTE.md` records `origin: journalist` for a pair of house colours.
 *
 * A palette is only a palette against a surface. The surface is not new information at this point
 * either: the FORMAT is settled at gate 2b, before a single colour is recorded, so the one fact
 * this measurement turns on is already in the journalist's hand when they are asked.
 *
 * `groundIs` is a function of the newsroom's own profile rather than a constant, because only one
 * of the two surfaces has a ground of its own — paper is paper whatever a masthead's CSS says,
 * and a screen is the newsroom's own recorded ground.
 */
export const PAPER_GROUND = "#FFFFFF";

export const SURFACES = {
  screen: {
    id: "screen",
    describes: "a reader's own display — a page, an embed, an app, a video",
    groundIs: (newsroom) => (newsroom && newsroom.ground) || PAPER_GROUND,
    says: (ground) =>
      `Measured against ${ground}, the ground NEWSROOM.md records. A screen delivery lands on the ` +
      `newsroom's own ground, which is the ground those accents were chosen for.`,
  },
  print: {
    id: "print",
    describes: "paper — a printed page, a poster, a PDF someone will run off",
    groundIs: () => PAPER_GROUND,
    says: (ground, newsroom) =>
      `Measured against the SHEET, ${ground} — not against ${
        (newsroom && newsroom.ground) || "the newsroom's own ground"
      }. A ground is a screen's; paper has its own and a near-black one laid onto it is a ` +
      `full-bleed flood of ink, not an identity. ${PAPER_GROUND} is unprinted white, which is the ` +
      `BRIGHTEST a sheet gets: it is the worst case for a light accent and the most forgiving one ` +
      `for a dark accent, so an accent that misses the floor here misses it on every stock.`,
  },
};

/**
 * The ground to measure against, from the newsroom's profile and the surface the beat lands on.
 *
 * `null` — the surface was not stated — deliberately returns the SAME ground the old unqualified
 * behaviour did, and is not silently equivalent to `"screen"`: `proposePalette` names the
 * unstated case in `surfaceLimit` rather than letting it read as an answer, the same policy
 * `proposeTypeface`'s `sampleLimit` follows for a measurement it could not make.
 */
export function groundForSurface(newsroom, surface) {
  if (surface === null || surface === undefined) return (newsroom && newsroom.ground) || PAPER_GROUND;
  const known = SURFACES[surface];
  if (!known) {
    throw new Error(
      `surface must be one of ${Object.keys(SURFACES).join(", ")} — got ${JSON.stringify(surface)}. ` +
        `It is where the beat LANDS, and it decides the ground every accent is measured against: ` +
        `print puts the marks on paper whatever ground NEWSROOM.md records for the screen. A ` +
        `surface this table holds no measurement for is refused rather than treated as a screen.`,
    );
  }
  return known.groundIs(newsroom);
}

/**
 * Grounded subject conventions. Each entry is a convention a reader can be expected to already
 * hold, not a colour that felt right — see `references/subject-conventions.md` for the evidence
 * behind each one and for why the list is short.
 *
 * `match` is tested against the subject line the journalist wrote, lowercased — and, when the
 * subject line carries nothing, against what the story SAYS IT IS ABOUT (see `proposePalette`'s
 * `about`). A subject that matches nothing gets no subject option at all, and the house theme wins
 * by default. Growing this table with a convention nobody can point to a source for is the failure
 * mode; a missing entry costs a journalist one extra sentence, an invented one teaches a reader
 * something false.
 *
 * THE LANGUAGES THIS TABLE DECLARES: English, French, Greek and Arabic — the four this tree has
 * frozen a story in (`CONVENTION_LANGUAGES`). ROUND FIVE, finding X1: every one of these regexes
 * held English and French words only, behind `\b` boundaries, and `\b` is ASCII-only. So
 * `stress-x-tunisian-water` — a story about `استهلاك المياه`, water consumption, and blue for water
 * is the strongest entry in this table — reached the newsroom branch as though it carried no
 * convention at all, and the journalist recorded THIS TABLE'S OWN HEX through the proposal's
 * "something else" escape. The boundaries below are unicode property escapes for that reason, and
 * a subject in a script none of the four uses is NAMED rather than silently answered (see
 * `scriptsWithNoConvention` and `proposePalette`'s `noConventionReason`).
 */
export const CONVENTION_LANGUAGES = ["English", "French", "Greek", "Arabic"];

/** A word boundary that is not ASCII-only. `\b` cannot see the edge of a Greek or Arabic word. */
const EDGE_BEFORE = "(?<![\\p{L}\\p{N}])";
const EDGE_AFTER = "(?![\\p{L}\\p{N}])";
const edged = (alternatives) => new RegExp(`${EDGE_BEFORE}(?:${alternatives})${EDGE_AFTER}`, "u");
export const SUBJECT_CONVENTIONS = [
  {
    id: "renewables",
    match: edged(
      // ROUND SIX, task LANG — generated from `skills/doctrine/references/concept-labels.json`,
      // measured once from Wikidata's own labels and aliases and VENDORED; the hand-written four
      // languages follow below and are unchanged. A phrase whose letters `scriptsWithNoConvention`
      // can already flag is not here — that net names it, this table names what no character test
      // can see.
      // >>> generated: renewables — bun run scripts/concept-labels.mjs --write
      "atsinaujinanti\\s+energija|" +
      "aurinkoenergia|" +
      "aurinkovoima|" +
      "bioenergy|" +
      "cadastre\\s+solaire|" +
      "duurzame\\s+energie|" +
      "eguzki\\s+energia|" +
      "energetyka\\s+wiatrowa|" +
      "energia\\s+berriztagarri|" +
      "energia\\s+eolica|" +
      "energia\\s+eolica\\s+marina|" +
      "energia\\s+eoliko|" +
      "energia\\s+renovable|" +
      "energia\\s+rinnovabile|" +
      "energia\\s+solar|" +
      "energia\\s+solar\\s+termodin\u00e2mica|" +
      "energia\\s+solare|" +
      "energia\\s+v\u00e2ntului|" +
      "energia\\s+wiatrowa|" +
      "energie\\s+rinnovabili|" +
      "energija\\s+vjetra|" +
      "energjia\\s+diellore|" +
      "eolica|" +
      "erneuerbare\\s+energie|" +
      "erneuerbare\\s+energien|" +
      "fornybar\\s+energi|" +
      "fuinneamh\\s+gaoithe|" +
      "f\u00f6rnybar\\s+energi|" +
      "green\\s+energy|" +
      "grianfhuinneamh|" +
      "haize\\s+energia|" +
      "hernieuwbare\\s+energie|" +
      "microeolica|" +
      "minieolica|" +
      "napenergia|" +
      "obnovljiva\\s+energija|" +
      "p\u00e4ikeseenergia|" +
      "recyclebare\\s+energie|" +
      "regenerative\\s+energie|" +
      "regenerative\\s+energien|" +
      "renewable\\s+energy|" +
      "r\u00fczgar\\s+enerjisi|" +
      "r\u00fczgar\\s+g\u00fcc\u00fc|" +
      "r\u00fczg\u00e2r\\s+enerjisi|" +
      "r\u00fczg\u00e2r\\s+g\u00fcc\u00fc|" +
      "solar\\s+energy|" +
      "solar\\s+power|" +
      "solarenergie|" +
      "solarna\\s+energija|" +
      "solenergi|" +
      "solengergi|" +
      "solkraft|" +
      "solkraftverk|" +
      "solvarme|" +
      "sonnenenergie|" +
      "sonnenkraft|" +
      "sonnenw\u00e4rme|" +
      "sz\u00e9lenergia|" +
      "taastuvenergia|" +
      "tuuleenergeetika|" +
      "tuuleenergia|" +
      "tuulienergia|" +
      "tuulivoima|" +
      "uusiutuva\\s+energia|" +
      "vedvarende\\s+energi|" +
      "veterna\\s+energija|" +
      "vetrna\\s+energija|" +
      "vindenergi|" +
      "vindkraft|" +
      "vindorka|" +
      "wind\\s+power|" +
      "wind\\s+power\\s+energy|" +
      "windenergie|" +
      "windkracht|" +
      "windkraft|" +
      "windkraftenergie|" +
      "yenilenebilir\\s+enerji|" +
      "zonne\\s+energie|" +
      "zonneenergie|" +
      "zonnekracht|" +
      "\u00e9lectricit\u00e9\\s+\u00e9olienne|" +
      "\u00e9nergie\\s+solaire|" +
      "\u00e9nergie\\s+\u00e9olienne|" +
      "\u03b1\u03b9\u03bf\u03bb\u03b9\u03ba\u03ae\\s+\u03b5\u03bd\u03ad\u03c1\u03b3\u03b5\u03b9\u03b1|" +
      "\u03b1\u03bd\u03b1\u03bd\u03b5\u03ce\u03c3\u03b9\u03bc\u03b5\u03c2\\s+\u03c0\u03b7\u03b3\u03ad\u03c2\\s+\u03b5\u03bd\u03ad\u03c1\u03b3\u03b5\u03b9\u03b1\u03c2|" +
      "\u03b1\u03bd\u03b1\u03bd\u03b5\u03ce\u03c3\u03b9\u03bc\u03b7\\s+\u03b5\u03bd\u03ad\u03c1\u03b3\u03b5\u03b9\u03b1|" +
      "\u03b7\u03bb\u03b9\u03b1\u03ba\u03ae\\s+\u03b5\u03bd\u03ad\u03c1\u03b3\u03b5\u03b9\u03b1|" +
      "\u0627\u0644\u0637\u0627\u0642\u0629\\s+\u0627\u0644\u0631\u064a\u062d\u064a\u0629|" +
      "\u0627\u0644\u0637\u0627\u0642\u0629\\s+\u0627\u0644\u0634\u0645\u0633\u064a\u0629|" +
      "\u0627\u0644\u0637\u0627\u0642\u0629\\s+\u0627\u0644\u0647\u0648\u0627\u0626\u064a\u0629|" +
      "\u0637\u0627\u0642\u0629\\s+\u0627\u0644\u0631\u064a\u0627\u062d|" +
      "\u0637\u0627\u0642\u0629\\s+\u0627\u0644\u0634\u0645\u0633|" +
      "\u0637\u0627\u0642\u0629\\s+\u0631\u064a\u0627\u062d|" +
      "\u0637\u0627\u0642\u0629\\s+\u0634\u0645\u0633\u064a\u0629|" +
      "\u0637\u0627\u0642\u0629\\s+\u0645\u062a\u062c\u062f\u062f\u0629|" +
      "\u0637\u0627\u0642\u0647\\s+\u0631\u064a\u062d\u064a\u0647|" +
      "\u0637\u0627\u0642\u0647\\s+\u0634\u0645\u0633\u064a\u0647|" +
      // <<< generated
      "renewable|renewables?|solar|wind|photovoltaic|clean energy|" +
        "\u00e9nergies? renouvelables?|solaire|\u00e9olien|" +
        "\u03b1\u03bd\u03b1\u03bd\u03b5\u03ce\u03c3\u03b9\u03bc\u03b5?\u03c2?|\u03b7\u03bb\u03b9\u03b1\u03ba\u03ae?|\u03b1\u03b9\u03bf\u03bb\u03b9\u03ba\u03ae?|" +
        "\u0627\u0644\u0645\u062a\u062c\u062f\u062f\u0629|\u0645\u062a\u062c\u062f\u062f\u0629|\u0634\u0645\u0633\u064a\u0629|\u0627\u0644\u0631\u064a\u0627\u062d|\u0631\u064a\u0627\u062d",
    ),
    accent: "#1B7F4B",
    label: "renewable generation",
    reasoning:
      "Green reads as renewable generation before the legend is read. Energy trackers and climate desks use it consistently enough that a reader arrives already holding it.",
  },
  {
    id: "fossil",
    match: edged(
      // ROUND SIX, task LANG — generated from `skills/doctrine/references/concept-labels.json`,
      // measured once from Wikidata's own labels and aliases and VENDORED; the hand-written four
      // languages follow below and are unchanged. A phrase whose letters `scriptsWithNoConvention`
      // can already flag is not here — that net names it, this table names what no character test
      // can see.
      // >>> generated: fossil — bun run scripts/concept-labels.mjs --write
      "aardolie|" +
      "akmens\\s+anglis|" +
      "akmens\\s+anglys|" +
      "bergolja|" +
      "berg\u00f6l|" +
      "bitumihiili|" +
      "bitumipitoinen\\s+hiili|" +
      "black\\s+gold|" +
      "breosla\\s+iontaiseach|" +
      "carbone|" +
      "carbone\\s+fossile|" +
      "carboni\\s+fossili|" +
      "carbons|" +
      "combustibil\\s+fosil|" +
      "combustibili\\s+fosili|" +
      "combustibili\\s+fossili|" +
      "combustible\\s+fosil|" +
      "combustible\\s+fossile|" +
      "crise\\s+p\u00e9troli\u00e8re|" +
      "crises\\s+p\u00e9troli\u00e8res|" +
      "degizraktenis|" +
      "erd\u00f6l|" +
      "erregai\\s+fosil|" +
      "exploitation\\s+p\u00e9troli\u00e8re|" +
      "fosilna\\s+goriva|" +
      "fosilno\\s+gorivo|" +
      "fossiele\\s+brandstof|" +
      "fossiilinen\\s+polttoaine|" +
      "fossiiliset\\s+polttoaineet|" +
      "fossiilne\\s+k\u00fctus|" +
      "fossil\\s+energi|" +
      "fossil\\s+fuel|" +
      "fossil\\s+fuels|" +
      "fossila\\s+br\u00e4nslen|" +
      "fossile\\s+brennstoffe|" +
      "fossile\\s+brennstoffer|" +
      "fossile\\s+br\u00e6ndsler|" +
      "fossile\\s+energie|" +
      "fossile\\s+energietr\u00e4ger|" +
      "fossile\\s+treibstoffe|" +
      "fossiler\\s+brennstoff|" +
      "fossiler\\s+energietr\u00e4ger|" +
      "fossiler\\s+treibstoff|" +
      "fossilt\\s+brennstoff|" +
      "fossilt\\s+brensel|" +
      "fossilt\\s+br\u00e4nsle|" +
      "fossilt\\s+drivstoff|" +
      "grafitazione|" +
      "gual|" +
      "harrikatz|" +
      "ikatz|" +
      "ikatza|" +
      "kivihiili|" +
      "kivis\u00fcsi|" +
      "kohle|" +
      "kolen|" +
      "kolgruva|" +
      "kolm|" +
      "komur|" +
      "kull|" +
      "k\u00f6m\u00fcr|" +
      "l\u00ebnd\u00eb\\s+djeg\u00ebse\\s+fosile|" +
      "maa\u00f6ljy|" +
      "mineralolja|" +
      "mineralolje|" +
      "must\\s+kuld|" +
      "musta\\s+kulta|" +
      "nafta|" +
      "neft|" +
      "nyersolaj|" +
      "olej\\s+skalny|" +
      "oljefyndighet|" +
      "oljef\u00f6rekomst|" +
      "oljek\u00e4lla|" +
      "oljereserver|" +
      "paliwa\\s+kopalne|" +
      "pampetro|" +
      "peitriliam|" +
      "petrole|" +
      "petroleo|" +
      "petroleumsressursar|" +
      "petroli|" +
      "petroliera|" +
      "petrolio|" +
      "petrolio\\s+greggio|" +
      "petrolioa|" +
      "premog|" +
      "produits\\s+p\u00e9troliers|" +
      "qymyr|" +
      "raaka\u00f6ljy|" +
      "ropa|" +
      "ropa\\s+naftowa|" +
      "ruwe\\s+olie|" +
      "steenkolen|" +
      "steenkool|" +
      "steinolje|" +
      "stein\u00f6l|" +
      "toornafta|" +
      "ugalj|" +
      "ugljen|" +
      "uhlie|" +
      "vuori\u00f6ljy|" +
      "\u00e9nergie\\s+fossile|" +
      "\u03b1\u03c1\u03b3\u03cc\\s+\u03c0\u03b5\u03c4\u03c1\u03ad\u03bb\u03b1\u03b9\u03bf|" +
      "\u03b3\u03b1\u03b9\u03ac\u03bd\u03b8\u03c1\u03b1\u03ba\u03b1\u03c2|" +
      "\u03bf\u03c1\u03c5\u03ba\u03c4\u03ac\\s+\u03ba\u03b1\u03cd\u03c3\u03b9\u03bc\u03b1|" +
      "\u03c0\u03b5\u03c4\u03c1\u03ad\u03bb\u03b1\u03b9\u03bf|" +
      "\u0622\u0628\u0627\u0631\\s+\u0627\u0644\u0646\u0641\u0637|" +
      "\u0627\u0644\u0628\u062a\u0631\u0648\u0644|" +
      "\u0627\u0644\u0628\u062a\u0631\u0648\u0644\\s+\u0627\u0644\u062e\u0627\u0645|" +
      "\u0627\u0644\u0637\u0627\u0642\u0629\\s+\u0627\u0644\u0623\u062d\u0641\u0648\u0631\u064a\u0629|" +
      "\u0627\u0644\u0641\u062d\u0645\\s+\u0627\u0644\u062d\u062c\u0631\u064a|" +
      "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a\\s+\u0627\u0644\u0646\u0641\u0637\u064a\u0629|" +
      "\u0627\u0644\u0646\u0641\u0637|" +
      "\u0627\u0644\u0646\u0641\u0637\\s+\u0627\u0644\u062e\u0627\u0645|" +
      "\u0627\u0647\u0645\u064a\u0629\\s+\u0627\u0644\u0628\u062a\u0631\u0648\u0644|" +
      "\u0628\u062a\u0631\u0648\u0644|" +
      "\u062a\u0627\u0631\u064a\u062e\\s+\u0635\u0646\u0627\u0639\u0629\\s+\u0628\u062a\u0631\u0648\u0644|" +
      "\u0646\u0634\u0627\u0629\\s+\u0627\u0644\u0628\u062a\u0631\u0648\u0644|" +
      "\u0646\u0641\u0637\u064a|" +
      "\u0648\u0642\u0648\u062f\\s+\u0623\u062d\u0641\u0648\u0631\u064a|" +
      // <<< generated
      "coal|lignite|fossil|oil|petroleum|charbon|fossile|p\u00e9trole|" +
        "\u03ac\u03bd\u03b8\u03c1\u03b1\u03ba\u03b1?\u03c2?|\u03bb\u03b9\u03b3\u03bd\u03af\u03c4\u03b7?\u03c2?|\u03c0\u03b5\u03c4\u03c1\u03ad\u03bb\u03b1\u03b9\u03bf|\u03bf\u03c1\u03c5\u03ba\u03c4\u03ac|" +
        "\u0627\u0644\u0641\u062d\u0645|\u0641\u062d\u0645|\u0627\u0644\u0646\u0641\u0637|\u0646\u0641\u0637|\u0623\u062d\u0641\u0648\u0631\u064a|\u0627\u0644\u0628\u062a\u0631\u0648\u0644",
    ),
    accent: "#3A3A3A",
    label: "coal and fossil fuel",
    reasoning:
      "Near-black grey reads as coal — the material's own colour. It also stays legible where a saturated hue would compete with the renewable green it is usually plotted against.",
  },
  {
    id: "water",
    match: edged(
      // ROUND SIX, task LANG — generated from `skills/doctrine/references/concept-labels.json`,
      // measured once from Wikidata's own labels and aliases and VENDORED; the hand-written four
      // languages follow below and are unchanged. A phrase whose letters `scriptsWithNoConvention`
      // can already flag is not here — that net names it, this table names what no character test
      // can see.
      // >>> generated: water — bun run scripts/concept-labels.mjs --write
      "abhainn|" +
      "acide\\s+hydroxique|" +
      "acqua|" +
      "acqua\\s+leggera|" +
      "acqua\\s+meteorica|" +
      "acque\\s+meteoriche|" +
      "agua\\s+pura|" +
      "aigua|" +
      "alagamento|" +
      "asolagamento|" +
      "auga|" +
      "blaues\\s+gold|" +
      "cheia|" +
      "csapad\u00e9k|" +
      "deflusso|" +
      "dihidrooxigen|" +
      "dihydridooxygen|" +
      "dihydrogen\\s+monoxide|" +
      "dihydrogen\\s+oxide|" +
      "dihydrogenmonoxid|" +
      "dihydrooxig\u00e8ne|" +
      "divetymonoksidi|" +
      "divetyoksidi|" +
      "divodikov\\s+monoksid|" +
      "div\u00e4teoxid|" +
      "droogte|" +
      "droughts|" +
      "drouth|" +
      "d\u00fcrre|" +
      "estiagem|" +
      "fiume|" +
      "fiumi|" +
      "flaum|" +
      "fleuve|" +
      "flod|" +
      "flom|" +
      "flooding|" +
      "floodwater|" +
      "fluss|" +
      "folyam|" +
      "hochwasser|" +
      "hydrogen\\s+hydroxide|" +
      "hydrogen\\s+oxide|" +
      "hydroksyylihappo|" +
      "ibai|" +
      "ibaia|" +
      "ibaiak|" +
      "inondazione|" +
      "inondazioni|" +
      "inundacion|" +
      "joki|" +
      "krituliai|" +
      "kuivuus|" +
      "kuivuuskausi|" +
      "lehorte|" +
      "lumi|" +
      "nedburd|" +
      "nederb\u00f6rd|" +
      "neerslag|" +
      "nehir|" +
      "niederschlag|" +
      "oborina|" +
      "oksidaani|" +
      "oksidan|" +
      "oksydan|" +
      "opad\\s+atmosferyczny|" +
      "ossidano|" +
      "overstroming|" +
      "oxidan|" +
      "oxidane|" +
      "padavina|" +
      "padavine|" +
      "poplava|" +
      "potvynis|" +
      "povodenj|" +
      "precipitacion|" +
      "precipitazione|" +
      "precipitazione\\s+atmosferica|" +
      "precipitazione\\s+meteorologica|" +
      "precipitazioni|" +
      "precipitazioni\\s+atmosferiche|" +
      "precipitazioni\\s+meteorologiche|" +
      "prezipitazio|" +
      "pr\u00e9cipitations|" +
      "pure\\s+water|" +
      "pures\\s+wasser|" +
      "p\u00ebrmbytja|" +
      "reka|" +
      "reshja|" +
      "rieka|" +
      "rijeka|" +
      "rios|" +
      "rivier|" +
      "rzeka|" +
      "r\u00e2uri|" +
      "sadanta|" +
      "sademed|" +
      "sadem\u00e4\u00e4r\u00e4|" +
      "sausra|" +
      "sausums|" +
      "seca|" +
      "secada|" +
      "secas|" +
      "seceta|" +
      "secete|" +
      "sequedad|" +
      "sequera|" +
      "sequia|" +
      "sequias|" +
      "siccit\u00e0|" +
      "sucho|" +
      "susza|" +
      "s\u00e9cheresses|" +
      "that\u00ebsira|" +
      "tlenek\\s+wodoru|" +
      "torka|" +
      "triomach|" +
      "tulva|" +
      "uholde|" +
      "uisce|" +
      "vand|" +
      "vanddamp|" +
      "vandis|" +
      "vanduo|" +
      "vann|" +
      "vatn|" +
      "vatten|" +
      "vesi|" +
      "voda|" +
      "vodikov\\s+hidroksid|" +
      "v\u00e4tehydroxid|" +
      "wasser|" +
      "watersnood|" +
      "woda|" +
      "\u00f6versv\u00e4mning|" +
      "\u00fcberflutung|" +
      "\u00fcleujutus|" +
      "\u03b1\u03bd\u03bf\u03bc\u03b2\u03c1\u03af\u03b1|" +
      "\u03b4\u03b9\u03c5\u03b4\u03c1\u03bf\u03be\u03c5\u03b3\u03cc\u03bd\u03bf|" +
      "\u03bd\u03b5\u03c1\u03cc|" +
      "\u03be\u03b7\u03c1\u03b1\u03c3\u03af\u03b1|" +
      "\u03c0\u03bb\u03b7\u03bc\u03bc\u03cd\u03c1\u03b1|" +
      "\u03c0\u03bf\u03c4\u03ac\u03bc\u03b9|" +
      "\u03c0\u03bf\u03c4\u03b1\u03bc\u03cc\u03c2|" +
      "\u03c5\u03b5\u03c4\u03cc\u03c2|" +
      "\u03cd\u03b4\u03c9\u03c1|" +
      "\u0623\u0645\u0637\u0627\u0631|" +
      "\u0623\u0646\u0647\u0627\u0631|" +
      "\u0623\u0646\u0647\u0631|" +
      "\u0627\u0644\u0623\u0646\u0647\u0627\u0631|" +
      "\u0627\u0644\u0627\u0646\u0647\u0627\u0631|" +
      "\u0627\u0644\u062c\u0641\u0627\u0641|" +
      "\u0627\u0644\u0645\u0627\u0621|" +
      "\u0627\u0644\u0645\u064a\u0627\u0647|" +
      "\u0627\u0644\u0646\u0647\u0631|" +
      "\u0627\u0646\u0647\u0627\u0631|" +
      "\u062c\u0641\u0627\u0641|" +
      "\u062c\u0641\u0627\u0641\\s+\u0645\u0637\u0644\u0642|" +
      "\u0641\u064a\u0636\u0627\u0646|" +
      "\u0645\u064a\u0627\u0647|" +
      "\u0646\u0648\u0628\u0629\\s+\u062c\u0627\u0641\u0629|" +
      "\u0647\u0637\u0648\u0644|" +
      "\u0647\u0637\u0648\u0644\\s+\u0627\u0644\u0623\u0645\u0637\u0627\u0631|" +
      // <<< generated
      "water|river|rivers|rainfall|flood|precipitation|drought|" +
        "eau|rivi\u00e8res?|pluie|inondation|s\u00e9cheresse|" +
        "\u03bd\u03b5\u03c1\u03cc|\u03bd\u03b5\u03c1\u03bf\u03cd|\u03c0\u03bf\u03c4\u03b1\u03bc\u03cc\u03c2?|\u03c0\u03bf\u03c4\u03b1\u03bc\u03bf\u03cd|\u03b2\u03c1\u03bf\u03c7\u03ae|\u03c0\u03bb\u03b7\u03bc\u03bc\u03cd\u03c1\u03b1|\u03be\u03b7\u03c1\u03b1\u03c3\u03af\u03b1|" +
        "\u0627\u0644\u0645\u064a\u0627\u0647|\u0645\u064a\u0627\u0647|\u0627\u0644\u0645\u0627\u0621|\u0645\u0627\u0621|\u0646\u0647\u0631|\u0623\u0646\u0647\u0627\u0631|\u0627\u0644\u0623\u0645\u0637\u0627\u0631|\u0623\u0645\u0637\u0627\u0631|\u0645\u0637\u0631|\u0641\u064a\u0636\u0627\u0646|\u062c\u0641\u0627\u0641",
    ),
    accent: "#1F6FB2",
    label: "water",
    reasoning:
      "Blue for water is the single most reliably held colour association in the semantic-resonance study — the paper's own opening example.",
  },
  {
    id: "heat",
    match: edged(
      // ROUND SIX, task LANG — generated from `skills/doctrine/references/concept-labels.json`,
      // measured once from Wikidata's own labels and aliases and VENDORED; the hand-written four
      // languages follow below and are unchanged. A phrase whose letters `scriptsWithNoConvention`
      // can already flag is not here — that net names it, this table names what no character test
      // can see.
      // >>> generated: heat — bun run scripts/concept-labels.mjs --write
      "alt\u00e9ration\\s+climatique\\s+anthropique|" +
      "anthropogenic\\s+global\\s+warming|" +
      "aquecimento\\s+global|" +
      "bero\\s+bolada|" +
      "berotze\\s+globala|" +
      "calentamiento\\s+global|" +
      "calorada|" +
      "caniculaire|" +
      "changement\\s+climatique|" +
      "changement\\s+climatique\\s+anthropique|" +
      "chauffage\\s+global|" +
      "climate\\s+warming|" +
      "d\u00e9r\u00e8glement\\s+climatique|" +
      "erderhitzung|" +
      "erderw\u00e4rmung|" +
      "escalfament\\s+global|" +
      "extreme\\s+heat|" +
      "extremhitzeereignis|" +
      "globaalne\\s+soojenemine|" +
      "global\\s+heating|" +
      "global\\s+oppvarming|" +
      "global\\s+opvarmning|" +
      "global\\s+uppv\u00e4rmning|" +
      "global\\s+warming|" +
      "globale\\s+erderhitzung|" +
      "globale\\s+erderw\u00e4rmung|" +
      "globalne\\s+ocieplenie|" +
      "globalno\\s+segrevanje|" +
      "globalno\\s+zatopljenje|" +
      "heat\\s+wave|" +
      "helleaalto|" +
      "hiti|" +
      "hittegolf|" +
      "hitzeanomalie|" +
      "hitzeglocke|" +
      "hitzekuppel|" +
      "hitzewelle|" +
      "ilmaston\\s+l\u00e4mpeneminen|" +
      "kaitra|" +
      "karstuma\\s+vilnis|" +
      "klimawandel|" +
      "kuumalaine|" +
      "l\u00e4mp\u00f6aalto|" +
      "l\u00e4mp\u00f6tila|" +
      "ngrohja\\s+globale|" +
      "ocieplenie\\s+klimatu|" +
      "perturbation\\s+climatique|" +
      "perturbation\\s+climatique\\s+anthropique|" +
      "podnebna\\s+kriza|" +
      "quecemento\\s+global|" +
      "quentamento\\s+global|" +
      "riscaldamento\\s+climatico|" +
      "riscaldamento\\s+globale|" +
      "r\u00e9chauffement\\s+climatique|" +
      "segrevanje\\s+zemlje|" +
      "skwar|" +
      "spiekota|" +
      "surriscaldamento\\s+climatico|" +
      "surriscaldamento\\s+globale|" +
      "temperatur|" +
      "temperatura|" +
      "temperaturen|" +
      "temperatuur|" +
      "tenperatura|" +
      "teocht|" +
      "teplota|" +
      "tonn\\s+teasa|" +
      "t\u00e9amh\\s+domhanda|" +
      "vlna\\s+veder|" +
      "v\u00e4rmeb\u00f6lja|" +
      "zmiana\\s+klimatu|" +
      "\u03b8\u03b5\u03c1\u03bc\u03bf\u03ba\u03c1\u03b1\u03c3\u03af\u03b1|" +
      "\u03ba\u03b1\u03cd\u03c3\u03c9\u03bd\u03b1\u03c2|" +
      "\u03ba\u03cd\u03bc\u03b1\\s+\u03ba\u03b1\u03cd\u03c3\u03c9\u03bd\u03b1|" +
      "\u03c0\u03b1\u03b3\u03ba\u03cc\u03c3\u03bc\u03b9\u03b1\\s+\u03b8\u03ad\u03c1\u03bc\u03b1\u03bd\u03c3\u03b7|" +
      "\u03c0\u03b1\u03b3\u03ba\u03cc\u03c3\u03bc\u03b9\u03b1\\s+\u03c5\u03c0\u03b5\u03c1\u03b8\u03ad\u03c1\u03bc\u03b1\u03bd\u03c3\u03b7|" +
      "\u0627\u062d\u062a\u0628\u0627\u0633\\s+\u062d\u0631\u0627\u0631\u064a|" +
      "\u0627\u0644\u0627\u062d\u062a\u0628\u0627\u0633\\s+\u0627\u0644\u062d\u0631\u0627\u0631\u064a|" +
      "\u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0631\\s+\u0627\u0644\u0639\u0627\u0644\u0645\u064a|" +
      "\u062a\u063a\u064a\u064a\u0631\\s+\u0627\u0644\u0645\u0646\u0627\u062e|" +
      "\u062f\u0631\u062c\u0629\\s+\u0627\u0644\u062d\u0631\u0627\u0631\u0629|" +
      "\u062f\u0631\u062c\u0629\\s+\u062d\u0631\u0627\u0631\u0629|" +
      "\u0645\u0648\u062c\u0629\\s+\u062d\u0627\u0631\u0629|" +
      // <<< generated
      "heat|heatwave|temperature|warming|canicule|chaleur|temp\u00e9rature|r\u00e9chauffement|" +
        "\u03b8\u03b5\u03c1\u03bc\u03bf\u03ba\u03c1\u03b1\u03c3\u03af\u03b1|\u03ba\u03b1\u03cd\u03c3\u03c9\u03bd\u03b1?\u03c2?|\u03c5\u03c0\u03b5\u03c1\u03b8\u03ad\u03c1\u03bc\u03b1\u03bd\u03c3\u03b7|" +
        "\u0627\u0644\u062d\u0631\u0627\u0631\u0629|\u062d\u0631\u0627\u0631\u0629|\u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0631|\u0627\u062d\u062a\u0631\u0627\u0631",
    ),
    accent: "#C1440E",
    label: "heat and warming",
    reasoning:
      "Warm red for rising temperature is the convention climate charts have taught readers for decades. On a series that runs both ways, this is the warm end only — a diverging scale is a different decision and this skill does not make it.",
  },
];

/**
 * Does the story's subject carry a convention a reader already holds?
 *
 * Returns the FIRST matching convention, and nothing when several match: a story about coal-fired
 * power replacing hydro is not two accents, it is a choice the journalist makes. Silently picking
 * the earlier entry in the table would be that choice made by table order.
 */
export function matchConvention(subject, conventions = SUBJECT_CONVENTIONS) {
  if (typeof subject !== "string" || !subject.trim()) return null;
  const text = subject.toLowerCase();
  const hits = conventions.filter((c) => c.match.test(text));
  return hits.length === 1 ? hits[0] : null;
}

// The writing systems `CONVENTION_LANGUAGES` covers, and the ones a newsroom in this tree's reach
// could plausibly file in and this table could not read a word of.
const CONVENTION_SCRIPTS = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Arabic}]/u;
const NAMED_SCRIPTS = [
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Thai", /\p{Script=Thai}/u],
  ["Armenian", /\p{Script=Armenian}/u],
  ["Georgian", /\p{Script=Georgian}/u],
  ["Ethiopic", /\p{Script=Ethiopic}/u],
];

/**
 * EVERY SCRIPT IN THIS TEXT THAT NONE OF `CONVENTION_LANGUAGES` IS WRITTEN IN.
 *
 * The second half of the policy this whole table now follows: gaining languages can never be
 * finished, so a lexicon that has been taught four still meets a fifth. What it may not do is answer
 * "no convention applies" in a way that reads identically whether it looked and found nothing or
 * could not read a word. Empty is the ordinary answer and is itself information.
 */
export function scriptsWithNoConvention(text) {
  const value = String(text ?? "");
  const found = NAMED_SCRIPTS.filter(([, re]) => re.test(value)).map(([name]) => name);
  if (found.length > 0) return found;
  const stray = [...value].find((ch) => /\p{L}/u.test(ch) && !CONVENTION_SCRIPTS.test(ch));
  return stray ? [`U+${stray.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`] : [];
}

/**
 * Every house accent a `NEWSROOM.md` records, primary first: `brandColor`, then whatever `accents`
 * adds, de-duped, malformed entries refused by name.
 *
 * This is a DUPLICATE of `splash/scripts/newsroom.mjs`'s `newsroomAccents`, deliberately: a
 * skill stays copy-pasteable on its own, so helpers are duplicated rather than imported (the same
 * rule the colour maths above follows). The two are held in step behaviourally, over a table of
 * profiles, by `test/palette.test.ts` — the divergence that buys is the whole reason that test
 * exists.
 *
 * It THROWS on a malformed accent rather than dropping it. `proposePalette` already throws on a
 * malformed `brandColor` for the stated reason — a newsroom charter is validated input, and quietly
 * ignoring a broken value there hides a typo in the one file the whole house style hangs off.
 */
function houseAccents(newsroom) {
  const rest = String(newsroom.accents ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  for (const accent of rest) {
    if (!HEX.test(accent)) throw new Error(`newsroom.accents must each be #rrggbb, got ${JSON.stringify(accent)}`);
  }
  const all = [newsroom.brandColor, ...rest];
  return all.filter((hex, index) => all.indexOf(hex) === index);
}

function scoreOption(option) {
  const ratio = contrast(option.accent, option.ground);
  const passes = ratio >= NON_TEXT_CONTRAST_MIN;
  const remedy = passes ? null : adjustToContrast(option.accent, option.ground);
  return {
    ...option,
    contrast: { ratio: Math.round(ratio * 100) / 100, min: NON_TEXT_CONTRAST_MIN, passes },
    remedy: remedy && { accent: remedy, contrast: Math.round(contrast(remedy, option.ground) * 100) / 100 },
  };
}

/**
 * WHAT THIS PROPOSAL CAN ACTUALLY SEE OF `NEWSROOM.md`.
 *
 * ROUND SIX, BEAT AC: with no `newsroom` argument, the printed proposal said *"There is no
 * `NEWSROOM.md` with a brand colour and a ground to offer"* — about a tree whose root
 * `NEWSROOM.md` is complete, valid and four fields longer than it needs to be. Nothing in this
 * module had ever opened a file to check. The caller had simply not read the profile, and the tool
 * turned that into a statement about the filesystem.
 *
 * An absence a tool reports has to be an absence it MEASURED. So there are three answers, not one:
 * the profile was passed; it was not passed and this proposal was given nowhere to look; or it was
 * not passed, a directory WAS given, and the walk found a file (name it, it is the one to read) or
 * did not (name every directory it looked in, the way `readPalette`'s own refusal already does).
 *
 * It reports and never reads: parsing `NEWSROOM.md` belongs to `splash/scripts/newsroom.mjs`, and
 * a second parser vendored here would be a copy nothing guards. The caller reads it and passes it
 * back in — this only refuses to lie about whether there is one.
 */
export function lookUpNewsroom({ newsroom, from, stopAt } = {}) {
  if (newsroom) {
    return {
      searched: [],
      found: null,
      says: "A newsroom profile was passed to this proposal, so its own recorded values are what was measured.",
    };
  }
  if (!from) {
    return {
      searched: [],
      found: null,
      says:
        "No newsroom profile was passed to this proposal, and it was given nowhere to look for " +
        "one — `proposePalette` opens no file unless `from` names a directory to walk up from. " +
        "That is a fact about this CALL, not about the tree: pass `from` to have the file looked " +
        "for, or read NEWSROOM.md with parseNewsroom (splash/scripts/newsroom.mjs) and pass the " +
        "profile as `newsroom`.",
    };
  }
  const start = resolve(from);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "NEWSROOM.md");
    searched.push(candidate);
    if (existsSync(candidate)) {
      return {
        searched,
        found: candidate,
        says:
          `A NEWSROOM.md exists at ${candidate} and was not read — no profile was passed to this ` +
          `proposal, so none of its colours could be offered. Read it with parseNewsroom ` +
          `(splash/scripts/newsroom.mjs) and pass it as \`newsroom\`; nothing here is missing but ` +
          `the reading.`,
      };
    }
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return {
    searched,
    found: null,
    says:
      `No newsroom profile was passed, and no NEWSROOM.md was found. Looked in:\n  ` +
      `${searched.join("\n  ")}\nRun newsroom-charter against the newsroom's own site to draft one.`,
  };
}

/**
 * The proposal. Two possible options, each carrying WHERE its values came from and WHY, plus the
 * measured contrast of each — and always the third branch, "something else".
 *
 * It proposes; it never writes and never renders. `formatProposal` turns this into the question
 * the journalist actually answers, and `readPalette` reads back the answer they recorded. Nothing
 * here has a write path, not a commented-out one, not a flag that turns it on — the same rule
 * `newsroom-charter` holds.
 */
export function proposePalette({ newsroom, subject, about, surface = null, from, stopAt } = {}) {
  // THE SURFACE FIRST, because it decides the ground every ratio below is measured against — and
  // an unmeasured surface is refused here rather than quietly read as a screen. See `SURFACES`.
  const ground = groundForSurface(newsroom, surface);
  const options = [];

  // SUBJECT FIRST. A convention the reader already holds — blue for water, green for renewables —
  // is doing work the legend would otherwise have to do, for THIS chart, and that beats looking
  // like the rest of the masthead. An earlier draft pushed house first and recommended house
  // explicitly, on the reasoning that a subject convention is "a reason to DEPART from the house
  // theme"; the owner's ruling inverts it (twin/FEEDBACK-2026-08-10.md, A8). House is what leads
  // when the subject carries no convention, which is most of the time.
  // WHERE THE CONVENTION IS LOOKED UP, and the second half of round five's finding X1. The subject
  // LINE is the journalist's name for the entity the beat is about — `stress-x-tunisian-water`
  // records `محافظة تونس`, Tunis governorate — and a convention is about the SUBJECT MATTER. No
  // vocabulary in any language can find water in the words "Tunis governorate", because there is
  // none there; that story is about `استهلاك المياه` and its own takeaway says so. So the subject
  // line is asked first, and what the story says it is ABOUT second, with which of the two answered
  // written into the option's provenance so the journalist can disagree with the reading.
  const convention = matchConvention(subject) ?? matchConvention(about);
  const conventionReadIn = matchConvention(subject) ? "the subject" : "the takeaway";
  if (convention) {
    options.push(
      scoreOption({
        id: "subject",
        origin: "subject",
        ground,
        accent: convention.accent,
        label: `the ${convention.label} convention`,
        reasoning: convention.reasoning,
        provenance: `references/subject-conventions.md — ${convention.id}, read in ${conventionReadIn}; ground ${
          surface === "print"
            ? `is the SHEET this beat is printed on, ${PAPER_GROUND}`
            : newsroom && newsroom.ground
              ? "kept from NEWSROOM.md"
              : "kept as the default white, because no newsroom profile with a ground was passed"
        }`,
      }),
    );
  }

  if (newsroom && newsroom.brandColor && newsroom.ground) {
    for (const field of ["brandColor", "ground"]) {
      if (!HEX.test(newsroom[field])) {
        throw new Error(`newsroom.${field} must be #rrggbb, got ${JSON.stringify(newsroom[field])}`);
      }
    }
    // A newsroom's identity is rarely ONE accent on one ground, so `NEWSROOM.md` may record
    // further ones in `accents`. Each becomes its OWN option and is scored exactly like the
    // primary — which is the whole safeguard: a longer palette is not a way to get a colour past
    // the 3:1 floor, because `recommended` below only ever names an option that passed, and a
    // failing accent is shown failing, with its remedy beside it. Reported, never silently
    // accepted, and never silently swapped either.
    const accents = houseAccents(newsroom);
    accents.forEach((accent, index) => {
      const primary = index === 0;
      options.push(
        scoreOption({
          id: primary ? "house" : `house-${index + 1}`,
          origin: "newsroom",
          ground,
          accent,
          label: primary
            ? `${newsroom.name || "the newsroom"}'s house colours`
            : `${newsroom.name || "the newsroom"}'s house accent ${index + 1}`,
          reasoning: primary
            ? "The chart reads as this newsroom's, beside everything else it publishes. This is what leads whenever the subject carries no convention of its own."
            : "Also this newsroom's own, recorded beside the primary accent. It reads as the house without repeating the colour every other beat already uses.",
          provenance:
            (primary
              ? `NEWSROOM.md — brandColor: ${accent}, ground: ${newsroom.ground}`
              : `NEWSROOM.md — accents: ${accent}, ground: ${newsroom.ground}`) +
            (ground === newsroom.ground
              ? ""
              : ` — but this beat lands on ${SURFACES[surface].describes}, so the accent is ` +
                `measured against ${ground} and the newsroom's own ground ${newsroom.ground} ` +
                `stays where it was chosen for`),
        }),
      );
    });
  }

  // THE STATED MISS. Read across BOTH texts the convention was looked for in, so a subject line in
  // one script and a takeaway in another are both accounted for.
  const unreadable = [
    ...new Set([...scriptsWithNoConvention(subject), ...scriptsWithNoConvention(about)]),
  ];

  return {
    subject: subject || null,
    // WHERE THIS BEAT LANDS, and the ground that follows from it. `null` is the honest word for a
    // surface nobody stated; `surfaceLimit` below is what stops it reading as an answer.
    surface,
    ground,
    surfaceLimit: surface
      ? SURFACES[surface].says(ground, newsroom)
      : `The surface this beat lands on was NOT STATED, so every ratio above was measured against ` +
        `${ground} — the ground ${
          newsroom && newsroom.ground ? "NEWSROOM.md records" : "this skill falls back to when no profile is passed"
        }, which is a SCREEN ground. That is a measurement of one destination, not of this beat's. ` +
        `Pass surface: "print" when the delivery is paper — the ground moves to the sheet, and a ` +
        `house accent chosen to sit on a near-black screen ground can lose the 3:1 floor entirely ` +
        `on white (measured: #D4A853 on #16191B is 8.01:1 and on #FFFFFF is 2.20:1). The format is ` +
        `settled at gate 2b, before any colour is recorded, so this is never information the ` +
        `journalist does not have yet.`,
    // WHAT COULD BE SEEN OF `NEWSROOM.md`, measured rather than assumed — see `lookUpNewsroom`.
    newsroomLookup: lookUpNewsroom({ newsroom, from, stopAt }),
    options,
    // SAID, not silently absent. `SUBJECT_CONVENTIONS` holds four entries, so "no convention
    // applies" is the common case, not the exception — and in the run that meant exactly one
    // option appeared with no explanation of why there was only one. A journalist reading a
    // one-option proposal should know whether the subject was looked at and found nothing, or
    // never looked at. Null when a convention DID match: there is nothing to explain.
    noConventionReason: convention
      ? null
      : subject
        ? `No convention applies to this subject, so the newsroom's colours lead. The conventions this skill will propose are the few a reader can be expected to already hold — see references/subject-conventions.md for why the list is short and what it would take to add one.${unreadable.length > 0 ? ` This table reads ${CONVENTION_LANGUAGES.slice(0, -1).join(", ")} and ${CONVENTION_LANGUAGES[CONVENTION_LANGUAGES.length - 1]}; ${unreadable.join(", ")} is a script it holds no word of, so "no convention applies" here means "none could be read", not "none exists".` : ""}`
        : "No subject was given to look a convention up by, so the newsroom's colours lead.",
    // The SUBJECT option is recommended when it exists and passes; the PRIMARY house accent second;
    // any passing option third — which, since a newsroom may record several accents, is how a
    // further house accent gets recommended when the primary one misses the floor. That ordering is
    // the guarantee a richer palette does not become a way past the floor: every accent is measured,
    // and only a measured PASS is ever named here.
    // It must never fall back to `options[0]` regardless of contrast — an earlier draft did,
    // which meant a brand colour measured at 1.61:1 was handed back marked "recommended" three
    // lines under the words "FAILS the 3:1 floor". Recommending a colour this skill has just
    // measured as unreadable is the one outcome worse than proposing nothing.
    recommended:
      options.find((o) => o.id === "subject" && o.contrast.passes)?.id ||
      options.find((o) => o.id === "house" && o.contrast.passes)?.id ||
      options.find((o) => o.contrast.passes)?.id ||
      null,
    escape: "Something else — give me the two hex codes and I will use those.",
  };
}

/**
 * Read the decision back.
 *
 * Looks for `PALETTE.md` in `dir`, then in each ancestor up to `stopAt` — so one decision recorded
 * at the story root serves every beat under it, and a beat that genuinely needs its own can hold
 * one beside its data. This is a LOOKUP path, not a colour fallback: nothing here invents a
 * colour, and a search that finds nothing throws naming every directory it looked in.
 *
 * The throw is the point. A render that silently defaulted to black-on-white when the decision was
 * missing would publish a chart in a colour no one chose, and it would look deliberate.
 */
export function readPalette(dir, { stopAt } = {}) {
  const start = resolve(dir);
  const limit = stopAt ? resolve(stopAt) : null;
  const searched = [];
  let current = start;
  for (;;) {
    const candidate = join(current, "PALETTE.md");
    searched.push(candidate);
    if (existsSync(candidate)) return parsePalette(readFileSync(candidate, "utf8"), candidate);
    if (limit && current === limit) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(
    `No PALETTE.md found for ${start}. This beat refuses to render without one, deliberately: a ` +
      `colour nobody chose would publish a newsroom's identity by accident.\n` +
      `Next: call proposePalette({ newsroom, subject }) and formatProposal(...) ` +
      `(skills/palette/scripts/palette.mjs, skills/palette/scripts/format-proposal.mjs), show the ` +
      `printed proposal to the journalist, and record their answer in PALETTE.md ` +
      `(skills/palette/assets/PALETTE.example.md is the shape) at or above this beat.\n` +
      `When no journalist is available to answer right now, the proposal's own measurement is ` +
      `the default: call proposePalette and read its recommended field. A named option WRITES ` +
      `— use exactly its ground and accent (and accents, when the newsroom carries more), set ` +
      `origin to that option's own origin, and say in the file's own prose that no journalist ` +
      `answered and which option was recorded — the shape every unattended stress story already ` +
      `carries. Never invent a colour and never record one that failed the 3:1 floor. A null ` +
      `recommendation — nothing passed — is the one case with no safe default: print the ` +
      `proposal and end the turn there, the same rule this project's every other human gate ` +
      `follows.\n` +
      `Looked in:\n  ${searched.join("\n  ")}`,
  );
}

export function parsePalette(text, source = "PALETTE.md") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${source} has no front matter`);
  const record = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  for (const field of ["ground", "accent"]) {
    if (!record[field]) throw new Error(`${source} is missing ${field}`);
    if (!HEX.test(record[field])) {
      throw new Error(`${source}: ${field} must be #rrggbb, got ${JSON.stringify(record[field])}`);
    }
  }
  if (!["newsroom", "subject", "journalist"].includes(record.origin)) {
    throw new Error(
      `${source}: origin must be newsroom, subject or journalist — got ${JSON.stringify(record.origin)}. ` +
        `It records WHO chose these colours, and a render is allowed to say so.`,
    );
  }
  const further = String(record.accents ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  for (const hex of further) {
    if (!HEX.test(hex)) {
      throw new Error(
        `${source}: every entry in accents must be #rrggbb, got ${JSON.stringify(hex)}. ` +
          `accents lists the FURTHER house colours beside the primary one, comma-separated.`,
      );
    }
  }
  const all = [record.accent, ...further];
  const accents = all.filter((hex, index) => all.indexOf(hex) === index);
  for (const hex of accents) {
    assertLegible(hex, record.ground, {
      role: "mark",
      where: `${source}: the accent ${hex}`,
    });
  }
  return {
    ground: record.ground,
    accent: record.accent,
    accents,
    origin: record.origin,
    source,
  };
}

/**
 * REFUSE A COLOUR A READER CANNOT SEE, AND SAY WHAT WAS MEASURED.
 *
 * `palette`'s proposal measures every option it offers and never recommends one that fails.
 * That is the first line, and it is the only one that existed until now — measured on 2026-08-10,
 * a `PALETTE.md` recording `accent: "#FFFF00"` on `ground: "#FFFFFF"` (1.07:1) rendered a clean
 * PNG with no warning at all, the beat's whole number set in yellow on white.
 *
 * A `PALETTE.md` can be written by hand, copied from another story, or produced by a path that
 * never asked — `newsroom-charter` proposes a `brandColor` and a `ground` off a newsroom's
 * own site. So the floor is measured HERE too, where the colour meets the render, and the refusal
 * names the ratio, the floor, the criterion it comes from and the nearest colour that clears it.
 *
 * It refuses rather than adjusts, for the reason `adjustToContrast` states above.
 */
export function assertLegible(colour, against, { role = "mark", where = "this colour" } = {}) {
  const floors = {
    mark: {
      min: NON_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.11 Non-text Contrast",
      governs: "a graphical object a reader identifies the data by",
    },
    text: {
      min: TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum)",
      governs: "text",
    },
    largeText: {
      min: LARGE_TEXT_CONTRAST_MIN,
      criterion: "WCAG 2.2 SC 1.4.3 Contrast (Minimum), large-text relaxation",
      governs: "text at 24px, or 18.66px bold, or larger",
    },
  };
  const floor = floors[role];
  if (!floor) {
    throw new Error(
      `assertLegible: role must be mark, text or largeText — got ${JSON.stringify(role)}. ` +
        `The floors differ by criterion, so the caller has to say which one it is asking about.`,
    );
  }
  if (!HEX.test(colour)) throw new Error(`${where} must be #rrggbb, got ${JSON.stringify(colour)}`);
  if (!HEX.test(against)) {
    throw new Error(
      `${where} is read against ${JSON.stringify(against)}, which is not #rrggbb`,
    );
  }
  const ratio = contrast(colour, against);
  if (ratio >= floor.min) return ratio;
  const remedy = adjustToContrast(colour, against, floor.min);
  throw new Error(
    `${where}: ${colour} on ${against} measures ${ratio.toFixed(2)}:1 — under the ${floor.min}:1 ` +
      `floor ${floor.criterion} sets for ${floor.governs}. A reader cannot see it. ` +
      (remedy
        ? `The nearest variant that clears the floor is ${remedy}, at ${contrast(remedy, against).toFixed(2)}:1 — ` +
          `record that, or another colour, or a ground it can be read on.`
        : `No variant of it clears that floor on this ground: choose another colour, or another ground.`),
  );
}
