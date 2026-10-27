// EVERYTHING ONE POINT-MAP GESTURE VIDEO IS HANDED, BUILT IN BUN: the plate and the marks (the type runner's
// geometry), the six event states the video scheduler (gesture-geo-point-video.mjs) places the three gestures in —
// flattened to numbers the frame interpolates — every word measured once (a word sits only at an event's own camera,
// never while the camera travels), the registers at the video size, the title card and the credit from the chart-video
// skill's shared shots, and the colours walked to their floors. Runs in Bun only.
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { boxOf, wordsOf } from "./GestureGeoPointMap.tsx";
import { rolesOf } from "./gesture-geo-point-family.mjs";
import { flatStates } from "./gesture-geo-point-scrolly.mjs";
import { EVENTS, scheduleGeoPointVideo } from "./gesture-geo-point-video.mjs";

const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];

export async function buildGeoPointVideo({ here, chosen, geometry, valid, adapter, copy, size, timing, textPerRegister }) {
  const chartVideo = (...parts) => skillScriptFrom(here, "chart-video", "scripts", ...parts);
  const { applyCase } = await import(chartVideo("registers.mjs"));
  const { CREDIT_MAX_LINES, CREDIT_ONE_LINE, haloOf, sourceCreditFor, titleCardFor, widthOf } = await import(chartVideo("shots.mjs"));
  const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
  const direction = resolveDirectionFamilies(chosen, textPerRegister);
  const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, size);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(size);
  const stage = { width: row.width, height: row.height };

  const scheduled = scheduleGeoPointVideo({ gestures: valid, adapter });
  const pictures = EVENTS.map((e) => {
    const s = scheduled.states[e];
    return { roles: rolesOf(s, adapter), focus: s.focus, factor: s.factor, notes: s.notes.map((n) => ({ marks: n.marks, text: n.text, kind: n.kind })), named: s.named };
  });
  // The title card owns `establish`: no word of the map shows under it.
  pictures[0] = { ...pictures[0], notes: [], named: [] };
  const words = [];
  const keyOf = new Map();
  pictures.forEach((p, c) => {
    if (c === 0) return;
    for (const w of wordsOf(geometry, p.roles, p.notes, p.named)) {
      const key = `${w.text}|${w.x.toFixed(2)}|${w.y.toFixed(2)}`;
      if (!keyOf.has(key)) {
        keyOf.set(key, words.length);
        const r = w.kind === "area" ? registers.axis : w.kind === "note" || w.kind === "name" ? registers.value : registers.annot;
        const text = applyCase(w.text, r.transform);
        words.push({ ...w, text, k: words.length, cards: [], register: w.kind === "area" ? "axis" : w.kind === "note" || w.kind === "name" ? "value" : "annot", width: widthOf(text, r) });
      }
      words[keyOf.get(key)].cards.push(c);
    }
  });
  const states = flatStates({ pictures, geometry, words, boxOf });

  let titleCard;
  try {
    titleCard = titleCardFor({ registers, eyebrow: copy.eyebrow, title: [copy.title], size, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  } catch (error) {
    throw new Error(`the takeaway does not fit the title card at ${size}: ${error.message}`);
  }
  let credit;
  try {
    credit = sourceCreditFor({ registers, forms: copy.source, size, k, ...CREDIT_ONE_LINE });
  } catch {
    credit = sourceCreditFor({ registers, forms: copy.source, size, k, measure: 1, maxLines: CREDIT_MAX_LINES });
  }
  const { register: sourceRegister, ...creditBlock } = credit;
  const inset = frameInsetFor(size);

  const { ground, accent } = direction;
  const { ink, muted } = deriveFurniture(ground);
  const land = copy.land;
  const walked = (c, under, floor, what) => {
    const w = adjustToContrast(c, under, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${under}`);
    return w;
  };
  const colours = {
    ground,
    water: land,
    accent: walked(accent, land, NON_TEXT_CONTRAST_MIN, "the accent on the land"),
    neutral: walked(mix(land, ink, 0.45), land, NON_TEXT_CONTRAST_MIN, "a mark"),
    ring: walked(mix(land, ink, 0.62), land, NON_TEXT_CONTRAST_MIN, "a ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, ground, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, ground, TEXT_CONTRAST_MIN, "the title"),
      word: walked(ink, land, TEXT_CONTRAST_MIN, "a word on the map"),
      accent: walked(accent, land, TEXT_CONTRAST_MIN, "an accented word on the map"),
      source: walked(muted, ground, TEXT_CONTRAST_MIN, "the credit"),
    },
  };
  return {
    direction,
    props: {
      frame: stage,
      registers: { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis: registers.axis, annot: registers.annot, source: sourceRegister },
      titleCard,
      credit: { ...creditBlock, at: { x: inset, y: stage.height - inset - creditBlock.height } },
      halo: haloOf(registers.value, k),
      colours,
      geometry,
      states,
      words: words.map(({ cards, ...w }) => w),
      timing,
    },
  };
}
