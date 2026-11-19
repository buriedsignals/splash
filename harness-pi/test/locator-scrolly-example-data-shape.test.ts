import { describe, expect, it } from "bun:test";
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

  it("should name in card 4 the settlements it draws", async () => {
    const beat = await load();
    const named = beat.places.slice(0, 4).map((p: { name: string }) => p.name);
    expect(named.every((n: string) => beat.cards.places(r).includes(n))).toBe(true);
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
