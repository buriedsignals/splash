// The generic half of a stacked-bar GESTURE web page (Stack family, craft/gestures/GRAMMAR.md F2): the per-type kit's
// runner (web/stacked-bar/render-beat.mjs) with its fixed interaction replaced by the beat's `gestures`. Guard order:
// applyStoryboard → REQUIRED → the family model → the shared guards → check() → the gesture core on the family's
// marks (validateStack, format "web", claim read from STORYBOARD.md) → the web scheduler and the generated
// interaction declaration (./gesture-stack-web.mjs) → render (renderWeb holds the page against the declaration),
// verify-web, look. The resting gestures are drawn on the page the reader lands on; every further gesture is one
// reader control. A gesture refusal prints REFUSED with the beat.mjs field and a value that works; with
// SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12
// times. Nothing here refuses the data's SHAPE. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { webRegisters } from "#shared/design-base/web.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { GestureStackWeb } from "./GestureStackWeb.tsx";
import { GestureRefusal } from "./gesture-core.mjs";
import { stageStackWeb } from "./gesture-stack-web.mjs";
import { loadStackBeat } from "./gesture-stack-beat.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const VARIANT = "stacked-bar";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
const GUTTER = { min: 60, max: 220, pad: 19 };

await refusing(HERE, async () => {
  const { beat, stack, claim } = await loadStackBeat(HERE, VARIANT);
  if (beat.restLabel === undefined || !String(beat.restLabel).trim())
    throw new Error('beat.mjs is missing restLabel: give the words of the option that shows the page as it lands, e.g. "Le mix seul" (see CONTRACT.md)');
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText, seriesInks } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));
  const format = (v) => plain(beat.format(v));

  let staged;
  try {
    staged = stageStackWeb({ gestures: beat.gestures, stack, claim, format, repair: REPAIR });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { scheduled, interaction } = staged;

  // ── the words, every one through plain()
  const unit = plain(beat.unit ?? "");
  const title = plain([beat.title].flat()[0]);
  const restLabel = plain(beat.restLabel);
  const running = stack.anchorMode === "running";
  const details = new Map();
  for (const m of stack.marks) {
    const bar = m.key;
    const w = stack.whole(bar);
    const text = running
      ? `${bar} · ${stack.names.indexOf(bar) === 0 ? format(m.value) : `${m.value >= 0 ? "+" : "−"}${format(Math.abs(m.value))}`}${unit ? ` ${unit}` : ""} · ${format(stack.levelAfter(bar))}`
      : `${bar} · ${m.series} · ${format(m.value)}${unit && unit !== "%" ? ` ${unit}` : unit === "%" ? " %" : ""} · ${w ? `${((m.value / w) * 100).toFixed(0)} %` : ""} · ${format(w)}`;
    details.set(m.name, plain(text));
  }
  if (running) details.set("closing", plain(`${stack.closing.name} · ${format(stack.closing.value)}${unit ? ` ${unit}` : ""}`));
  const controls = scheduled.controls.map((c) => {
    const chip = plain(c.chip);
    const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
    return { ...c, legend: plain(c.label ?? c.legend), chip, note, announce: `${chip} — ${note}` };
  });
  const restNotes = [
    ...scheduled.resting.notes.map((n) => {
      const text = plain(n.text);
      return n.bars?.length && !n.bars.some((b) => text.toLowerCase().includes(b.toLowerCase())) ? `${n.bars.join(", ")}: ${text}` : text;
    }),
    ...(scheduled.resting.count ? [plain(scheduled.resting.count.text)] : []),
    ...scheduled.resting.references.filter((r) => r.note).map((r) => plain(r.note)),
  ];
  const eyebrow = plain(beat.eyebrow);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(stack.names) : beat.alt);
  const keyParts = running ? [] : VARIANT === "diverging-stacked-bar-likert" ? [...[...stack.left].reverse(), ...(stack.centre ? [stack.centre] : []), ...stack.right] : stack.parts;
  const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${controlText} ${source} ${[...details.values()].join(" ")}`,
    axis: `${unit} ${stack.names.join(" ")} ${keyParts.join(" ")} ${beat.leftName ?? ""} ${beat.rightName ?? ""} ${running ? stack.closing.name : ""}`,
    annot: restNotes.join(" "),
    value: stack.marks.map((m) => format(m.value)).join(" ") + " " + stack.names.map((b) => format(stack.whole(b))).join(" "),
  };
  console.log(`  ${stack.marks.length} segments · resting: ${staged.valid.filter((g) => !scheduled.controls.some((c) => c.index === staged.valid.indexOf(g))).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const newsroom = readPalette(HERE);
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const widest = Math.max(...stack.names.map((n) => labelBoxPx(n, { ...regs.axis, fontWeight: 700 }, measureText, { chip: false }).w));
      const gutterPx = Math.max(GUTTER.min, Math.min(GUTTER.max, Math.ceil(widest + GUTTER.pad)));
      const decreaseInk = running ? seriesInks({ ground: direction.ground, accent: direction.accent, accents: [direction.accent, ...(newsroom.accents ?? []).slice(1)] }, 2)[1] : undefined;
      const H = Math.max(stack.names.length * 30, 280);
      const nameBox = labelBoxPx("Hg", regs.axis, measureText, { chip: false }).h;
      const rowFloor = !running && stack.names.length >= 2 ? { rows: stack.names.length, pitch: H / stack.names.length, px: Math.ceil(nameBox), why: `Each of the ${stack.names.length} bars carries its name in the gutter and its total at its end; under that pitch a bar prints both over its neighbour's.` } : null;
      // The key's fills, the same ramp the component draws (its first bar's).
      const { mix } = await import(chartWeb(HERE, "scripts", "colour.mjs"));
      const keyItems = keyParts.map((p) => {
        if (VARIANT === "stacked-bar") {
          const i = stack.parts.indexOf(p);
          const t = stack.parts.length === 1 ? 0 : 1 - i / (stack.parts.length - 1);
          return { label: plain(p), fill: mix(direction.accent, direction.ground, 0.62 * t) };
        }
        const side = stack.sideOf(p);
        if (side === "centre") return { label: plain(p), fill: mix(direction.ground, furniture.ink, 0.14) };
        const list = side === "left" ? stack.left : stack.right;
        const t = (list.indexOf(p) + 1) / list.length;
        return { label: plain(p), fill: side === "left" ? mix(mix(furniture.muted, direction.ground, 0.2), furniture.ink, t * 0.6) : mix(mix(direction.accent, direction.ground, 0.7), direction.accent, t) };
      });
      const { outPath } = await renderWeb({
        lang,
        component: GestureStackWeb,
        props: {
          variant: VARIANT,
          stack,
          resting: scheduled.resting,
          controls,
          details,
          format,
          restLabel,
          restNotes,
          gutterPx,
          keyItems,
          sideNames: VARIANT === "diverging-stacked-bar-likert" ? { left: beat.leftName && plain(beat.leftName), right: beat.rightName && plain(beat.rightName) } : undefined,
          decreaseInk,
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
        rowFloor,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
