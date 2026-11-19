import { describe, expect, it } from "bun:test";
import { proseSpelling } from "../craft/_shared/place-labels.mjs";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// gx-locator scrolly (Gemma 12B, mvg93/mvg94, 2026-11-18): the seed's data.json has no `generation_twh`
// column and no "country" rows, but the worked example read that column unconditionally (col() throws)
// and card 2 asserted Ukraine is "the only country whose 2024 generation is not reported". The 12B kept
// the claim and dropped its evidence (mvg93), then wrote its own throw for the missing row (mvg94).
// The example must word only what the file it is given carries.
const EXAMPLE = join(import.meta.dirname, "../craft/scrolly/locator/beat.example.mjs");
const SEED = join(import.meta.dirname, "../eval/seeds/gx-locator.scrolly/beats/1/data.json");

async function load(data?: object) {
  const dir = mkdtempSync(join(tmpdir(), "locator-example-"));
  copyFileSync(EXAMPLE, join(dir, "beat.mjs"));
  if (data) writeFileSync(join(dir, "data.json"), JSON.stringify(data));
  else copyFileSync(SEED, join(dir, "data.json"));
  return (await import(join(dir, "beat.mjs"))).default;
}

const r = {
  subject: { name: "Zaporijjia", value: 6000, rank: 1, lon: 34.6, lat: 47.5 },
  second: { value: 5460 },
  last: { value: 5320 },
  top: [{ lon: 34.6, lat: 47.5 }, { lon: 1, lat: 50 }, { lon: 2, lat: 49 }, { lon: 3, lat: 48 }],
  country: { name: "Ukraine" },
  countryOf: (lon: number) => (lon > 30 ? "UKR" : "FRA"),
};

describe("the locator scrolly example on the seed's data", () => {
  it("should load a data.json that carries no generation column", async () => {
    await expect(load()).resolves.toBeDefined();
  });

  it("should not claim unreported generation the file cannot show", async () => {
    const beat = await load();
    expect([beat.cards.country(r), beat.notes.country(r), beat.alt(r)].join(" ")).not.toMatch(/rapport/);
  });

  it("should pass its own check on the seed's data", async () => {
    const beat = await load();
    expect(() => beat.check(r)).not.toThrow();
  });

  it("should name in card 4 the settlements it draws, in the page's language", async () => {
    const beat = await load();
    expect(() => proseSpelling(beat.cards.places(r), beat.places, "fr")).not.toThrow();
  });

  it("should still state unreported generation when the file shows it", async () => {
    const beat = await load({
      columns: ["name", "kind", "country", "capacity_mw", "pop", "generation_twh", "lon", "lat"].map((name) => ({ name })),
      rows: [
        ["Zaporizhzhia", "station", "Ukraine", 6000, null, null, 34.6, 47.5],
        ["Kyiv", "city", "Ukraine", null, 2900000, null, 30.5, 50.4],
        ["Ukraine", "country", "Ukraine", null, null, null, null, null],
        ["France", "country", "France", null, null, 539, null, null],
      ],
    });
    expect(beat.cards.country(r)).toMatch(/n’est pas rapportée/);
  });
});

// mvg95 (2026-11-19) and an earlier 12B run (2026-11-16): the example kept two shapes of the same station, rows with
// `mw` and sites with `value`, and the 12B swapped one for the other — the title read `.mw` off a site and printed
// "NaN MW", then six edits never landed. One shape for every printed number leaves nothing to swap.
describe("locator scrolly example — one shape for a station's number", () => {
  it("should read capacity as `mw` only where a site is built", async () => {
    const source = await Bun.file(EXAMPLE).text();
    expect(source.match(/\.mw\b/g)?.length).toBe(1);
  });
});
