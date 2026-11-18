import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadStackBeat } from "../craft/_shared/gesture-stack-beat.mjs";

// gx-waterfall-bridge web and scrolly (12B, mvg85/mvg87, 2026-11-18): the beat's format was toLocaleString("fr-FR"),
// which writes a negative with an ASCII hyphen; the bridge's net bracket and the web chips read "-143,2" beside step
// labels written "−91,8" — two minus signs on one chart.
const here = join(mkdtempSync(join(tmpdir(), "splash-minus-")), "stories", "s", "beats", "1");
mkdirSync(here, { recursive: true });
writeFileSync(
  join(here, "beat.mjs"),
  `export default {
  title: "L'Allemagne a produit 143,2 TWh de moins",
  limits: "x",
  source: "Source : test",
  opening: { name: "2015", value: 639.2 },
  steps: [{ name: "Renouvelables", value: 102.7 }, { name: "Nucléaire", value: -91.8 }, { name: "Fossile", value: -154.1 }],
  closing: { name: "2024", value: 496 },
  unit: "TWh",
  eyebrow: "Énergie",
  alt: "Cascade",
  gestures: [],
  format: (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
};
`,
);

describe("a bridge's format for a negative figure", () => {
  it("should write the minus sign, not a hyphen", async () => {
    const { beat } = await loadStackBeat(here, "waterfall-bridge");
    expect(beat.format(-143.2)).toBe("−143,2");
  });
});
