// skills/map-beat/test/measure-live-map.live.test.ts
import { describe, expect, it } from "bun:test";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";
import { measureLiveMap } from "../scripts/measure-live-map.mjs";

/** Against the real map: needs the worktree's .env (set -a && . ./.env). A key-less run fails loudly, never skips. */
const key = mapTilerKeyIn(process.env);

describe("measureLiveMap on the real MapTiler dataviz style", () => {
  it("should project a seat where MapLibre draws it, load every tile, and read the sea at mid-Atlantic", async () => {
    if (!key) throw new Error("no MapTiler key in the environment: run with the worktree's .env loaded");
    const plan = { styleUrl: "https://api.maptiler.com/maps/dataviz/style.json?key=__MAPTILER" + "_KEY__", projection: "mercator", layers: [] };
    const state = cameraFields({ center: [10, 50], zoom: 3 });
    const out = await measureLiveMap({ plan, states: { whole: state, balkans: cameraFields({ center: [20, 44], zoom: 5 }) }, seats: { centre: [10, 50], atlantic: [-30, 45], algeria: [2, 35], azores: [-20, 40], belgrade: [20, 44] }, size: { width: 960, height: 540 }, mapTilerKey: key, tints: null });
    expect(out.whole.tilesLoaded).toBe(true);
    const [cx, cy] = out.whole.projected.centre;
    expect(Math.abs(cx - 480)).toBeLessThan(1);
    expect(Math.abs(cy - 270)).toBeLessThan(1);
    const { cell, cols, colours } = out.whole.grid;
    const [ax, ay] = out.whole.projected.atlantic;
    const sea = colours[Math.floor(ay / cell) * cols + Math.floor(ax / cell)];
    const land = colours[Math.floor(cy / cell) * cols + Math.floor(cx / cell)];
    expect(sea).toMatch(/^#[0-9a-f]{6}$/);
    expect(sea).not.toBe(land);
    // Near the frame's foot, a land seat whose upside-down reading is the Norwegian Sea: a grid read with
    // its rows the wrong way up paints both of these the one flat sea colour.
    const at = ([x, y]: [number, number]) => colours[Math.floor(y / cell) * cols + Math.floor(x / cell)];
    expect(at(out.whole.projected.algeria)).not.toBe(at(out.whole.projected.azores));
    // A second fixed camera on the same map: the camera moves to it, and its own centre seat lands mid-frame.
    expect(out.balkans.tilesLoaded).toBe(true);
    const [bx, by] = out.balkans.projected.belgrade;
    expect(Math.abs(bx - 480)).toBeLessThan(1);
    expect(Math.abs(by - 270)).toBeLessThan(1);
  }, 120_000);
});
