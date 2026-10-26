// The generic half of a connected scatter SCROLLY beat, taken from
// proof/scrolly-connected-scatter-lowcarbon/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (scatter-layout.mjs +
// scatter-drive.mjs, verbatim):
//
//   1 start    every entity a hollow ring at its earlier state; the subject named;
//   2 travel   each entity slides along its arc to its later state, the arc drawn as far as it has
//              gone; the counter of the entities whose y rose climbs;
//   3 left     the entities whose x did NOT fall step back to a neutral;
//   4 subject  the subject's arc in the accent, its two moves written; the others step back;
//   5 zoom     the x domain closes onto the crowd near the origin, the heaviest leave the frame;
//   6 reading  the whole axis again, the subject in the accent; the card is the limits.
//
// This file computes every figure the cards may state (each entity's two moves, who rose, who moved
// left, the close-up's crowd) and checks the words against them; ./beat.mjs — the one file the model
// writes — gives the entities and the WORDS of each card. Copied into the beat by the harness; never
// edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { scaleLinear } from "d3-scale";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedScatterScrolly } from "./DirectedScatterScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["start", "travel", "left", "subject", "zoom", "reading"];
/** One state per card; see scatter-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { travel: 0, up: 0, filter: 0, subject: 0, zoom: 0 },
  { travel: 1, up: 1, filter: 0, subject: 0, zoom: 0 },
  { travel: 1, up: 1, filter: 1, subject: 0, zoom: 0 },
  { travel: 1, up: 1, filter: 1, subject: 1, zoom: 0 },
  { travel: 1, up: 1, filter: 0, subject: 0, zoom: 1 },
  { travel: 1, up: 1, filter: 0, subject: 1, zoom: 0 },
];
/** The y axis the drive draws: a share, 0 to 100 (scatter-layout.mjs divides by 100). */
const Y_TICKS = [0, 25, 50, 75, 100];
/** The round tops the close-up may close onto (times a power of ten). */
const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "entities", "subject", "from", "to", "xName", "yName", "format", "cards", "upCount", "subjectCounts", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "upCount", "subjectCounts", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  const absent = CARDS.slice(0, 5).filter((k) => typeof beat.cards?.[k] !== "function");
  if (absent.length) throw new Error(`beat.mjs: cards must give a function for each of ${CARDS.slice(0, 5).join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);

  // ── the entities: two states each, on two shares ─────────────────────────────────────────────
  if (!Array.isArray(beat.entities)) throw new Error(`entities must be an array of { name, label, code, from: { x, y }, to: { x, y } }`);
  if (beat.entities.length < 3 || beat.entities.length > 20) throw new Error(`entities holds ${beat.entities.length}: a connected scatter draws 3 to 20 entities`);
  assertNumbers(beat.entities.flatMap((e) => [[`${e.name} from.x`, e.from?.x], [`${e.name} from.y`, e.from?.y], [`${e.name} to.x`, e.to?.x], [`${e.name} to.y`, e.to?.y]]));
  const entities = beat.entities.map((e) => ({
    name: String(e.name),
    label: plain(String(e.label ?? e.name)),
    code: String(e.code ?? ""),
    from: { x: e.from.x, y: e.from.y },
    to: { x: e.to.x, y: e.to.y },
  }));
  if (new Set(entities.map((e) => e.name)).size !== entities.length) throw new Error(`entities holds the same name twice: one entity per name, two states each`);
  if (new Set(entities.map((e) => e.label)).size !== entities.length) throw new Error(`two entities print the same label: give each a label of its own`);
  const badCode = entities.find((e) => !/^[A-Za-z0-9]{2,5}$/.test(e.code));
  if (badCode) throw new Error(`entity ${badCode.name} has code ${JSON.stringify(badCode.code)}: every entity needs a short code of 2 to 5 letters or digits (an ISO code, "FRA") — the page prints it when the name finds no room`);
  if (new Set(entities.map((e) => e.code)).size !== entities.length) throw new Error(`two entities share a code: give each a code of its own`);
  for (const e of entities) {
    for (const [k, s] of [["from", e.from], ["to", e.to]]) {
      if (s.x < 0) throw new Error(`${e.name} ${k}.x is ${s.x}: both axes start at zero; this type cannot draw a negative x`);
      if (s.y < 0 || s.y > 100) throw new Error(`${e.name} ${k}.y is ${s.y}: this choreography's y axis is a share from 0 to 100 (%) — compute y as a percentage`);
    }
    if (e.from.x === e.to.x && e.from.y === e.to.y) throw new Error(`${e.name} does not move between ${beat.from} and ${beat.to}: a connected scatter draws a move`);
  }
  const subjectRow = entities.find((e) => e.name === beat.subject);
  if (!subjectRow) throw new Error(`subject is ${JSON.stringify(beat.subject)}, which is not the name of any entity`);

  // ── the worked example's arithmetic, generic ─────────────────────────────────────────────────
  const readingOf = (e) => ({ ...e, dx: e.to.x - e.from.x, dy: e.to.y - e.from.y, isSubject: e === subjectRow });
  const all = entities.map(readingOf);
  const subject = all.find((r) => r.isSubject);
  const up = all.filter((r) => r.dy > 0).sort((a, b) => b.dy - a.dy);
  const down = all.filter((r) => r.dy < 0).sort((a, b) => a.dy - b.dy);
  const left = all.filter((r) => r.dx < 0).sort((a, b) => a.dx - b.dx);
  const right = all.filter((r) => r.dx > 0).sort((a, b) => b.dx - a.dx);
  if (!left.length) throw new Error(`no entity's x fell between ${beat.from} and ${beat.to}: card 3 keeps the entities that moved LEFT and steps the others back, so it would empty the picture — this choreography does not fit this data`);
  if (left.length === all.length) throw new Error(`every entity's x fell: card 3 keeps the ones that moved left and would step none back — this choreography does not fit this data`);

  const topX = Math.max(...all.flatMap((r) => [r.from.x, r.to.x]));
  if (!(topX > 0)) throw new Error(`every x is zero: nothing to draw along the x axis`);
  const stepOf = (top) => {
    const t = scaleLinear().domain([0, top]).ticks(4);
    return t[1] - t[0];
  };
  const ticksTo = (top) => {
    const step = stepOf(top);
    const out = [];
    for (let t = 0; t <= Math.ceil(top / step) * step + step * 1e-9; t += step) out.push(Number(t.toFixed(10)));
    return out;
  };
  const xTicks = beat.xTicks ?? ticksTo(topX);
  const xMax = Math.max(topX * 1.08, xTicks[xTicks.length - 1]);
  const maxOf = (r) => Math.max(r.from.x, r.to.x);
  const zoomOut = beat.zoomOut ?? 2;
  if (!(Number.isInteger(zoomOut) && zoomOut >= 1)) throw new Error(`zoomOut is ${beat.zoomOut}: how many of the heaviest entities leave the frame in card 5 (1 or more)`);
  const byMax = [...all].sort((a, b) => maxOf(b) - maxOf(a));
  let zoomMax = beat.zoomMax;
  if (zoomMax === undefined) {
    const crowdTop = maxOf(byMax[zoomOut] ?? byMax[byMax.length - 1]) * 1.05;
    const power = 10 ** Math.floor(Math.log10(crowdTop));
    zoomMax = NICE.map((n) => n * power).find((n) => n >= crowdTop - 1e-9);
  }
  if (typeof zoomMax !== "number" || !(zoomMax > 0)) throw new Error(`zoomMax is ${beat.zoomMax}: the top of card 5's close-up, a positive number`);
  const crowd = all.filter((r) => maxOf(r) < zoomMax);
  const outside = all.filter((r) => !crowd.includes(r));
  if (!outside.length) throw new Error(`every entity fits under the close-up's top (${zoomMax}): card 5 closes the x axis onto the crowd near the origin and would change nothing — lower zoomMax`);
  if (crowd.length < 3) throw new Error(`only ${crowd.length} entities fit under the close-up's top (${zoomMax}): card 5 opens a crowd of at least three — raise zoomMax or lower zoomOut`);
  if (!(zoomMax < xMax * 0.8)) throw new Error(`the close-up's top (${zoomMax}) is near the whole axis (${xMax.toFixed(1)}): card 5 would barely move — lower zoomMax`);
  const zoomTicks = beat.zoomTicks ?? (Number.isInteger(zoomMax / 4) ? [0, 1, 2, 3, 4].map((i) => (zoomMax / 4) * i) : ticksTo(zoomMax).filter((t) => t <= zoomMax));
  const crowdRight = crowd.filter((r) => r.dx >= 0);
  const heaviest = all.reduce((a, b) => (b.from.x > a.from.x ? b : a));

  const reading = Object.freeze({
    count: all.length,
    from: String(beat.from),
    to: String(beat.to),
    subject,
    entities: all,
    up,
    down,
    left,
    right,
    heaviest,
    zoomMax,
    crowd,
    crowdRight,
    outside,
  });

  beat.check(reading);
  assertDrawsClaimColumn(all.flatMap((r) => [r.from.x, r.to.x, r.from.y, r.to.y]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    start: [["subject.from.x", format(subject.from.x)]],
    travel: [["up.length", String(up.length)]],
    left: [["left.length", String(left.length)]],
    subject: [["|subject.dy|", format(Math.abs(subject.dy))], ["|subject.dx|", format(Math.abs(subject.dx))]],
    zoom: [["crowdRight.length", String(crowdRight.length)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const states = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!states(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a label or the alt states must be one this kit computed, at the
  // precision it is written with, sign aside ("lost 11.8 points" states a dx of −11.8). A year
  // (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const decimal = /,/.test(beat.format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const known = [
    0, all.length, up.length, down.length, left.length, right.length, crowd.length, crowdRight.length, outside.length, zoomMax,
    ...xTicks, ...zoomTicks, ...Y_TICKS,
    ...all.flatMap((r) => [r.from.x, r.from.y, r.to.x, r.to.y, r.dx, r.dy]),
  ].map(Math.abs);
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const n = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of this scatter rounds to: every number in a card is computed — use the reading (r.subject.dx, r.subject.dy, r.up.length, r.left.length, r.crowdRight.length, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));

  const upSentence = plain(beat.upCount(reading));
  if (!states(upSentence, String(up.length))) throw new Error(`upCount() is card 2's counter, which climbs to the number of entities whose y rose: it must state "${up.length}"; it says: ${upSentence}`);
  checkFigures("upCount", upSentence);
  // The counter climbs: the first time the sentence states the count, that figure becomes {n}.
  const upTemplate = upSentence.replace(new RegExp(`(?<![\\d.,])${up.length}(?![\\d])`), "{n}");
  const subjectCounts = plain(beat.subjectCounts(reading));
  for (const [what, wanted] of OWES.subject)
    if (!states(subjectCounts, wanted)) throw new Error(`subjectCounts() is written at the subject's arc in card 4: it must state ${what} = "${wanted}"; it says: ${subjectCounts}`);
  checkFigures("subjectCounts", subjectCounts);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the counts the gestures draw (who rose, who moved left) beside the values.
  assertHeadlineNumbersDrawn(titleForms[0], [...all.flatMap((r) => [r.from.x, r.to.x, r.from.y, r.to.y]), all.length, up.length, left.length], "entities");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const xName = say("xName", beat.xName).join(" ");
  const yName = say("yName", beat.yName).join(" ");
  checkFigures("xName", xName);
  checkFigures("yName", yName);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${xName} ${yName} ${[...xTicks, ...zoomTicks, ...Y_TICKS].join(" ")}`,
    annot: "",
    value: `${all.map((r) => `${r.label} ${r.code}`).join(" ")} ${upTemplate} ${subjectCounts} 0123456789,+−·`,
  };

  const driver = [readFileSync(join(HERE, "scatter-layout.mjs"), "utf8"), readFileSync(join(HERE, "scatter-drive.mjs"), "utf8")].join("\n");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 4,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedScatterScrolly, {
            // The component's own field names: x is `weight`, y is `ownMix`; `lighter` keeps its colour in card 3.
            entities: all.map((r) => ({ code: r.code, name: r.label, from: { weight: r.from.x, ownMix: r.from.y }, to: { weight: r.to.x, ownMix: r.to.y }, lighter: r.dx < 0 })),
            subject: subject.code,
            xMax,
            zoomMax,
            xTicks,
            zoomTicks,
            yTicks: Y_TICKS,
            xName,
            yName,
            upCount: { template: upTemplate, value: up.length },
            subjectCounts,
            alt,
            regs,
            pad: direction.pad,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
          }),
          states: STATES,
          driver,
          apply: "applyScatterState",
        },
        title: titleForms,
        eyebrow,
        source,
        ground: direction.ground,
        type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
        lang,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
