// The generic half of every Part-to-whole GESTURE web page (treemap, marimekko-mosaic-plot, pie-and-donut): the
// static runner's guards (./gesture-part-run-static.mjs readPartBeat, readClaim) with the web staging: the gesture core
// on this family (format "web"), the web scheduler and the generated interaction declaration (./gesture-part-web.mjs)
// → render (renderWeb holds the page against the declaration), verify-web, look. The resting gestures are drawn on the
// page the reader lands on; every further gesture is one reader control. A gesture refusal prints REFUSED with the
// beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>"). Nothing here refuses the data's SHAPE: the page folds what it has no room
// for into one remainder part. Node-side (the kit's render-beat.mjs imports it flat from the beat folder).
import { GestureRefusal } from "./gesture-core.mjs";
import { REST, restName, SEP, shareText } from "./gesture-family-part.mjs";
import { readClaim, readPartBeat } from "./gesture-part-run-static.mjs";
import { stagePartWeb } from "./gesture-part-web.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, importBeat, legibleFormat } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

export async function runPartWeb({ here, variant, Component }) {
  const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
  await refusing(here, async () => {
    const beat = await importBeat(here);
    applyStoryboard(beat, here);
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const read = readPartBeat(beat, here, variant);
    if (beat.landingLabel === undefined || !String(beat.landingLabel).trim())
      throw new Error(`beat.mjs is missing landingLabel: give the words of the option that shows the page as it lands, e.g. "The whole" (see CONTRACT.md)`);
    const landingLabel = plain(beat.landingLabel);
    const { marks, title: titles, headlineValues } = read;
    beat.format = legibleFormat(marks.map((m) => m.value), beat.format);
    const format = (v) => plain(beat.format(v));
    const title = plain(titles[0]);
    const claim = readClaim(here, title, beat.unit);

    let staged;
    try {
      staged = stagePartWeb({ variant, gestures: beat.gestures, marks, claim, format, repair: REPAIR });
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      const { fix } = error;
      const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
      const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
      throw new Error(`${error.message}${hint}`);
    }
    for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
    const { scheduled, interaction, valid } = staged;
    assertHeadlineNumbersDrawn(title, [...headlineValues, marks.length, ...valid.map((g) => g.marks.length)], "parts");

    // ── the words, every one through plain()
    const unit = plain(beat.unit);
    const restLabel = plain(beat.restLabel);
    const whole = read.whole;
    const ranked = [...marks].sort((a, b) => b.value - a.value).map((m) => m.name);
    const restOf = scheduled.parts.filter((p) => p.rest);
    const restCount = marks.length - scheduled.parts.filter((p) => !p.rest).length;
    const displayOf = (p) => {
      if (!p.rest) return plain(p.name);
      if (variant === "marimekko-mosaic-plot") return `${restName(restLabel, { count: new Set(marks.map((m) => m.key)).size - new Set(scheduled.parts.filter((x) => !x.rest).map((x) => x.key)).size })}${SEP}${p.series}`;
      return restName(restLabel, { count: restCount });
    };
    const parts = scheduled.parts.map((p) => {
      const display = displayOf(p);
      const share = shareText(format, p.value / whole);
      const rank = p.rest ? null : `${ranked.indexOf(p.name) + 1} / ${marks.length}`;
      return {
        name: p.name,
        value: p.value,
        key: p.key === REST ? REST : p.key,
        series: p.series,
        rest: Boolean(p.rest),
        label: format(p.value),
        display,
        detail: [display, `${format(p.value)}${unit ? ` ${unit}` : ""}`, share, rank].filter(Boolean).join(" · "),
      };
    });
    const repeated = parts.find((p, i) => parts.findIndex((x) => x.detail === p.detail) !== i);
    if (repeated) throw new Error(`two parts answer with the same words (${JSON.stringify(repeated.detail)}): give each part its own name`);

    const controls = scheduled.controls.map((c) => {
      const chip = plain(c.label ?? c.chip);
      const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
      return { ...c, legend: plain(c.label ?? c.legend), chip, note, announce: `${chip} — ${note}` };
    });
    const restNotes = scheduled.resting.notes.map((n) => {
      const text = plain(n.text);
      return n.marks.length && !n.marks.some((m) => text.includes(m)) ? `${n.marks.join(", ")}: ${text}` : text;
    });
    // A count's figure rests on the page: in a donut's hole, else beside the other resting notes.
    if (scheduled.resting.count && variant !== "pie-and-donut") restNotes.push(plain(scheduled.resting.count.text));
    const eyebrow = plain(beat.eyebrow);
    const caveat = plain([beat.limits].flat()[0]);
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(marks) : beat.alt);
    const wholeLabel = format(whole);
    const textPerRegister = {
      display: title,
      eyebrow,
      body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${landingLabel} ${controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ")} ${source} ${parts.map((p) => p.detail).join(" ")}`,
      axis: `${unit} ${wholeLabel} ${parts.map((p) => p.key ?? "").join(" ")} ${restLabel}`,
      annot: `${restNotes.join(" ")} ${parts.map((p) => p.display).join(" ")}`,
      value: `${parts.map((p) => `${p.label} ${p.display} ${p.series ?? ""}`).join(" ")} ${wholeLabel} ${scheduled.resting.count?.text ?? ""}`,
    };
    console.log(`  ${parts.length} of ${marks.length} parts drawn${restOf.length ? " (the rest as one part)" : ""} · resting: ${valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);

    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const { outPath } = await renderWeb({
          lang,
          component: Component,
          props: {
            variant,
            parts,
            resting: scheduled.resting,
            controls,
            restLabel,
            landingLabel,
            restNotes,
            wholeLabel,
            title,
            eyebrow,
            caveat,
            source,
            unit,
            alt,
            interaction,
            direction,
            format,
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
