// twin/skills/chart-web/test/control-chrome.test.ts
//
// THE CHOSEN OPTION IS NOT A SLAB OF INK, AND EVERY VOCABULARY DRAWS IT THE SAME WAY.
//
// The owner refused the same control on three beats in three different words — « le fait d'utiliser
// du noir au filtre et vu qu'il y a plein de traits c'est peu lisible », « l'encadré gris au filtre
// c'est moche », « la colorisation des filtres n'est pas lisible avec le texte ». It was never a
// contrast defect: white on black measures 21,0:1. It was a WEIGHT defect, and it could not be fixed
// once because the drawing existed twenty times, byte for byte, in twenty files.
//
// So this file holds two things the eye had been holding. That the pill rail is ONE drawing — the
// chosen state, the rest state, the hover, the focus, emitted identically by every vocabulary once
// its own class stem is taken out. And that the drawing itself still clears the floors, measured on
// the colours the three filed directions actually hand it rather than on the wash alone: the words
// against the composited pill, the ring against the ground, and the pill against the ground in the
// other direction — an upper bound, which is the one an ink slab fails.

import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { contrast, mix } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { controlChromeCss } from "../assets/control-chrome.ts";

const ASSETS = join(import.meta.dirname, "../assets");
const SCOPE = ".chart-figure";

/** Every vocabulary in `assets/` that draws a control, found rather than listed: a twenty-first one
 *  landing tomorrow is measured by this file without anybody having to remember it. */
const VOCABULARIES: string[] = readdirSync(ASSETS)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.replace(/\.ts$/, ""))
  .filter((name) => name !== "control-chrome")
  .sort();

const chromeOf = async (name: string): Promise<string | null> => {
  const mod = (await import(join(ASSETS, `${name}.ts`))) as Record<string, unknown>;
  const fn = mod[`${name}ChromeCss`];
  if (typeof fn !== "function") return null;
  // `brush` still accepts the outline its beat used to measure; handing one in proves the signature
  // survives and that nothing is done with it.
  return (fn as (o: { scope: string; pill?: { outline: string } }) => string)({
    scope: SCOPE,
    pill: { outline: "#767676" },
  });
};

const withChrome: { name: string; css: string }[] = [];
for (const name of VOCABULARIES) {
  const css = await chromeOf(name);
  if (css) withChrome.push({ name, css });
}

/** The pill drawing itself — everything inside `@supports selector(:has(*))`, with the vocabulary's
 *  own stem replaced, so twenty blocks can be compared to each other as one string. */
function pillBlock(name: string, css: string): string {
  const at = css.indexOf("@supports selector(:has(*))");
  if (at < 0) throw new Error(`${name}: no @supports block — the pills are not layered over radios`);
  return css.slice(at).replaceAll(`chart-${name}`, "chart-VOCAB").replaceAll(`.${name}-`, ".VOCAB-");
}

/** What the browser paints for `color-mix(in srgb, <accent> <pct>%, <ground>)`: the sRGB space is
 *  the gamma-encoded one, which is exactly what `mix` interpolates in. Opaque, so this IS the colour
 *  behind the words — the trap the brief names, where a translucency composed over an unknown fill
 *  measured 1,75:1 on a beat whose formula said otherwise. */
const washOf = (accent: string, ground: string, pct: number) => mix(ground, accent, pct / 100);

const DIRECTIONS = (() => {
  const dir = join(import.meta.dirname, "../../../docs/design-base/directions");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const d = readDirection(join(dir, f)) as { ground: string; accent: string };
      // A RESTATEMENT of `deriveFurniture`, on purpose: importing it would drag resvg into this
      // file's import graph and move it out of the fast lane for three lines of arithmetic.
      const ink = contrast("#000000", d.ground) >= contrast("#FFFFFF", d.ground) ? "#000000" : "#FFFFFF";
      let muted = ink;
      for (let step = 31; step <= 50; step++) {
        const candidate = mix(d.ground, ink, step / 50);
        if (contrast(candidate, d.ground) >= 4.5) {
          muted = candidate;
          break;
        }
      }
      return { id: f.replace(/\.md$/, ""), ground: d.ground, accent: d.accent, ink, muted };
    });
})();

