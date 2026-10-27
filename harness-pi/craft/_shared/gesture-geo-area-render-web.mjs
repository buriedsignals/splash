// The web render every AREA-map gesture kit shares: read and guard the beat (gesture-geo-area-run.mjs), validate the
// gestures for the web (family geo), schedule the resting page and one control per further gesture
// (gesture-geo-area-web.mjs), write the interaction declaration from that schedule (never by the model), render the
// page (GestureGeoAreaWeb.tsx) through chart-web's renderWeb, verify it with verify-web, and print the resting
// screenshot to look at. No live tiles: the page draws the frozen shapes or the designed grid, so it spends no
// MapTiler tile and needs no key.
import { join } from "node:path";
import { GestureGeoAreaWeb } from "./GestureGeoAreaWeb.tsx";
import { stageGeo } from "./gesture-geo-area-static.mjs";
import { scheduleGeoWeb } from "./gesture-geo-area-web.mjs";
import { assertZoomFactors, readGeoBeat, readShapes, REPAIR } from "./gesture-geo-area-run.mjs";
import { layoutCells, seatsBox } from "./gesture-geo-area-shapes.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** The plot's frame in geometry units: a grid is laid wider, a shape map at Europe's own ratio. */
const FRAME = { width: 900, height: 600 };

const QUESTION = {
  filter: ["Which places does the claim keep?", "The places the claim is about keep their class colour; every other place washes toward the ground. Nothing moves.", "which places keep their ink"],
  compare: ["How does the subject stand against the other place?", "The second place is ringed beside the subject and both print their value.", "which two places are set side by side"],
  zoom: ["What does the close-up show that the whole map cannot?", "The camera frames the zoomed places; the factor is printed.", "how close the camera stands"],
};

export async function renderGeoAreaWeb(here, variant) {
  await refusing(here, async () => {
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const { beat, rows, points, geo, claim, titles, limits } = await readGeoBeat(here, variant);
    const format = (v) => plain(beat.format(v));
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    const staged = stageGeo({ gestures: beat.gestures, geo, format: "web", claim, repair: REPAIR(), stage: (valid) => {
        // The close-up's factor, from the same frame and seats the page draws (GestureGeoAreaWeb viewOf).
        const layout = layoutCells(variant, { rows, shapes: readShapes(here), grid: beat.grid, points, box: { x: 0, y: 0, width: FRAME.width, height: FRAME.height } });
        assertZoomFactors(valid, (g) => {
          const b = seatsBox(layout.cells, g.marks.map(geo.resolve), Math.max(FRAME.width, FRAME.height) * 0.08);
          return b ? 1 / Math.max(b.width / FRAME.width, b.height / FRAME.height, 0.12) : 1;
        });
        return scheduleGeoWeb({ valid, geo, format });
      } });
    for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r}`);
    const { resting, controls } = staged.staged;
    const unit = plain(beat.unit);
    const n = geo.marks.length;
    const ranked = [...geo.marks].sort((a, b) => b.value - a.value);
    const classLabels = geo.classes.map((c, i) => (i === 0 ? `< ${format(geo.breaks[0])}` : i === geo.breaks.length ? `≥ ${format(geo.breaks.at(-1))}` : `${format(c.from)} – ${format(c.to)}`));
    // What every place answers a pointer with: its value, its class and its rank — nothing the plate prints whole.
    const details = Object.fromEntries(
      geo.marks.map((m) => [m.key, plain(`${m.name} · ${format(m.value)}${unit && variant !== "dot-density" ? ` ${unit}` : ""} · ${classLabels[geo.classOf(m.key)]} · ${ranked.findIndex((r) => r.key === m.key) + 1} / ${n}`)]),
    );
    const restNotes = resting.notes.map((x) => plain(x.text));
    const restLabel = plain(beat.restLabel ?? (/^fr/.test(storyLanguage(here) ?? "") ? "la carte" : "the map"));
    const shaped = controls.map((c) => {
      // A filter of many places is chipped by its count against the whole: "7 / 40", in any language.
      const chip = plain(c.do === "filter" && / filter$/.test(c.label) ? `${c.state.kept.length} / ${n}` : c.label);
      const note = [c.note, c.reading].filter(Boolean).map(plain).join(" · ");
      return { do: c.do, legend: plain(beat.controlLegend?.[c.do] ?? (/^fr/.test(lang) ? { filter: "filtrer", compare: "comparer", zoom: "rapprocher" } : { filter: "filter", compare: "compare", zoom: "zoom" })[c.do]), chip, note, announce: `${chip} — ${note}`, state: c.state, atom: c.atom, index: c.index };
    });
    const ask = {
      question: "What is this place's value, class and rank?",
      gesture: "ask-a-mark",
      changes: "The place steps one shade toward the ink and answers with its value, its class and its rank.",
      parameter: "which place is asked about",
      authorPicked: geo.nameOf(resting.accent ?? geo.marks[0].key),
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    };
    const interaction = {
      earns: `A still must draw every gesture at once on one map. Here the reader lands on the resting map and asks for each further gesture in turn — ${shaped.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every one of the ${n} places answers with its value, class and rank.`,
      controls: [
        ask,
        ...shaped.map((c) => ({ question: QUESTION[c.do][0], gesture: c.atom, changes: QUESTION[c.do][1], parameter: QUESTION[c.do][2], authorPicked: "on", readerPicks: ["rest", "on"], heldStill: [".chart-header", ".chart-source"] })),
      ],
    };
    const title = plain(titles[0]);
    const eyebrow = plain(beat.eyebrow);
    const caveat = plain(limits[0]);
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(rows) : beat.alt);
    const textPerRegister = {
      display: title,
      eyebrow,
      body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${shaped.flatMap((c) => [c.legend, c.chip, c.note]).join(" ")} ${source} ${Object.values(details).join(" ")}`,
      axis: `${unit} ${classLabels.join(" ")} ${beat.missingLabel ?? ""} ${rows.map((r) => r.key).join(" ")}`,
      annot: `${rows.map((r) => r.name).join(" ")} ${restNotes.join(" ")}`,
      value: geo.marks.map((m) => format(m.value)).join(" "),
    };
    console.log(`  ${n} places · resting: ${staged.valid.filter((g) => !controls.some((c) => c.index === staged.valid.indexOf(g))).map((g) => g.do).join(", ")} · controls: ${shaped.map((c) => `${c.do} (${c.atom})`).join(", ")}`);
    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? geo.breaks.length + 1,
      async render({ label, direction, outDir }) {
        const { outPath } = await renderWeb({
          lang,
          component: GestureGeoAreaWeb,
          props: {
            variant,
            rows,
            shapes: readShapes(here),
            layoutGrid: beat.grid,
            points,
            breaks: geo.breaks,
            format,
            frame: FRAME,
            resting,
            controls: shaped,
            details,
            restLabel,
            restNotes,
            classLabels,
            missingLabel: plain(beat.missingLabel ?? ""),
            title,
            eyebrow,
            caveat,
            source,
            unit,
            alt,
            interaction,
            direction,
            ground: direction.ground,
            accent: direction.accent,
          },
          outDir,
          name: `${label}.html`,
        });
        return { outPath };
      },
    });
  });
}

export { join };
