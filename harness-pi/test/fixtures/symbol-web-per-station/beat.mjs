// gx-proportional-symbol web (Qwen3.5-9B, 2026-11-13): one symbol per station, named by its country, with the
// per-country codes laid against them by position — the fourth country's stations had no code.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import example from "./beat.example.mjs";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const codes = ["AUT", "BEL", "ESP"];
export default {
  ...example,
  title: "Un centième des sites porte plus d’un tiers de la puissance bas-carbone d’Europe",
  symbols: table.rows.map(([country, , mw, lon, lat], i) => ({ iso: codes[i], name: country, value: mw, lon, lat })),
};
