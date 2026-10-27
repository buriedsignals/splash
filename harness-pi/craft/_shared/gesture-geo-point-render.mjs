// The format half of a point-map gesture beat (web, scrolly, video), shared by the four types. Each type's runner
// (the static gesture runner, run with its FORMAT set) reads the data, joins it, checks the claim, stages the
// gestures with the core for that format, bakes the static plate and projects every mark once — then hands its
// GEOMETRY (the plate image and the marks in the plate's view units) and the validated gestures here. This file
// schedules them for the format (gesture-geo-point-{web,scrolly,video}.mjs), turns each state into the drawing's roles,
// and renders through the format's own runner (web.mjs → verify-web, scrolly.mjs → verify-scrolly). The basemap is the
// baked plate in every format: no live map, so no extra MapTiler call beyond the one bake. Runner-side (Node).
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { GestureGeoPointWeb } from "./GestureGeoPointWeb.tsx";
import { GestureGeoPointScrolly } from "./GestureGeoPointScrolly.tsx";
import { boxOf, wordsOf } from "./GestureGeoPointMap.tsx";
import { printFactor, rolesOf } from "./gesture-geo-point-family.mjs";
import { scheduleGeoPointWeb } from "./gesture-geo-point-web.mjs";
import { APPLY, driveSource, flatStates, scheduleGeoPointScrolly } from "./gesture-geo-point-scrolly.mjs";
import { chartWeb, plain, renderBeatWeb, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const forms = (v) => [v].flat();

/** A state as one picture: its roles, its camera, its words. */
const pictureOf = (state, adapter) => ({
  roles: rolesOf(state, adapter),
  focus: state.focus,
  factor: state.factor,
  notes: state.notes.map((n) => ({ marks: n.marks, text: plain(n.text), kind: n.kind })),
  named: state.named,
});

/** A control's legend and pill, language-neutral: the marks it acts on, and what it prints. */
function controlWords(c, adapter, format, label) {
  const names = [...new Set((c.state.kept ?? c.state.focus ?? c.state.named.slice(-2)).map((n) => label(n)))];
  const short = names.length > 3 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  if (c.do === "filter") return { legend: short, chip: `${c.state.kept.length} / ${adapter.names.length}` };
  if (c.do === "zoom") return { legend: short, chip: `×${printFactor(c.factor)}` };
  const [a, b] = c.state.named.slice(-2);
  return { legend: `${label(a)} / ${label(b)}`, chip: `${format(adapter.valueOf(a))} / ${format(adapter.valueOf(b))}` };
}

/**
 * @param format    "web" | "scrolly"
 * @param here      the beat folder
 * @param variant   symbol | flow | locator | contour
 * @param beat      the beat (title, limits, source, eyebrow, alt, unit, restLabel, cards…)
 * @param geometry  { W, H, plate, marks, origin?, furniture?, references?, whole }
 * @param valid     the core's validated gestures, for this format
 * @param adapter   createGeoPoint(…)
 * @param format_   how a value is printed; label(name) → how a mark is printed
 * @param land      the land tint the marks sit on (the plate's)
 * @param alt       the alt text, already resolved against what the plate draws
 * @param picked    the run's direction, unresolved (video), and id its label
 */
export async function renderGeoPointFormat(formatName, { here, variant, beat, geometry, valid, adapter, valueFormat = String, label = (n) => n, land, textPerRegister, alt, picked, id: directionId }) {
  const title = plain(forms(beat.title)[0]);
  const caveat = plain(forms(beat.limits)[0]);
  const source = plain(beat.source);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit ?? "");
  const altText = plain(alt ?? (typeof beat.alt === "function" ? beat.alt() : beat.alt));
  const lang = beat.lang ?? storyLanguage(here) ?? "en";

  if (formatName === "web") {
    const scheduled = scheduleGeoPointWeb({ gestures: valid, adapter });
    const restLabel = plain(beat.restLabel ?? "");
    if (!restLabel.trim()) throw new Error('beat.mjs: restLabel is empty: give the words of the option that shows the map as it lands, e.g. "La carte seule"');
    const controls = scheduled.controls.map((c) => {
      const words = controlWords(c, adapter, valueFormat, label);
      const legend = plain(valid[c.index].label ?? words.legend);
      // A note that only repeats the pill (a zoom's "×3") says where the camera went as well.
      const said = plain(c.note ?? "");
      const note = !said || said.replace(/[,.]/g, "") === plain(words.chip).replace(/[,.]/g, "") ? `${legend} · ${said || plain(words.chip)}` : said;
      // The control's own words are its sentence under the controls, never written a second time on its picture.
      const picture = pictureOf(c.state, adapter);
      picture.notes = picture.notes.filter((_, k) => c.state.notes[k].index !== c.index);
      return { legend, chip: plain(words.chip), note, announce: `${plain(words.chip)} — ${note || legend}`, picture };
    });
    const restNotes = scheduled.resting.notes.filter((n) => n.kind === "set").map((n) => plain(n.text));
    const HELD = [".chart-header", ".chart-source"];
    const interaction = {
      earns: `A still draws every gesture at once on one plate; here the reader lands on the resting map and asks for each further gesture in turn — ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")} — and every mark answers with what the plate prints nowhere.`,
      controls: [
        { question: "What is this mark, and what is it worth?", gesture: "ask-a-mark", changes: "The mark under the pointer answers with its name and value.", parameter: "which mark is asked about", authorPicked: scheduled.resting.accent[0] ?? adapter.names[0], readerPicks: "every mark", heldStill: HELD },
        ...scheduled.controls.map((c) => ({
          question: c.question,
          gesture: c.atom,
          changes: c.changes,
          parameter:
            c.do === "filter"
              ? `whether gestures[${c.index}] keeps only ${c.state.kept.length} of ${adapter.names.length} marks in ink`
              : c.do === "zoom"
                ? `the zoom of gestures[${c.index}] onto ${c.state.focus.join(", ")}`
                : `whether gestures[${c.index}] sets ${c.state.named.slice(-2).join(" against ")}`,
          authorPicked: "on",
          readerPicks: ["rest", "on"],
          heldStill: HELD,
        })),
      ],
    };
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    console.log(`  web: resting ${valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);
    await renderBeatWeb({
      here,
      textPerRegister: { ...textPerRegister, body: `${textPerRegister.body} ${restLabel} ${controls.map((c) => `${c.legend} ${c.chip} ${c.note}`).join(" ")} ${restNotes.join(" ")}`, value: `${textPerRegister.value ?? ""} ${geometry.marks.map((m) => m.label).join(" ")}` },
      evidenceLevels: beat.evidenceLevels ?? 3,
      async render({ label: id, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const { outPath } = await renderWeb({
          lang,
          component: GestureGeoPointWeb,
          props: { variant, geometry, resting: pictureOf(scheduled.resting, adapter), controls, restLabel, restNotes, title, eyebrow, caveat, source, unit, alt: altText, interaction, direction, ground: direction.ground, accent: direction.accent, ink, muted, land },
          outDir,
          name: `${id}.html`,
        });
        return { outPath };
      },
    });
    return;
  }

  if (formatName === "scrolly") {
    const scheduled = scheduleGeoPointScrolly({ gestures: valid, adapter });
    const cardOf = (g) => forms(g.card ?? g.note ?? "").map(plain).filter(Boolean);
    const prose = [...valid.map((g, i) => {
      const p = cardOf(g);
      if (!p.length) throw new Error(`gestures[${i}] has no card: give it card: "the words this card says" (in the story's language)`);
      return p;
    }), [caveat]];
    const steps = [...valid.map((_, i) => `g${i + 1}`), "limits"];
    const pictures = [...scheduled.cards.map((c) => pictureOf(c.state, adapter)), pictureOf(scheduled.closing.state, adapter)];
    // Every word any card prints, once, with the cards that print it.
    const words = [];
    const keyOf = new Map();
    pictures.forEach((p, c) => {
      for (const w of wordsOf(geometry, p.roles, p.notes, p.named)) {
        const key = `${w.text}|${w.x.toFixed(2)}|${w.y.toFixed(2)}`;
        if (!keyOf.has(key)) {
          keyOf.set(key, words.length);
          words.push({ ...w, k: words.length, cards: [] });
        }
        words[keyOf.get(key)].cards.push(c);
      }
    });
    let states = flatStates({ pictures, geometry, words, boxOf });
    // A closing card that would change nothing (the last gesture already stands at the whole map) is not a card: the
    // limits fold into the last gesture's card.
    if (states.length > 1 && JSON.stringify(states.at(-1)) === JSON.stringify(states.at(-2))) {
      states = states.slice(0, -1);
      pictures.pop();
      const limits = prose.pop();
      prose[prose.length - 1] = [...prose[prose.length - 1], ...limits];
      steps.splice(steps.length - 2, 1);
    }
    const cams = states.map((s) => ({ vx: s.vx, vy: s.vy, vw: s.vw, vh: s.vh }));
    console.log(`  scrolly: cards ${steps.join(" · ")}`);
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    await renderBeatScrolly({
      here,
      states,
      textPerRegister: { ...textPerRegister, body: `${textPerRegister.body} ${prose.flat().join(" ")}`, value: `${textPerRegister.value ?? ""} ${geometry.marks.map((m) => m.label).join(" ")}` },
      evidenceLevels: beat.evidenceLevels ?? 3,
      async render({ label: id, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(GestureGeoPointScrolly, { geometry, pictures, words, cams, unit, alt: altText, regs, ground: direction.ground, accent: direction.accent, ink, land }),
            states,
            driver: driveSource(),
            apply: APPLY,
          },
          title: forms(beat.title).map(plain),
          eyebrow,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang,
          outDir,
          name: `${id}.html`,
        });
        return { outPath };
      },
    });
    return;
  }
  if (formatName === "video") {
    const { join } = await import("node:path");
    const { videoExportSize } = await import("#shared/chart-video/sizes.mjs");
    const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
    const SIZE = videoExportSize();
    const { GESTURE_VIDEO_TIMING } = await import(join(here, "timing-contract.ts"));
    const { buildGeoPointVideo } = await import("./gesture-geo-point-video-build.mjs");
    const { props } = await buildGeoPointVideo({ here, chosen: picked, geometry, valid, adapter, copy: { eyebrow, title, source: forms(beat.source).map(plain), land }, size: SIZE, timing: GESTURE_VIDEO_TIMING, textPerRegister });
    const { GestureGeoPointFrame } = await import("./GestureGeoPointFrame.tsx");
    const { assertEventFramesReadable, renderBeatVideo } = await import("./video.mjs");
    assertEventFramesReadable(GestureGeoPointFrame, props, SIZE, directionId);
    const { wantedOf } = await import(skillScriptFrom(here, "chart-video", "scripts", "video-faces.mjs"));
    const T = props.timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    console.log(`  video: ${valid.map((g, i) => `${["reveal", "subject", "conclusion"][i]} ${g.do}`).join(" · ")}`);
    await renderBeatVideo({
      Frame: GestureGeoPointFrame,
      here,
      label: SIZE === "landscape" ? directionId : `${directionId}-${SIZE}`,
      composition: `zone-video-geo-point-gestures-${SIZE}`,
      size: SIZE,
      props,
      wanted: wantedOf(props.registers),
      lookFrames: [
        { name: "end-establish", frame: end("establish") },
        { name: "end-reveal", frame: end("reveal") },
        { name: "subject-mid", frame: mid("subject") },
        { name: "end-subject", frame: end("subject") },
        { name: "final", frame: T.total - 1 },
      ],
      lookOnly: process.argv.includes("--look-only"),
    });
    return;
  }
  throw new Error(`no ${formatName} format for the point maps here`);
}
