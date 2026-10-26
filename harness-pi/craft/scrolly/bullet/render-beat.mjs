// The generic half of a bullet SCROLLY beat, taken from
// proof/scrolly-bullet-low-carbon-share/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (bullet-drive.mjs, verbatim):
//
//   1 tracks   the thick pale bars — the earlier state — extending from zero along tracks to 100 %;
//   2 measure  the thin saturated bars — the later state — extending on from where the earlier ends;
//   3 gain     the rows re-sorting by their gain, the subject rising to the top, every gain counted;
//   4 half     the half (50 %) ruled across the tracks, every row past it stepping back;
//   5 zoom     the axis closing onto zoomFrom–100 %, where the already-high rows' gains become visible;
//   6 reading  back to the full track and the earlier order; the card states the accounting (the limits).
//
// The drive's track is a SHARE in % (0 to 100), its half is ruled at 50, and it counts every row's gain
// as "+x,x pts" (a plus, a decimal comma). This file computes every figure the cards may state and
// checks the words against them; ./beat.mjs — the one file the model writes — gives the rows and the
// WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedBulletScrolly } from "./DirectedBulletScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["tracks", "measure", "gain", "half", "zoom", "reading"];
/** The track's end and the half the drive rules (both fixed in bullet-drive.mjs). */
const CEILING = 100;
const HALF = 50;
/** One state per card; see bullet-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { marker: 1, measure: 0, reorder: 0, verdict: 0, half: 0, zoom: 0 },
  { marker: 1, measure: 1, reorder: 0, verdict: 0, half: 0, zoom: 0 },
  { marker: 1, measure: 1, reorder: 1, verdict: 1, half: 0, zoom: 0 },
  { marker: 1, measure: 1, reorder: 1, verdict: 1, half: 1, zoom: 0 },
  { marker: 1, measure: 1, reorder: 1, verdict: 1, half: 0, zoom: 1 },
  { marker: 1, measure: 1, reorder: 0, verdict: 1, half: 0, zoom: 0 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "unit", "format", "labels", "cards", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["labels", ["marker", "measure", "half"]]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the rows: one per member, an earlier and a later share ───────────────────────────────────────
  if (!Array.isArray(beat.rows)) throw new Error(`rows must be an array of { name, label, marker, measure }, one per member`);
  assertNumbers(beat.rows.map((r) => [r.name, r.marker]), "markers");
  assertNumbers(beat.rows.map((r) => [r.name, r.measure]), "measures");
  const rows = beat.rows.map((r) => ({ name: String(r.name), label: String(r.label ?? r.name), marker: Number(r.marker), measure: Number(r.measure) }));
  if (rows.length < 3 || rows.length > 10) throw new Error(`rows holds ${rows.length} members: this choreography re-sorts 3 to 10 rows`);
  if (new Set(rows.map((r) => r.name)).size !== rows.length) throw new Error(`rows holds the same name twice: give each member ONE row`);
  const off = rows.find((r) => r.marker < 0 || r.marker > CEILING || r.measure < 0 || r.measure > CEILING);
  if (off) throw new Error(`${off.name} is at ${off.marker} then ${off.measure}: the track is a share in %, 0 to ${CEILING}. Compute the share (part ÷ whole × 100)`);
  const loss = rows.find((r) => r.measure < r.marker);
  if (loss)
    throw new Error(`${loss.name} falls from ${loss.marker} to ${loss.measure}: the later bar extends ON from the earlier one and the drive counts every change as a gain ("+x pts"). This choreography cannot draw a loss`);
  const decimal = /,/.test(beat.format(1.5, 1)) ? "," : ".";
  if (decimal !== ",")
    throw new Error(`format() writes a decimal point, but the drive counts every row's gain as "+x,x pts" with a decimal comma: this choreography can only be set in a language that writes a decimal comma`);

  const withGain = rows.map((r) => ({ ...r, gain: r.measure - r.marker }));
  const subject = withGain.find((r) => r.name === beat.subject);
  if (!subject) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a row's name (${rows.map((r) => r.name).join(", ")})`);
  const ranked = [...withGain].sort((a, b) => b.gain - a.gain || (a === subject ? -1 : b === subject ? 1 : 0));
  if (ranked[0] !== subject)
    throw new Error(`subject is ${subject.name}, but ${ranked[0].name} gained most (+${ranked[0].gain.toFixed(1)} against +${subject.gain.toFixed(1)}): card 3 re-sorts the rows by gain and lifts the subject to the top, where its states are named. Set subject to the row that moved furthest, or check the rows`);
  const zoomFrom = beat.zoomFrom ?? 90;
  if (!(zoomFrom > HALF && zoomFrom < CEILING)) throw new Error(`zoomFrom is ${beat.zoomFrom}: card 5 narrows the axis onto zoomFrom–${CEILING}, so give a share between ${HALF} and ${CEILING}`);
  const zoomMid = (zoomFrom + CEILING) / 2;
  const inZoom = ranked.filter((r) => r.marker >= zoomFrom);
  if (!inZoom.length) throw new Error(`no row starts at or above zoomFrom (${zoomFrom}): card 5's close-up is about the rows already high, so lower zoomFrom to under the highest earlier share (${Math.max(...rows.map((r) => r.marker))})`);

  const byMarker = [...ranked].sort((a, b) => b.marker - a.marker);
  const byMeasure = [...ranked].sort((a, b) => b.measure - a.measure);
  const saturated = ranked.filter((r) => r.marker >= zoomMid);
  const view = (r) => Object.freeze({ ...r });
  const reading = Object.freeze({
    count: rows.length,
    rows: Object.freeze(ranked.map(view)),
    subject: view(subject),
    byMarker: Object.freeze(byMarker.map(view)),
    byMeasure: Object.freeze(byMeasure.map(view)),
    firstBefore: view(byMarker[0]),
    lastBefore: view(byMarker[byMarker.length - 1]),
    nextAbove: view(byMeasure[byMeasure.length - 2]),
    underHalf: Object.freeze(ranked.filter((r) => r.measure < HALF).map(view)),
    sameOrder: byMeasure.every((r, i) => r === byMarker[i]),
    zoomFrom,
    zoomMid,
    inZoom: Object.freeze(inZoom.map(view)),
    saturated: Object.freeze({ threshold: zoomMid, count: saturated.length, rows: Object.freeze(saturated.map(view)), maxGain: saturated.length ? Math.max(...saturated.map((r) => r.gain)) : null }),
  });
  beat.check(reading);
  assertDrawsClaimColumn(rows.flatMap((r) => [r.marker, r.measure]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value, arg = reading) => {
    const text = typeof value === "function" ? value(arg) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v, decimals = 1) => plain(beat.format(v, decimals));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];

  const owns = (text, wanted) => new RegExp(`(?<![\\d.,])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);
  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const OWES = {
    tracks: [["lastBefore.marker", format(reading.lastBefore.marker)]],
    measure: [],
    gain: [["subject.marker", format(subject.marker)], ["subject.measure", format(subject.measure)], ["subject.gain", format(subject.gain)]],
    half: [["subject.measure", format(subject.measure)], ["nextAbove.measure", format(reading.nextAbove.measure)]],
    zoom: [],
  };
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!owns(text, wanted)) throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });
  const markerLabel = say("labels.marker", beat.labels.marker).join(" ");
  const measureLabel = say("labels.measure", beat.labels.measure).join(" ");
  const halfLabel = say("labels.half", beat.labels.half).join(" ");
  if (!owns(markerLabel, format(subject.marker, 0))) throw new Error(`labels.marker names the earlier state on the subject's row and must state its share "${format(subject.marker, 0)}"; it says: ${markerLabel}`);
  if (!owns(measureLabel, format(subject.measure, 0))) throw new Error(`labels.measure names the later state on the subject's row and must state its share "${format(subject.measure, 0)}"; it says: ${measureLabel}`);

  // Every other figure a card, a label or the alt states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2, 10e) pass.
  const group = "[ .]";
  const known = [
    reading.count, HALF, CEILING, zoomFrom, zoomMid, saturated.length, inZoom.length, reading.underHalf.length,
    ...ranked.flatMap((r) => [r.marker, r.measure, r.gain]),
  ];
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [w, frac = ""] = raw.split(",");
      const n = Number(`${w.replace(/[ .]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these rows rounds to: every number is computed — use the reading (r.subject.gain, r.subject.measure, r.nextAbove.measure, r.lastBefore.marker, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  [["labels.marker", markerLabel], ["labels.measure", measureLabel], ["labels.half", halfLabel]].forEach(([w, t]) => checkFigures(w, t));

  const titleForms = [beat.title].flat().map(plain);
  const title = titleForms[0];
  // The title may state the subject's gain ("+17.3 points") — the figure its row writes.
  assertHeadlineNumbersDrawn(title, [...ranked.flatMap((r) => [r.marker, r.measure]), ...ranked.map((r) => r.gain)], "rows");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The verdict the drive counts to: "+x,x pts", one decimal — the server-rendered text matches it.
  const outRows = ranked.map((r, i) => ({ key: `r${i + 1}`, label: plain(r.label), marker: r.marker, measure: r.measure, verdict: `+${r.gain.toFixed(1).replace(".", ",")} pts` }));
  const tick = (v) => ({ value: v, label: v === CEILING ? `${format(v, 0)} ${unit}` : format(v, 0) });
  const ticks = [0, HALF, CEILING].map(tick);
  const zoomTicks = [zoomFrom, zoomMid, CEILING].map(tick);
  const orderBefore = ranked.map((r) => byMarker.indexOf(r));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${ticks.map((t) => t.label).join(" ")} ${zoomTicks.map((t) => t.label).join(" ")}`,
    annot: `${outRows.map((r) => r.label).join(" ")} ${markerLabel} ${measureLabel} ${halfLabel}`,
    value: `${outRows.map((r) => r.verdict).join(" ")} +0123456789, pts`,
  };

  const driver = readFileSync(join(HERE, "bullet-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { ink, muted, grid } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedBulletScrolly, {
            rows: outRows,
            subject: outRows[0].key,
            ceiling: CEILING,
            markerLabel,
            measureLabel,
            halfLabel,
            ticks,
            zoomTicks,
            zoomFrom,
            orderBefore,
            alt,
            regs,
            pad: direction.pad,
            stroke: direction.stroke ?? {},
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
            grid,
          }),
          states: STATES,
          driver,
          apply: "applyBulletState",
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