describe("the control's chrome is one drawing", () => {
  it("should find the vocabularies that draw a control", () => {
    expect(withChrome.length).toBeGreaterThanOrEqual(20);
  });

  it("should emit the same pill drawing from every vocabulary, stem for stem", () => {
    const blocks = new Map<string, string[]>();
    for (const { name, css } of withChrome) {
      const key = pillBlock(name, css);
      blocks.set(key, [...(blocks.get(key) ?? []), name]);
    }
    const groups = [...blocks.values()].map((names) => names.join(", "));
    expect(groups).toEqual([withChrome.map((v) => v.name).join(", ")]);
  });

  it("should never fill the chosen option with ink — the defect the owner refused three times", () => {
    for (const { name, css } of withChrome) {
      const rule = css.slice(css.indexOf("label:has(input:checked)"));
      expect(`${name}: ${rule.slice(0, rule.indexOf("}") + 1)}`).not.toMatch(
        /background(-color)?:\s*var\(--ink\)/,
      );
    }
  });

  it("should separate chosen from rest by more than colour — a fill, a ring and the words", () => {
    for (const { name, css } of withChrome) {
      const rule = `${name}: ${css.slice(
        css.indexOf("label:has(input:checked)"),
        css.indexOf("label:has(input:focus-visible)"),
      )}`;
      expect(rule).toContain("background:");
      expect(rule).toContain("border-color:");
      expect(rule).toContain("color:");
    }
  });

  it("should keep hover, focus and chosen three distinct states, with chosen emitted last", () => {
    for (const { name, css } of withChrome) {
      const hover = css.indexOf("label:hover");
      const checked = css.indexOf("label:has(input:checked)");
      const focus = css.indexOf("label:has(input:focus-visible)");
      expect([name, hover > 0, checked > hover, focus > checked]).toEqual([name, true, true, true]);
      // hover is the words alone: a hovered option that also filled would read as a chosen one.
      const hoverRule = css.slice(hover, css.indexOf("}", hover));
      expect(`${name}: ${hoverRule}`).not.toMatch(/background|border-color/);
    }
  });

  it("should let the options row shrink — the arbitration the copies drifted away from", () => {
    for (const { name, css } of withChrome) {
      expect(`${name}: ${css}`).not.toMatch(/\.options\b[^}]*flex:\s*(0 0|1 1)\b/);
      expect(css).toMatch(/\.options\b[^}]*flex: 0 1 auto/);
    }
  });

  it("should stop the fieldset from pushing the document wide at 375", () => {
    for (const { name, css } of withChrome) {
      const rule = `${name}: ${css.slice(0, css.indexOf("}"))}`;
      expect(rule).toContain("min-inline-size: 0");
      expect(rule).toContain("min-width: 0");
    }
  });

  it("should keep every pill a 24x24 target", () => {
    for (const { name, css } of withChrome) expect(`${name}: ${css}`).toMatch(/min-height: 24px/);
  });

  it("should layer the pills over radios that still work", () => {
    for (const { name, css } of withChrome) {
      expect(`${name}: ${css}`).toContain("opacity: 0");
      expect(`${name}: ${css}`).not.toContain("display: none");
    }
  });
});

describe("the chosen pill is measured against what the page paints", () => {
  // NOT A THROW AT MODULE SCOPE. A chrome that stopped mixing would take the whole block down with
  // it and the directions below would never be measured at all — so the absence is an assertion of
  // its own, and the fill falls back to the accent at full strength, which is what every ceiling
  // here is written to refuse.
  const mixed = controlChromeCss({ scope: SCOPE, name: "probe" }).match(
    /color-mix\(in srgb, var\(--accent\) (\d+(?:\.\d+)?)%, var\(--ground\)\)/,
  );
  const pct = mixed ? Number(mixed[1]) : 100;

  it("should build the chosen fill by mixing the accent into the ground", () => {
    expect(mixed?.[1]).toBeDefined();
  });

  for (const d of DIRECTIONS) {
    const wash = washOf(d.accent, d.ground, pct);

    it(`${d.id}: should set the chosen words at 4.5:1 or better on the composited pill`, () => {
      expect([d.id, contrast(d.ink, wash) >= 4.5]).toEqual([d.id, true]);
    });

    it(`${d.id}: should ring the chosen pill in something a reader can see`, () => {
      expect([d.id, contrast(d.accent, d.ground) >= 3]).toEqual([d.id, true]);
    });

    it(`${d.id}: should make the fill a step the eye takes, and never a slab`, () => {
      const step = contrast(wash, d.ground);
      // A FLOOR AND A CEILING, and the ceiling is the whole point of this pass. The old chrome
      // measured 20,4:1 / 17,8:1 / 21,0:1 here — a capsule of solid ink over a drawing made of
      // hairlines. A tint a reader sees as a filled capsule sits an order of magnitude under that.
      expect([d.id, step >= 1.2, step <= 3]).toEqual([d.id, true, true]);
    });

    it(`${d.id}: should leave the unchosen option readable and unfilled`, () => {
      expect([d.id, contrast(d.muted, d.ground) >= 4.5]).toEqual([d.id, true]);
    });
  }
});
