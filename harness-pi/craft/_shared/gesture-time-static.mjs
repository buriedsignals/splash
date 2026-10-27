// The Time-series static scheduler (craft/gestures/GRAMMAR.md §5): every gesture's state composed onto ONE plate.
// It reads the family's pictures (gesture-family-time.mjs `pictureOf`) in story order and returns what the plate
// draws: the accented, ringed and stepped-back series, the readings ringed or written on, the levels a compare
// rewinds or the thickness it copies, the crossings it solved, the bracketed runs of time with their sums, the rules,
// the captions. A temporal gesture (reveal, trace, pull-back) draws its end state — the whole series — which a still
// already is. One reading carries one note on a still (every note is drawn at once): a second is refused, the
// gesture kept. Browser-safe: no Node module.
import { GestureRefusal } from "./gesture-core.mjs";
import { pictureOf } from "./gesture-family-time.mjs";

/**
 *   model  timeModel's output
 *   valid  validateTime's `gestures`
 *   format the beat's value format
 * @returns      { accent, rings, back, points, levels, copies, crossings, brackets, references, captions }
 * @param {{ model: any, valid: any[], format?: (v: number) => string, subject?: string }} input
 */
export function composeTimeStatic({ model, valid, format = String, subject }) {
  const { accent, items } = pictureOf(model, valid, { format, subject });
  const plate = { accent, rings: [], back: [], points: [], levels: [], copies: [], crossings: [], brackets: [], references: [], captions: [] };
  const noted = new Map();
  const oneNote = (name, k, text) => {
    if (text === undefined) return true;
    if (noted.has(name))
      throw new GestureRefusal(`gestures[${k}].note`, `${name} already carries the note of gestures[${noted.get(name)}], and every note is drawn at once on a still plate: drop this note (the gesture stays)`, {
        set: { index: k, field: "note", value: undefined },
      });
    noted.set(name, k);
    return true;
  };
  for (const it of items) {
    switch (it.do) {
      case "highlight":
        for (const s of it.ring) if (!plate.rings.includes(s)) plate.rings.push(s);
        if (it.note !== undefined) {
          if (it.at && oneNote(it.at.name, it.k, it.note)) plate.points.push({ k: it.k, at: it.at, text: it.note, ring: false });
          else if (!it.at) plate.captions.push({ k: it.k, text: it.note });
        }
        break;
      case "filter":
        plate.back = it.back;
        if (it.note !== undefined) plate.captions.push({ k: it.k, text: it.note });
        break;
      case "name":
      case "annotate":
        oneNote(it.at.name, it.k, it.text);
        plate.points.push({ k: it.k, at: it.at, text: it.text, ring: it.do === "name" });
        break;
      case "compare":
        if (it.kind === "crossing") {
          plate.crossings.push({ k: it.k, series: it.series, crossings: it.crossings, text: it.note });
        } else {
          if (it.note !== undefined) oneNote(it.a.name, it.k, it.note);
          (it.kind === "level" ? plate.levels : plate.copies).push({ k: it.k, a: it.a, b: it.b, text: it.note });
        }
        break;
      case "bracket":
        plate.brackets.push({ k: it.k, from: it.from, to: it.to, layers: it.layers, sum: it.sum, share: it.share, ofWhole: it.ofWhole, text: it.note });
        break;
      case "reference":
        plate.references.push({ k: it.k, value: it.value, text: it.note });
        break;
      default:
        // reveal, trace, pull-back: their end state is the whole chart, which a still already is.
        if (it.note !== undefined) {
          if (it.at && oneNote(it.at.name, it.k, it.note)) plate.points.push({ k: it.k, at: it.at, text: it.note, ring: false });
          else plate.captions.push({ k: it.k, text: it.note });
        }
    }
  }
  plate.back = plate.back.filter((s) => s !== accent && !plate.rings.includes(s));
  return plate;
}
